/* =========================================================
   REPORT CHECKER
   material-parser.js

   VERSION:
   UPDATE FUZZY MATERIAL PARSER

   FUNGSI:
   - Membaca daftar material dari #materialList
   - Membaca material dari bagian "Material" pada CIR
   - Exact match
   - Fuzzy match untuk typo / nama yang mirip
   - Material hasil selalu menggunakan nama resmi dari list
   - Mengambil Qty
   - Mengambil Satuan
   - Mengambil Kode
   - Mendukung material multi-line
   - Tidak memasukkan teks biasa sebagai material
   - Material gagal ditemukan masuk errors
   - Kompatibel dengan excel.js:
       parser.parse(cirText)

   CONTOH CIR:

   Material
   Pigtail 2 pcs
   Protect 2 pcs
   Gembok (DPS-09-D0002-M01S2)

   HASIL:

   Pigtail | 2 | pcs
   Protect | 2 | pcs
   Gembok  | 1 | -
========================================================= */

(function () {

    "use strict";


    /* =====================================================
       CONFIGURATION
    ====================================================== */

    const CONFIG = {

        /*
         * Nilai minimum kemiripan.
         *
         * 1.00 = harus sama persis
         * 0.90 = sangat ketat
         * 0.80 = cukup toleran
         *
         * Untuk typo ringan gunakan 0.72 - 0.80.
         */

        FUZZY_THRESHOLD: 0.74,

        /*
         * Minimal panjang material untuk fuzzy.
         */

        MIN_FUZZY_LENGTH: 4,

        /*
         * Berapa baris berikutnya boleh digabung
         * untuk material multi-line.
         */

        MAX_COMBINE_LINES: 2,

        /*
         * Kata yang dianggap header / pemisah.
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
       NORMALIZE MATERIAL
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
       NORMALIZE FOR FUZZY
    ====================================================== */

    function normalizeForFuzzy(value) {

        return normalizeMaterialName(value)

            /*
             * Hilangkan karakter non penting.
             */

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

        /*
         * Support beberapa kemungkinan
         * implementasi settings.js.
         */

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
                typeof window !==
                "undefined" &&
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
                typeof window !==
                "undefined" &&
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
       GET MATERIAL LIST
    ====================================================== */

    function getMaterialListFromSettings() {

        const settings =
            getSettings();


        let materialList = [];


        /*
         * Format array.
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
         * Format string.
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
         * HTML Anda menggunakan:
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
         * Fallback ID lama.
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


        /*
         * Bersihkan.
         */

        const cleaned = [];


        const seen =
            new Set();


        for (
            const item
            of materialList
        ) {

            const value =
                normalizeText(item);


            if (!value) {

                continue;

            }


            const key =
                normalizeMaterialName(
                    value
                );


            if (
                !key ||
                seen.has(key)
            ) {

                continue;

            }


            seen.add(key);

            cleaned.push(value);

        }


        /*
         * Material terpanjang dahulu.
         *
         * Contoh:
         *
         * Tiang 7
         * Tiang 7 (Batang)
         *
         * Maka Tiang 7 (Batang)
         * dicoba lebih dahulu.
         */

        cleaned.sort(
            function (a, b) {

                return (
                    b.length -
                    a.length
                );

            }
        );


        return cleaned;

    }


    /* =====================================================
       IS HEADER
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
            .some(
                function (header) {

                    return (
                        value ===
                        normalizeMaterialName(
                            header
                        )
                    );

                }
            );

    }


    /* =====================================================
       FIND MATERIAL SECTION
    ====================================================== */

    function extractMaterialSection(
        cirText
    ) {

        const text =
            String(
                cirText ??
                ""
            );


        const lines =
            text
                .replace(/\r/g, "")
                .split("\n");


        /*
         * Cari tulisan Material.
         */

        let materialIndex = -1;


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
                isMaterialHeader(
                    line
                )
            ) {

                materialIndex =
                    i;

                break;

            }


            /*
             * Support:
             *
             * Material:
             * Material -
             * Material
             */

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
         * Jika tidak ada header Material,
         * gunakan seluruh CIR.
         *
         * Ini menjaga kompatibilitas
         * dengan CIR lama.
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
         * Ambil semua baris setelah Material.
         */

        const result =
            lines.slice(
                materialIndex + 1
            );


        return {

            found: true,

            lines:
                result

        };

    }


    /* =====================================================
       REMOVE MATERIAL HEADER
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

            .map(
                function (line) {

                    return normalizeText(
                        line
                    );

                }
            )

            .filter(
                function (line) {

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

                }
            );

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


        /*
         * 1.000,50
         */

        if (
            text.includes(".") &&
            text.includes(",")
        ) {

            text =
                text
                    .replace(/\./g, "")
                    .replace(",", ".");

        }

        /*
         * 1,5
         */

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
       EXTRACT QUANTITY
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
         * Prioritas:
         *
         * Qty 2
         * Qty: 2
         * Qty = 2
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
         * Contoh:
         *
         * Pigtail 2 pcs
         * Protect 2 pcs
         * Tiang 7 5 batang
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
                    value.replace(
                        regex,
                        " "
                    );

            }

        }


        /*
         * Cari angka yang berdiri sendiri.
         *
         * Hindari angka yang merupakan bagian
         * dari kode seperti:
         *
         * DPS-09-D0002-M01S2
         */

        const numberMatches =
            remainder.match(
                /(?:^|\s)(-?\d+(?:[.,]\d+)?)(?=\s|$)/g
            );


        if (
            numberMatches &&
            numberMatches.length
        ) {

            const candidate =
                numberMatches[0]
                    .trim();


            /*
             * Pastikan bukan bagian dari
             * nama material seperti:
             *
             * Splitter 1:2
             */

            if (
                !(
                    materialName &&
                    new RegExp(
                        escapeRegex(
                            candidate
                        )
                    ).test(
                        materialName
                    )
                )
            ) {

                return parseNumber(
                    candidate
                );

            }

        }


        return "";

    }


    /* =====================================================
       EXTRACT UNIT
    ====================================================== */

    function findUnit(
        text,
        materialName
    ) {

        const value =
            normalizeText(
                text
            );


        /*
         * Urutan penting.
         */

        const units = [

            "pcs",

            "piece",

            "pieces",

            "unit",

            "batang",

            "meter",

            "metre",

            "buah",

            "set",

            "pc",

            "m"

        ];


        for (
            const unit
            of units
        ) {

            const regex =
                new RegExp(
                    "\\b" +
                    escapeRegex(unit) +
                    "\\b",
                    "i"
                );


            if (
                regex.test(value)
            ) {

                /*
                 * Gunakan format yang lebih
                 * rapi untuk hasil.
                 */

                if (
                    unit === "pcs" ||
                    unit === "pc"
                ) {

                    return "pcs";

                }


                if (
                    unit === "piece" ||
                    unit === "pieces"
                ) {

                    return "pcs";

                }


                if (
                    unit === "metre"
                ) {

                    return "meter";

                }


                if (
                    unit === "m"
                ) {

                    return "m";

                }


                return (
                    unit.charAt(0)
                        .toUpperCase() +
                    unit.slice(1)
                );

            }

        }


        /*
         * Satuan dari nama material.
         */

        const lower =
            normalizeMaterialName(
                materialName
            );


        if (
            lower.includes("(meter)")
        ) {

            return "Meter";

        }


        if (
            lower.includes("(unit)")
        ) {

            return "Unit";

        }


        if (
            lower.includes("(batang)")
        ) {

            return "Batang";

        }


        return "";

    }


    /* =====================================================
       EXTRACT CODE
    ====================================================== */

    function findCode(
        text
    ) {

        const value =
            normalizeText(
                text
            );


        /*
         * Format:
         *
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
         * Format:
         *
         * Gembok (DPS-09-D0002-M01S2)
         *
         * Ambil isi dalam kurung jika terlihat
         * seperti kode.
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


            /*
             * Kode biasanya memiliki
             * angka + huruf + tanda -
             */

            if (
                /[A-Za-z]/.test(inside) &&
                /\d/.test(inside)
            ) {

                return inside;

            }

        }


        return "";

    }


    /* =====================================================
       MATERIAL REGEX
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
                .map(
                    function (part) {

                        return escapeRegex(
                            part
                        );

                    }
                )
                .join(
                    "\\s*"
                );


        return new RegExp(

            "(^|[^A-Za-z0-9])" +

            pattern +

            "(?=$|[^A-Za-z0-9])",

            "i"

        );

    }


    /* =====================================================
       LEVENSHTEIN DISTANCE
    ====================================================== */

    function levenshtein(
        a,
        b
    ) {

        const s =
            normalizeForFuzzy(a);


        const t =
            normalizeForFuzzy(b);


        if (s === t) {

            return 0;

        }


        if (!s.length) {

            return t.length;

        }


        if (!t.length) {

            return s.length;

        }


        const previous =
            new Array(
                t.length + 1
            );


        const current =
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


            for (
                let j = 0;
                j <= t.length;
                j++
            ) {

                previous[j] =
                    current[j];

            }

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
            normalizeForFuzzy(a);


        const y =
            normalizeForFuzzy(b);


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


        /*
         * Exact substring.
         */

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

            let best = 0;


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


            total += best;

        }


        return (
            total /
            materialTokens.length
        );

    }


    /* =====================================================
       CLEAN INPUT FOR MATERIAL MATCH
    ====================================================== */

    function cleanLineForMatching(
        line
    ) {

        let value =
            normalizeText(
                line
            );


        /*
         * Hilangkan Qty:
         *
         * Qty: 2
         * Qty 2
         */

        value =
            value.replace(
                /\b(?:qty|quantity|jumlah)\s*[:=]?\s*-?\d+(?:[.,]\d+)?/gi,
                " "
            );


        /*
         * Hilangkan angka yang diikuti satuan.
         *
         * 2 pcs
         * 2 unit
         * 2 batang
         */

        value =
            value.replace(
                /\b\d+(?:[.,]\d+)?\s*(?:pcs?|pieces?|unit|batang|meter|metre|buah|set|m)\b/gi,
                " "
            );


        return normalizeText(
            value
        );

    }


    /* =====================================================
       FIND EXACT MATERIAL
    ====================================================== */

    function findExactMaterial(
        line,
        materialList
    ) {

        const original =
            normalizeText(
                line
            );


        const cleaned =
            cleanLineForMatching(
                original
            );


        /*
         * Coba material terpanjang
         * terlebih dahulu.
         */

        for (
            const material
            of materialList
        ) {

            const regex =
                createMaterialRegex(
                    material
                );


            if (
                !regex
            ) {

                continue;

            }


            if (
                regex.test(
                    cleaned
                )
            ) {

                return {

                    material:
                        material,

                    score:
                        1,

                    matchedAlias:
                        material,

                    method:
                        "EXACT"

                };

            }

        }


        return null;

    }


    /* =====================================================
       FIND FUZZY MATERIAL
    ====================================================== */

    function findFuzzyMaterial(
        line,
        materialList
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


        for (
            const material
            of materialList
        ) {

            const materialNormalized =
                normalizeMaterialName(
                    material
                );


            if (
                materialNormalized.length <
                CONFIG.MIN_FUZZY_LENGTH
            ) {

                continue;

            }


            /*
             * 1. Kemiripan seluruh baris.
             */

            const fullScore =
                similarity(
                    cleaned,
                    material
                );


            /*
             * 2. Kemiripan token.
             */

            const tokenScore =
                tokenSimilarity(
                    cleaned,
                    material
                );


            /*
             * Gunakan score terbaik.
             */

            let score =
                Math.max(
                    fullScore,
                    tokenScore
                );


            /*
             * Jika material pendek,
             * kita buat lebih ketat.
             */

            if (
                materialNormalized.length <= 5
            ) {

                if (
                    score < 0.84
                ) {

                    continue;

                }

            }


            if (
                score >=
                CONFIG.FUZZY_THRESHOLD
            ) {

                if (
                    !best ||
                    score >
                    best.score
                ) {

                    best = {

                        material:
                            material,

                        score:
                            score,

                        matchedAlias:
                            cleaned,

                        method:
                            "FUZZY"

                    };

                }

            }

        }


        return best;

    }


    /* =====================================================
       FIND MATERIAL
    ====================================================== */

    function findMaterial(
        line,
        materialList
    ) {

        /*
         * EXACT dahulu.
         */

        const exact =
            findExactMaterial(
                line,
                materialList
            );


        if (
            exact
        ) {

            return exact;

        }


        /*
         * Baru fuzzy.
         */

        return findFuzzyMaterial(
            line,
            materialList
        );

    }


    /* =====================================================
       DETECT MATERIAL IN LINE
    ====================================================== */

    function detectMaterialInLine(
        line,
        materialList
    ) {

        const original =
            normalizeText(
                line
            );


        if (
            !original
        ) {

            return null;

        }


        const match =
            findMaterial(
                original,
                materialList
            );


        if (
            !match
        ) {

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
       LOOKS LIKE MATERIAL
    ====================================================== */

    function looksLikeMaterialLine(
        line
    ) {

        const value =
            normalizeText(
                line
            );


        if (
            !value
        ) {

            return false;

        }


        /*
         * Header jangan dianggap material.
         */

        if (
            isMaterialHeader(
                value
            )
        ) {

            return false;

        }


        /*
         * Ada Qty / satuan / kode.
         */

        if (
            /\b(?:qty|quantity|jumlah)\b/i
                .test(value)
        ) {

            return true;

        }


        if (
            /\b(?:pcs?|unit|batang|meter|metre|buah|set)\b/i
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


        return false;

    }


    /* =====================================================
       PARSE MATERIAL LINE
    ====================================================== */

    function parseMaterialLine(
        line,
        materialList,
        ticket
    ) {

        const text =
            normalizeText(
                line
            );


        if (
            !text
        ) {

            return null;

        }


        const detected =
            detectMaterialInLine(
                text,
                materialList
            );


        if (
            !detected
        ) {

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

                    raw:
                        text,

                    error:
                        "Nama material tidak ditemukan dalam daftar pengaturan."

                };

            }


            /*
             * Baris biasa.
             */

            return null;

        }


        return {

            success:
                true,

            ticket:
                ticket || "",

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
       COMBINE MULTI LINE
    ====================================================== */

    function tryCombineLines(
        lines,
        startIndex,
        materialList,
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
                    materialList,
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

        const materialList =
            getMaterialListFromSettings();


        if (
            !materialList.length
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
                        "Daftar Nama Material belum diatur."

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
         * Ambil bagian Material.
         */

        const section =
            extractMaterialSection(
                materialText
            );


        /*
         * Jika header Material ditemukan,
         * gunakan baris setelahnya.
         *
         * Jika tidak ditemukan,
         * fallback seluruh CIR.
         */

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


            if (
                !current
            ) {

                i++;

                continue;

            }


            /*
             * Exact / fuzzy langsung.
             */

            let parsed =
                parseMaterialLine(
                    current,
                    materialList,
                    ticket
                );


            /*
             * Kalau gagal,
             * coba gabungkan dengan baris berikut.
             *
             * Contoh:
             *
             * Splitter
             * 1:2
             */

            if (
                !parsed ||
                !parsed.success
            ) {

                const combined =
                    tryCombineLines(
                        lines,
                        i,
                        materialList,
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


        /*
         * Hilangkan duplikat.
         *
         * Kadang CIR hasil copy paste
         * memiliki baris yang sama dua kali.
         */

        const uniqueMaterials = [];
        const seen = new Set();


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
       DEBUG INFO
    ====================================================== */

    function getDebugInfo() {

        const list =
            getMaterialListFromSettings();


        return {

            materialCount:
                list.length,

            materials:
                list,

            threshold:
                CONFIG.FUZZY_THRESHOLD

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
            findMaterial,

        getMaterialList:
            getMaterialListFromSettings,

        getDebugInfo:
            getDebugInfo,

        normalize:
            normalizeMaterialName

    };


    /*
     * Alias kompatibilitas kode lama.
     */

    window.MaterialParser =
        window.ReportCheckerMaterial;


    window.parseMaterial =
        parseMaterial;


    window.parseMaterials =
        parseMaterialBlock;


    window.getMaterialList =
        getMaterialListFromSettings;


    /* =====================================================
       STARTUP LOG
    ====================================================== */

    console.log(
        "Report Checker Material Parser aktif."
    );


    console.log(
        "Material list:",
        getMaterialListFromSettings()
    );


})();
