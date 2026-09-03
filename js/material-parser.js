/* =========================================================
   REPORT CHECKER
   material-parser.js

   VERSION:
   MATERIAL + PHRASE / KEYWORD MATCHING

   FORMAT HTML #materialList:

   Pigtail | pigtail | pigtal | pigtail 2 pcs
   Protect | protect | protek
   Gembok | gembok | gembog | gembuk
   Splitter 1:2 | splitter 1:2 | spliter 1:2

   KETERANGAN:
   - Bagian pertama = NAMA MATERIAL RESMI
   - Setelah "|" = FRASA / KATA KUNCI
   - Semua frasa dianggap alias material tersebut
   - Hasil selalu menggunakan nama resmi
   - Exact phrase match diprioritaskan
   - Fuzzy typo digunakan sebagai cadangan
   - Membaca bagian "Material" pada CIR
   - Mengambil Qty
   - Mengambil Satuan
   - Mengambil Kode
   - Mendukung material multi-line
   - Tidak mudah salah mengambil teks biasa
   - Kompatibel:
       parser.parse(cirText)
========================================================= */

(function () {

    "use strict";


    /* =====================================================
       CONFIGURATION
    ====================================================== */

    const CONFIG = {

        /*
         * Threshold typo.
         *
         * Semakin tinggi = semakin ketat.
         *
         * 0.80 cocok untuk typo ringan.
         */

        FUZZY_THRESHOLD: 0.80,

        /*
         * Minimal panjang frasa untuk fuzzy.
         */

        MIN_FUZZY_LENGTH: 4,

        /*
         * Maksimal baris tambahan untuk material multi-line.
         */

        MAX_COMBINE_LINES: 2,

        /*
         * Jika score fuzzy terlalu dekat dengan material
         * lain, jangan memaksakan hasil.
         */

        MIN_SCORE_GAP: 0.06,

        /*
         * Header bagian Material.
         */

        HEADER_WORDS: [
            "material",
            "materials",
            "material :",
            "material:",
            "material -",
            "material-"
        ]

    };


    /* =====================================================
       NORMALIZE TEXT
    ====================================================== */

    function normalizeText(value) {

        if (
            value === null ||
            value === undefined
        ) {
            return "";
        }

        return String(value)
            .replace(/\r/g, "")
            .replace(/\u00A0/g, " ")
            .replace(/\t/g, " ")
            .replace(/\s+/g, " ")
            .trim();

    }


    /* =====================================================
       NORMALIZE MATERIAL NAME
    ====================================================== */

    function normalizeMaterialName(value) {

        return normalizeText(value)
            .toLowerCase()
            .replace(/[“”"]/g, "")
            .replace(/[‘’']/g, "")
            .replace(/\s+/g, " ")
            .trim();

    }


    /* =====================================================
       NORMALIZE FUZZY
    ====================================================== */

    function normalizeForFuzzy(value) {

        return normalizeMaterialName(value)
            .replace(/[^a-z0-9]+/g, "");

    }


    /* =====================================================
       ESCAPE REGEX
    ====================================================== */

    function escapeRegex(value) {

        return String(value)
            .replace(
                /[.*+?^${}()|[\]\\]/g,
                "\\$&"
            );

    }


    /* =====================================================
       GET SETTINGS
    ====================================================== */

    function getSettings() {

        try {

            if (
                typeof getParserSettings ===
                "function"
            ) {

                const settings =
                    getParserSettings();

                if (settings) {
                    return settings;
                }

            }

        } catch (error) {

            console.warn(
                "getParserSettings() gagal:",
                error
            );

        }


        try {

            if (
                typeof window !== "undefined" &&
                window.PARSER_SETTINGS
            ) {

                return window.PARSER_SETTINGS;

            }

        } catch (error) {

            console.warn(
                "PARSER_SETTINGS gagal:",
                error
            );

        }


        try {

            if (
                typeof window !== "undefined" &&
                window.parserSettings
            ) {

                return window.parserSettings;

            }

        } catch (error) {

            console.warn(
                "parserSettings gagal:",
                error
            );

        }


        return {};

    }


    /* =====================================================
       GET RAW MATERIAL DATA
    ====================================================== */

    function getRawMaterialList() {

        const settings =
            getSettings();

        let materialList = [];


        /*
         * Prioritas settings.
         */

        if (
            Array.isArray(
                settings.materialNames
            )
        ) {

            materialList =
                settings.materialNames;

        }

        else if (
            Array.isArray(
                settings.materials
            )
        ) {

            materialList =
                settings.materials;

        }

        else if (
            Array.isArray(
                settings.materialList
            )
        ) {

            materialList =
                settings.materialList;

        }

        else if (
            Array.isArray(
                settings.materialNamesList
            )
        ) {

            materialList =
                settings.materialNamesList;

        }


        /*
         * Jika berupa string.
         */

        if (
            materialList.length === 0 &&
            typeof settings.materialNames ===
            "string"
        ) {

            materialList =
                settings.materialNames
                    .split(/\r?\n/);

        }


        if (
            materialList.length === 0 &&
            typeof settings.materials ===
            "string"
        ) {

            materialList =
                settings.materials
                    .split(/\r?\n/);

        }


        if (
            materialList.length === 0 &&
            typeof settings.materialList ===
            "string"
        ) {

            materialList =
                settings.materialList
                    .split(/\r?\n/);

        }


        /*
         * PENTING:
         *
         * HTML:
         *
         * <textarea id="materialList">
         */

        if (
            materialList.length === 0 &&
            typeof document !==
            "undefined"
        ) {

            const textarea =
                document.getElementById(
                    "materialList"
                );

            if (textarea) {

                materialList =
                    textarea.value
                        .split(/\r?\n/);

            }

        }


        /*
         * Support ID lama.
         */

        if (
            materialList.length === 0 &&
            typeof document !==
            "undefined"
        ) {

            const textarea =
                document.getElementById(
                    "materialNames"
                );

            if (textarea) {

                materialList =
                    textarea.value
                        .split(/\r?\n/);

            }

        }


        return materialList;

    }


    /* =====================================================
       PARSE MATERIAL SETTINGS
    ====================================================== */

    function getMaterialDefinitions() {

        const rawList =
            getRawMaterialList();


        const definitions = [];

        const seenOfficial =
            new Set();


        for (
            const rawItem
            of rawList
        ) {

            if (
                rawItem === null ||
                rawItem === undefined
            ) {

                continue;

            }


            const raw =
                normalizeText(
                    rawItem
                );


            if (!raw) {
                continue;
            }


            /*
             * Format:
             *
             * Pigtail | pigtal | pigtail
             */

            const parts =
                raw
                    .split("|")
                    .map(function (item) {

                        return normalizeText(
                            item
                        );

                    })
                    .filter(Boolean);


            if (!parts.length) {
                continue;
            }


            /*
             * Bagian pertama selalu
             * nama resmi.
             */

            const officialName =
                parts[0];


            const officialKey =
                normalizeMaterialName(
                    officialName
                );


            if (
                !officialKey ||
                seenOfficial.has(
                    officialKey
                )
            ) {

                continue;

            }


            seenOfficial.add(
                officialKey
            );


            /*
             * Alias:
             *
             * Nama resmi juga otomatis
             * menjadi alias.
             */

            const aliases = [];

            const seenAliases =
                new Set();


            const addAlias =
                function (value) {

                    const cleaned =
                        normalizeText(
                            value
                        );

                    if (!cleaned) {
                        return;
                    }


                    const key =
                        normalizeMaterialName(
                            cleaned
                        );


                    if (
                        !key ||
                        seenAliases.has(key)
                    ) {

                        return;

                    }


                    seenAliases.add(key);

                    aliases.push(
                        cleaned
                    );

                };


            /*
             * Nama resmi.
             */

            addAlias(
                officialName
            );


            /*
             * Semua frasa setelah "|".
             */

            for (
                let i = 1;
                i < parts.length;
                i++
            ) {

                addAlias(
                    parts[i]
                );

            }


            definitions.push({

                name:
                    officialName,

                aliases:
                    aliases

            });

        }


        /*
         * Material yang alias-nya panjang
         * dicoba lebih dahulu.
         */

        definitions.sort(
            function (a, b) {

                const aLength =
                    Math.max.apply(
                        null,
                        a.aliases.map(
                            function (x) {
                                return x.length;
                            }
                        )
                    );

                const bLength =
                    Math.max.apply(
                        null,
                        b.aliases.map(
                            function (x) {
                                return x.length;
                            }
                        )
                    );

                return (
                    bLength -
                    aLength
                );

            }
        );


        return definitions;

    }


    /* =====================================================
       COMPATIBLE MATERIAL LIST
    ====================================================== */

    function getMaterialListFromSettings() {

        return getMaterialDefinitions()
            .map(function (item) {

                return item.name;

            });

    }


    /* =====================================================
       HEADER DETECTION
    ====================================================== */

    function isMaterialHeader(
        line
    ) {

        const value =
            normalizeMaterialName(
                line
            );


        if (!value) {
            return false;
        }


        return CONFIG.HEADER_WORDS
            .some(function (header) {

                return (
                    value ===
                    normalizeMaterialName(
                        header
                    )
                );

            });

    }


    /* =====================================================
       FIND MATERIAL SECTION
    ====================================================== */

    function extractMaterialSection(
        cirText
    ) {

        const text =
            String(
                cirText ?? ""
            );


        const lines =
            text
                .replace(/\r/g, "")
                .split("\n");


        let materialIndex =
            -1;


        for (
            let i = 0;
            i < lines.length;
            i++
        ) {

            const line =
                normalizeText(
                    lines[i]
                );


            if (
                /^material\s*[:=-]?\s*$/i
                    .test(line)
            ) {

                materialIndex =
                    i;

                break;

            }

        }


        /*
         * Tidak ada header Material:
         * fallback seluruh CIR.
         */

        if (
            materialIndex === -1
        ) {

            return {

                found: false,

                lines:
                    lines

            };

        }


        /*
         * Cari header bagian berikutnya.
         *
         * Contoh:
         *
         * Material
         * Pigtail
         * Protect
         *
         * Keterangan
         * ...
         *
         * Parser berhenti saat menemukan
         * header yang jelas.
         */

        const result = [];


        for (
            let i =
                materialIndex + 1;

            i < lines.length;

            i++
        ) {

            const line =
                normalizeText(
                    lines[i]
                );


            /*
             * Kosong tetap dilewati nanti.
             */

            if (!line) {

                result.push("");

                continue;

            }


            /*
             * Header umum.
             */

            if (
                /^(?:keterangan|remark|remarks|catatan|status|foto|photo|evidence|note|notes)\s*[:=-]?\s*$/i
                    .test(line)
            ) {

                break;

            }


            result.push(
                line
            );

        }


        return {

            found: true,

            lines:
                result

        };

    }


    /* =====================================================
       CLEAN MATERIAL LINES
    ====================================================== */

    function cleanMaterialLines(
        lines
    ) {

        if (
            !Array.isArray(lines)
        ) {

            return [];

        }


        return lines
            .map(function (line) {

                return normalizeText(
                    line
                );

            })
            .filter(function (line) {

                if (!line) {
                    return false;
                }


                if (
                    isMaterialHeader(
                        line
                    )
                ) {

                    return false;

                }


                return true;

            });

    }


    /* =====================================================
       NUMBER PARSER
    ====================================================== */

    function parseNumber(
        value
    ) {

        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {

            return "";

        }


        let text =
            String(value)
                .trim()
                .replace(/\s/g, "");


        if (
            text.includes(".") &&
            text.includes(",")
        ) {

            text =
                text
                    .replace(/\./g, "")
                    .replace(",", ".");

        }

        else if (
            text.includes(",") &&
            !text.includes(".")
        ) {

            text =
                text.replace(",", ".");

        }


        const number =
            Number(text);


        if (
            Number.isNaN(number)
        ) {

            return value;

        }


        return number;

    }


    /* =====================================================
       MATERIAL ALIAS REGEX
    ====================================================== */

    function createMaterialRegex(
        materialName
    ) {

        const parts =
            String(materialName)
                .trim()
                .split(/\s+/)
                .filter(Boolean);


        if (
            !parts.length
        ) {

            return null;

        }


        const pattern =
            parts
                .map(function (part) {

                    return escapeRegex(
                        part
                    );

                })
                .join("\\s*");


        return new RegExp(

            "(^|[^A-Za-z0-9])" +
            pattern +
            "(?=$|[^A-Za-z0-9])",

            "i"

        );

    }


    /* =====================================================
       CLEAN INPUT
    ====================================================== */

    function cleanLineForMatching(
        line
    ) {

        let value =
            normalizeText(
                line
            );


        /*
         * Hilangkan Qty.
         */

        value =
            value.replace(
                /\b(?:qty|quantity|jumlah)\s*[:=]?\s*-?\d+(?:[.,]\d+)?/gi,
                " "
            );


        /*
         * Hilangkan angka + satuan.
         */

        value =
            value.replace(
                /\b\d+(?:[.,]\d+)?\s*(?:pcs?|pieces?|unit|batang|meter|metre|buah|set)\b/gi,
                " "
            );


        return normalizeText(
            value
        );

    }


    /* =====================================================
       FIND EXACT PHRASE
    ====================================================== */

    function findExactMaterial(
        line,
        definitions
    ) {

        const original =
            normalizeText(
                line
            );


        const cleaned =
            cleanLineForMatching(
                original
            );


        let best =
            null;


        for (
            const definition
            of definitions
        ) {

            for (
                const alias
                of definition.aliases
            ) {

                const regex =
                    createMaterialRegex(
                        alias
                    );


                if (!regex) {
                    continue;
                }


                if (
                    regex.test(
                        cleaned
                    )
                ) {

                    const score =
                        normalizeForFuzzy(
                            alias
                        ).length;


                    /*
                     * Alias terpanjang menang.
                     */

                    if (
                        !best ||
                        score >
                        best.aliasLength
                    ) {

                        best = {

                            material:
                                definition.name,

                            matchedAlias:
                                alias,

                            score:
                                1,

                            method:
                                "EXACT",

                            aliasLength:
                                score

                        };

                    }

                }

            }

        }


        return best;

    }


    /* =====================================================
       LEVENSHTEIN
    ====================================================== */

    function levenshtein(
        a,
        b
    ) {

        const s =
            normalizeForFuzzy(
                a
            );


        const t =
            normalizeForFuzzy(
                b
            );


        if (
            s === t
        ) {

            return 0;

        }


        if (!s.length) {
            return t.length;
        }


        if (!t.length) {
            return s.length;
        }


        let previous =
            new Array(
                t.length + 1
            );


        let current =
            new Array(
                t.length + 1
            );


        for (
            let j = 0;
            j <= t.length;
            j++
        ) {

            previous[j] =
                j;

        }


        for (
            let i = 1;
            i <= s.length;
            i++
        ) {

            current[0] =
                i;


            for (
                let j = 1;
                j <= t.length;
                j++
            ) {

                const cost =
                    s[i - 1] ===
                    t[j - 1]
                        ? 0
                        : 1;


                current[j] =
                    Math.min(

                        current[j - 1] + 1,

                        previous[j] + 1,

                        previous[j - 1] +
                        cost

                    );

            }


            const temp =
                previous;

            previous =
                current;

            current =
                temp;

        }


        return previous[
            t.length
        ];

    }


    /* =====================================================
       SIMILARITY
    ====================================================== */

    function similarity(
        a,
        b
    ) {

        const x =
            normalizeForFuzzy(
                a
            );


        const y =
            normalizeForFuzzy(
                b
            );


        if (
            !x ||
            !y
        ) {

            return 0;

        }


        if (
            x === y
        ) {

            return 1;

        }


        if (
            x.includes(y) ||
            y.includes(x)
        ) {

            const ratio =
                Math.min(
                    x.length,
                    y.length
                ) /
                Math.max(
                    x.length,
                    y.length
                );


            return Math.max(
                0.88,
                ratio
            );

        }


        const distance =
            levenshtein(
                x,
                y
            );


        return (
            1 -
            (
                distance /
                Math.max(
                    x.length,
                    y.length
                )
            )
        );

    }


    /* =====================================================
       TOKEN SIMILARITY
    ====================================================== */

    function tokenSimilarity(
        input,
        material
    ) {

        const inputTokens =
            normalizeMaterialName(
                input
            )
                .split(/\s+/)
                .filter(Boolean);


        const materialTokens =
            normalizeMaterialName(
                material
            )
                .split(/\s+/)
                .filter(Boolean);


        if (
            !inputTokens.length ||
            !materialTokens.length
        ) {

            return 0;

        }


        let total = 0;


        for (
            const materialToken
            of materialTokens
        ) {

            let best =
                0;


            for (
                const inputToken
                of inputTokens
            ) {

                best =
                    Math.max(
                        best,
                        similarity(
                            inputToken,
                            materialToken
                        )
                    );

            }


            total +=
                best;

        }


        return (
            total /
            materialTokens.length
        );

    }


    /* =====================================================
       FIND FUZZY MATERIAL
    ====================================================== */

    function findFuzzyMaterial(
        line,
        definitions
    ) {

        const original =
            normalizeText(
                line
            );


        const cleaned =
            cleanLineForMatching(
                original
            );


        if (
            cleaned.length <
            CONFIG.MIN_FUZZY_LENGTH
        ) {

            return null;

        }


        let best =
            null;


        let secondBest =
            null;


        for (
            const definition
            of definitions
        ) {

            for (
                const alias
                of definition.aliases
            ) {

                const aliasNormalized =
                    normalizeForFuzzy(
                        alias
                    );


                if (
                    aliasNormalized.length <
                    CONFIG.MIN_FUZZY_LENGTH
                ) {

                    continue;

                }


                const fullScore =
                    similarity(
                        cleaned,
                        alias
                    );


                const tokenScore =
                    tokenSimilarity(
                        cleaned,
                        alias
                    );


                let score =
                    Math.max(
                        fullScore,
                        tokenScore
                    );


                /*
                 * Untuk alias pendek
                 * harus lebih ketat.
                 */

                if (
                    aliasNormalized.length <= 5 &&
                    score < 0.88
                ) {

                    continue;

                }


                if (
                    score <
                    CONFIG.FUZZY_THRESHOLD
                ) {

                    continue;

                }


                const candidate = {

                    material:
                        definition.name,

                    matchedAlias:
                        alias,

                    score:
                        score,

                    method:
                        "FUZZY",

                    aliasLength:
                        aliasNormalized.length

                };


                if (
                    !best ||
                    score >
                    best.score
                ) {

                    secondBest =
                        best;

                    best =
                        candidate;

                }

                else if (
                    !secondBest ||
                    score >
                    secondBest.score
                ) {

                    secondBest =
                        candidate;

                }

            }

        }


        /*
         * Jangan memilih fuzzy jika
         * dua kandidat terlalu dekat.
         */

        if (
            best &&
            secondBest &&
            best.material !==
            secondBest.material
        ) {

            const gap =
                best.score -
                secondBest.score;


            if (
                gap <
                CONFIG.MIN_SCORE_GAP
            ) {

                return null;

            }

        }


        return best;

    }


    /* =====================================================
       FIND MATERIAL
    ====================================================== */

    function findMaterial(
        line,
        definitions
    ) {

        /*
         * EXACT / ALIAS dahulu.
         */

        const exact =
            findExactMaterial(
                line,
                definitions
            );


        if (
            exact
        ) {

            return exact;

        }


        /*
         * Fuzzy hanya cadangan.
         */

        return findFuzzyMaterial(
            line,
            definitions
        );

    }


    /* =====================================================
       DETECT MATERIAL
    ====================================================== */

    function detectMaterialInLine(
        line,
        materialListOrDefinitions
    ) {

        const original =
            normalizeText(
                line
            );


        if (!original) {
            return null;
        }


        /*
         * API lama bisa mengirim array nama.
         *
         * Internal parser menggunakan definitions.
         */

        let definitions =
            materialListOrDefinitions;


        if (
            !Array.isArray(
                definitions
            )
        ) {

            definitions =
                getMaterialDefinitions();

        }


        /*
         * Kalau array hanya berisi string,
         * ubah menjadi definitions.
         */

        if (
            definitions.length &&
            typeof definitions[0] ===
            "string"
        ) {

            definitions =
                definitions.map(
                    function (name) {

                        return {

                            name:
                                name,

                            aliases:
                                [name]

                        };

                    }
                );

        }


        const match =
            findMaterial(
                original,
                definitions
            );


        if (!match) {
            return null;
        }


        return {

            material:
                match.material,

            score:
                match.score,

            matchedAlias:
                match.matchedAlias,

            method:
                match.method,

            raw:
                original

        };

    }


    /* =====================================================
       FIND QTY
    ====================================================== */

    function findQty(
        text,
        materialName
    ) {

        const value =
            normalizeText(
                text
            );


        if (!value) {
            return "";
        }


        /*
         * Qty 2
         * Qty: 2
         * Jumlah 2
         */

        let match =
            value.match(
                /\b(?:qty|quantity|jumlah)\s*[:=]?\s*(-?\d+(?:[.,]\d+)?)/i
            );


        if (match) {

            return parseNumber(
                match[1]
            );

        }


        /*
         * Cari angka yang diikuti satuan.
         *
         * Contoh:
         *
         * Pigtail 2 pcs
         */

        match =
            value.match(
                /\b(-?\d+(?:[.,]\d+)?)\s*(?:pcs?|pieces?|unit|batang|meter|metre|buah|set)\b/i
            );


        if (match) {

            return parseNumber(
                match[1]
            );

        }


        /*
         * Hapus material dari teks.
         */

        let remainder =
            value;


        if (materialName) {

            const regex =
                createMaterialRegex(
                    materialName
                );


            if (regex) {

                remainder =
                    remainder.replace(
                        regex,
                        " "
                    );

            }

        }


        /*
         * Jangan ambil angka dari kode.
         *
         * Cari angka berdiri sendiri.
         */

        const numberMatches =
            remainder.match(
                /(?:^|\s)(-?\d+(?:[.,]\d+)?)(?=\s|$)/g
            );


        if (
            numberMatches &&
            numberMatches.length
        ) {

            return parseNumber(
                numberMatches[0].trim()
            );

        }


        return "";

    }


    /* =====================================================
       FIND UNIT
    ====================================================== */

    function findUnit(
        text,
        materialName
    ) {

        const value =
            normalizeText(
                text
            );


        const units = [

            {
                regex:
                    /\bpcs?\b/i,
                value:
                    "pcs"
            },

            {
                regex:
                    /\bpieces?\b/i,
                value:
                    "pcs"
            },

            {
                regex:
                    /\bunit\b/i,
                value:
                    "Unit"
            },

            {
                regex:
                    /\bbatang\b/i,
                value:
                    "Batang"
            },

            {
                regex:
                    /\bmeters?\b/i,
                value:
                    "Meter"
            },

            {
                regex:
                    /\bmetres?\b/i,
                value:
                    "Meter"
            },

            {
                regex:
                    /\bbuah\b/i,
                value:
                    "Buah"
            },

            {
                regex:
                    /\bset\b/i,
                value:
                    "Set"
            },

            {
                regex:
                    /(?:^|\s)m(?:\s|$)/i,
                value:
                    "m"
            }

        ];


        for (
            const item
            of units
        ) {

            if (
                item.regex.test(
                    value
                )
            ) {

                return item.value;

            }

        }


        /*
         * Ambil satuan dari nama resmi.
         */

        const lower =
            normalizeMaterialName(
                materialName
            );


        if (
            /\(meter\)/i.test(
                lower
            )
        ) {

            return "Meter";

        }


        if (
            /\(unit\)/i.test(
                lower
            )
        ) {

            return "Unit";

        }


        if (
            /\(batang\)/i.test(
                lower
            )
        ) {

            return "Batang";

        }


        return "";

    }


    /* =====================================================
       FIND CODE
    ====================================================== */

    function findCode(
        text
    ) {

        const value =
            normalizeText(
                text
            );


        /*
         * Kode: ABC123
         * Code: ABC123
         */

        let match =
            value.match(
                /(?:kode|code)\s*[:=]\s*([A-Za-z0-9._/-]+)/i
            );


        if (match) {

            return match[1];

        }


        /*
         * Contoh:
         *
         * Gembok (DPS-09-D0002-M01S2)
         */

        const parentheses =
            value.match(
                /\(([^()]+)\)/
            );


        if (
            parentheses &&
            parentheses[1]
        ) {

            const inside =
                parentheses[1].trim();


            if (
                /[A-Za-z]/.test(
                    inside
                ) &&
                /\d/.test(
                    inside
                )
            ) {

                return inside;

            }

        }


        return "";

    }


    /* =====================================================
       LOOKS LIKE MATERIAL
    ====================================================== */

    function looksLikeMaterialLine(
        line
    ) {

        const value =
            normalizeText(
                line
            );


        if (!value) {
            return false;
        }


        if (
            isMaterialHeader(
                value
            )
        ) {

            return false;

        }


        /*
         * Ada Qty / satuan.
         */

        if (
            /\b(?:qty|quantity|jumlah)\b/i
                .test(value)
        ) {

            return true;

        }


        if (
            /\b(?:pcs?|pieces?|unit|batang|meter|metre|buah|set)\b/i
                .test(value)
        ) {

            return true;

        }


        /*
         * Ada kode dalam kurung.
         */

        if (
            /\([A-Za-z0-9._/-]*\d[A-Za-z0-9._/-]*\)/
                .test(value)
        ) {

            return true;

        }


        /*
         * Baris pendek yang terdiri dari
         * kata + angka bisa menjadi material.
         */

        if (
            value.length <= 80 &&
            /\d/.test(value)
        ) {

            return true;

        }


        return false;

    }


    /* =====================================================
       PARSE MATERIAL LINE
    ====================================================== */

    function parseMaterialLine(
        line,
        definitions,
        ticket
    ) {

        const text =
            normalizeText(
                line
            );


        if (!text) {
            return null;
        }


        const detected =
            detectMaterialInLine(
                text,
                definitions
            );


        /*
         * Tidak ditemukan.
         */

        if (!detected) {

            if (
                looksLikeMaterialLine(
                    text
                )
            ) {

                return {

                    success:
                        false,

                    ticket:
                        ticket || "",

                    material:
                        text,

                    originalMaterial:
                        text,

                    qty:
                        findQty(
                            text,
                            ""
                        ),

                    satuan:
                        findUnit(
                            text,
                            ""
                        ),

                    kode:
                        findCode(
                            text
                        ),

                    score:
                        0,

                    matchedAlias:
                        "",

                    method:
                        "",

                    raw:
                        text,

                    error:
                        "Material tidak ditemukan dalam daftar / frasa pengaturan."

                };

            }


            return null;

        }


        return {

            success:
                true,

            ticket:
                ticket || "",

            /*
             * SELALU nama resmi.
             */

            material:
                detected.material,

            originalMaterial:
                detected.material,

            qty:
                findQty(
                    text,
                    detected.material
                ) || 1,

            satuan:
                findUnit(
                    text,
                    detected.material
                ),

            kode:
                findCode(
                    text
                ),

            score:
                detected.score,

            matchedAlias:
                detected.matchedAlias,

            method:
                detected.method,

            raw:
                text

        };

    }


    /* =====================================================
       COMBINE MULTI-LINE
    ====================================================== */

    function tryCombineLines(
        lines,
        startIndex,
        definitions,
        ticket
    ) {

        let combined =
            normalizeText(
                lines[startIndex]
            );


        for (
            let step = 1;
            step <=
            CONFIG.MAX_COMBINE_LINES;
            step++
        ) {

            const index =
                startIndex +
                step;


            if (
                index >=
                lines.length
            ) {

                break;

            }


            combined =
                normalizeText(
                    combined +
                    " " +
                    lines[index]
                );


            const result =
                parseMaterialLine(
                    combined,
                    definitions,
                    ticket
                );


            if (
                result &&
                result.success
            ) {

                return {

                    result:
                        result,

                    consumed:
                        step

                };

            }

        }


        return null;

    }


    /* =====================================================
       PARSE MATERIAL BLOCK
    ====================================================== */

    function parseMaterialBlock(
        materialText,
        ticket
    ) {

        const definitions =
            getMaterialDefinitions();


        /*
         * Tidak ada material di settings.
         */

        if (
            !definitions.length
        ) {

            return {

                materials: [],

                errors: [{

                    ticket:
                        ticket || "",

                    material:
                        "",

                    originalMaterial:
                        "",

                    qty:
                        "",

                    satuan:
                        "",

                    kode:
                        "",

                    score:
                        0,

                    matchedAlias:
                        "",

                    error:
                        "Daftar Nama Material belum diatur di HTML."

                }]

            };

        }


        if (
            materialText === null ||
            materialText === undefined
        ) {

            return {

                materials: [],

                errors: []

            };

        }


        /*
         * Cari bagian Material.
         */

        const section =
            extractMaterialSection(
                materialText
            );


        const rawLines =
            section.lines || [];


        const lines =
            cleanMaterialLines(
                rawLines
            );


        const materials = [];
        const errors = [];


        let i = 0;


        while (
            i < lines.length
        ) {

            const current =
                normalizeText(
                    lines[i]
                );


            if (!current) {

                i++;

                continue;

            }


            /*
             * Coba langsung.
             */

            let parsed =
                parseMaterialLine(
                    current,
                    definitions,
                    ticket
                );


            /*
             * Jika gagal,
             * coba multi-line.
             */

            if (
                !parsed ||
                !parsed.success
            ) {

                const combined =
                    tryCombineLines(
                        lines,
                        i,
                        definitions,
                        ticket
                    );


                if (
                    combined
                ) {

                    parsed =
                        combined.result;

                    i +=
                        combined.consumed;

                }

            }


            /*
             * Simpan hasil.
             */

            if (
                parsed
            ) {

                if (
                    parsed.success
                ) {

                    materials.push(
                        parsed
                    );

                }

                else {

                    errors.push(
                        parsed
                    );

                }

            }


            i++;

        }


        /* =================================================
           DEDUPLICATE
        ================================================= */

        const uniqueMaterials = [];

        const seen =
            new Set();


        for (
            const item
            of materials
        ) {

            const key =
                [
                    normalizeMaterialName(
                        item.material
                    ),

                    String(
                        item.qty ?? ""
                    ),

                    normalizeText(
                        item.satuan
                    ),

                    normalizeText(
                        item.kode
                    ),

                    normalizeText(
                        item.ticket
                    )

                ].join("|");


            if (
                seen.has(key)
            ) {

                continue;

            }


            seen.add(key);

            uniqueMaterials.push(
                item
            );

        }


        return {

            materials:
                uniqueMaterials,

            errors:
                errors,

            sectionFound:
                section.found,

            materialCount:
                uniqueMaterials.length,

            errorCount:
                errors.length

        };

    }


    /* =====================================================
       PARSE FROM CIR
    ====================================================== */

    function parseMaterialsFromCIR(
        cirText,
        ticket
    ) {

        return parseMaterialBlock(
            cirText,
            ticket
        );

    }


    /* =====================================================
       PARSE FROM LINES
    ====================================================== */

    function parseMaterialsFromLines(
        lines,
        ticket
    ) {

        if (
            !Array.isArray(lines)
        ) {

            return {

                materials: [],

                errors: []

            };

        }


        return parseMaterialBlock(
            lines.join("\n"),
            ticket
        );

    }


    /* =====================================================
       ALIAS PARSE
    ====================================================== */

    function parseMaterial(
        materialText,
        ticket
    ) {

        return parseMaterialBlock(
            materialText,
            ticket
        );

    }


    /* =====================================================
       GET DEBUG INFO
    ====================================================== */

    function getDebugInfo() {

        const definitions =
            getMaterialDefinitions();


        return {

            materialCount:
                definitions.length,

            materials:
                definitions.map(
                    function (item) {

                        return {

                            name:
                                item.name,

                            aliases:
                                item.aliases

                        };

                    }
                ),

            threshold:
                CONFIG.FUZZY_THRESHOLD,

            phraseMode:
                true

        };

    }


    /* =====================================================
       PUBLIC API
    ====================================================== */

    window.ReportCheckerMaterial = {

        parse:
            parseMaterialBlock,

        parseMaterial:
            parseMaterial,

        parseMaterials:
            parseMaterialBlock,

        parseFromCIR:
            parseMaterialsFromCIR,

        parseFromLines:
            parseMaterialsFromLines,

        detect:
            detectMaterialInLine,

        find:
            function (
                line
            ) {

                return findMaterial(
                    line,
                    getMaterialDefinitions()
                );

            },

        getMaterialList:
            getMaterialListFromSettings,

        getDefinitions:
            getMaterialDefinitions,

        getDebugInfo:
            getDebugInfo,

        normalize:
            normalizeMaterialName

    };


    /* =====================================================
       COMPATIBILITY ALIAS
    ====================================================== */

    window.MaterialParser =
        window.ReportCheckerMaterial;


    window.parseMaterial =
        parseMaterial;


    window.parseMaterials =
        parseMaterialBlock;


    window.getMaterialList =
        getMaterialListFromSettings;


    /* =====================================================
       STARTUP
    ====================================================== */

    console.log(
        "Report Checker Material Parser aktif."
    );


    console.log(
        "Material definitions:",
        getMaterialDefinitions()
    );


})();
