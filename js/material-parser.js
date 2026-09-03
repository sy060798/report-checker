/* =========================================================
   REPORT CHECKER
   material-parser.js
   VERSION: STABLE / COMPATIBLE
   ---------------------------------------------------------
   Fungsi:
   - Membaca material dari settings.js
   - Sinkron dengan textarea #materialList / #materialNames
   - Parsing material dari CIR
   - Mendukung material multi-word / multi-line
   - Mengambil Qty, Satuan, Kode
   - Memisahkan material valid dan material error
   - Menyediakan alias global untuk kompatibilitas
========================================================= */

(function () {

    "use strict";

    /* =====================================================
       NORMALIZE TEXT
    ===================================================== */

    function normalizeText(value) {

        if (
            value === null ||
            value === undefined
        ) {
            return "";
        }

        return String(value)
            .replace(/\u00A0/g, " ")
            .replace(/\r/g, "")
            .replace(/\t/g, " ")
            .replace(/[ ]+/g, " ")
            .trim();

    }


    function normalizeMaterialName(value) {

        return normalizeText(value)
            .replace(/\s+/g, " ")
            .toLowerCase();

    }


    function escapeRegex(value) {

        return String(value)
            .replace(
                /[.*+?^${}()|[\]\\]/g,
                "\\$&"
            );

    }


    /* =====================================================
       SETTINGS
    ====================================================== */

    function getSettings() {

        /*
         * Prioritas:
         * 1. getParserSettings()
         * 2. window.getParserSettings()
         * 3. PARSER_SETTINGS
         * 4. parserSettings
         */

        try {

            if (
                typeof getParserSettings ===
                "function"
            ) {

                const result =
                    getParserSettings();

                if (result) {
                    return result;
                }

            }

        } catch (error) {

            console.warn(
                "getParserSettings() error:",
                error
            );

        }


        try {

            if (
                window &&
                typeof window.getParserSettings ===
                "function"
            ) {

                const result =
                    window.getParserSettings();

                if (result) {
                    return result;
                }

            }

        } catch (error) {

            console.warn(
                "window.getParserSettings() error:",
                error
            );

        }


        try {

            if (
                window.PARSER_SETTINGS
            ) {

                return window.PARSER_SETTINGS;

            }

        } catch (error) {

            console.warn(
                "PARSER_SETTINGS error:",
                error
            );

        }


        try {

            if (
                window.parserSettings
            ) {

                return window.parserSettings;

            }

        } catch (error) {

            console.warn(
                "parserSettings error:",
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


        let list = [];


        /*
         * Array settings
         */

        if (
            Array.isArray(
                settings.materialNames
            )
        ) {

            list =
                settings.materialNames;

        } else if (
            Array.isArray(
                settings.materials
            )
        ) {

            list =
                settings.materials;

        } else if (
            Array.isArray(
                settings.materialList
            )
        ) {

            list =
                settings.materialList;

        } else if (
            Array.isArray(
                settings.materialNamesList
            )
        ) {

            list =
                settings.materialNamesList;

        }


        /*
         * String settings
         */

        if (
            !list.length &&
            typeof settings.materialNames ===
            "string"
        ) {

            list =
                settings.materialNames
                    .split(/\r?\n/);

        }


        if (
            !list.length &&
            typeof settings.materialList ===
            "string"
        ) {

            list =
                settings.materialList
                    .split(/\r?\n/);

        }


        /*
         * HTML textarea.
         *
         * index.html kamu menggunakan:
         * id="materialList"
         */

        if (!list.length) {

            const textarea =
                document.getElementById(
                    "materialList"
                );

            if (textarea) {

                list =
                    textarea.value
                        .split(/\r?\n/);

            }

        }


        /*
         * Kompatibilitas dengan versi lama.
         */

        if (!list.length) {

            const textarea =
                document.getElementById(
                    "materialNames"
                );

            if (textarea) {

                list =
                    textarea.value
                        .split(/\r?\n/);

            }

        }


        /*
         * Bersihkan
         */

        const unique = [];
        const seen = new Set();


        list.forEach(
            function (item) {

                const material =
                    normalizeText(item);


                if (!material) {
                    return;
                }


                const key =
                    normalizeMaterialName(
                        material
                    );


                if (!key) {
                    return;
                }


                if (
                    seen.has(key)
                ) {
                    return;
                }


                seen.add(key);

                unique.push(
                    material
                );

            }
        );


        /*
         * Yang paling panjang
         * dicoba terlebih dahulu.
         */

        unique.sort(
            function (a, b) {

                return (
                    b.length -
                    a.length
                );

            }
        );


        return unique;

    }


    /* =====================================================
       PARSE NUMBER
    ====================================================== */

    function parseNumber(value) {

        if (
            value === null ||
            value === undefined
        ) {

            return "";

        }


        let text =
            String(value)
                .trim()
                .replace(/\s/g, "");


        if (!text) {
            return "";
        }


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


        return Number.isNaN(number)
            ? value
            : number;

    }


    /* =====================================================
       FIND QTY
    ====================================================== */

    function findQty(text) {

        const value =
            normalizeText(text);


        if (!value) {
            return "";
        }


        /*
         * Prioritas:
         *
         * Qty: 10
         * Qty = 10
         * Jumlah: 10
         */

        let match =
            value.match(
                /(?:qty|quantity|jumlah)\s*[:=]?\s*(-?\d+(?:[.,]\d+)?)/i
            );


        if (match) {

            return parseNumber(
                match[1]
            );

        }


        /*
         * Contoh:
         *
         * Pigtail 2
         * Pigtail - 2
         * Pigtail : 2
         */

        match =
            value.match(
                /(?:^|\s|[:=-])(-?\d+(?:[.,]\d+)?)\s*(?:unit|pcs|pc|meter|m|batang|buah|set)?$/i
            );


        if (match) {

            return parseNumber(
                match[1]
            );

        }


        return "";

    }


    /* =====================================================
       FIND UNIT
    ====================================================== */

    function findUnit(text) {

        const value =
            normalizeText(text);


        if (!value) {
            return "";
        }


        /*
         * Prioritas dari teks explicit.
         */

        const match =
            value.match(
                /\b(meter|unit|batang|pcs|pc|set|buah)\b/i
            );


        if (match) {

            const unit =
                match[1]
                    .toLowerCase();


            const map = {

                meter: "Meter",

                unit: "Unit",

                batang: "Batang",

                pcs: "Pcs",

                pc: "Pc",

                set: "Set",

                buah: "Buah"

            };


            return (
                map[unit] ||
                match[1]
            );

        }


        const lower =
            value.toLowerCase();


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
       FIND CODE
    ====================================================== */

    function findCode(text) {

        const value =
            normalizeText(text);


        if (!value) {
            return "";
        }


        const match =
            value.match(
                /(?:kode|code)\s*[:=]\s*([A-Za-z0-9._/-]+)/i
            );


        return match
            ? match[1]
            : "";

    }


    /* =====================================================
       CREATE MATERIAL REGEX
    ====================================================== */

    function createMaterialRegex(
        materialName
    ) {

        const parts =
            String(materialName)
                .trim()
                .split(/\s+/)
                .filter(Boolean);


        if (!parts.length) {
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
                .join("\\s*");


        return new RegExp(
            "(^|[^A-Za-z0-9])" +
            pattern +
            "(?=$|[^A-Za-z0-9])",
            "i"
        );

    }


    /* =====================================================
       DETECT MATERIAL
    ====================================================== */

    function detectMaterialInLine(
        line,
        materialList
    ) {

        const original =
            normalizeText(line);


        if (!original) {
            return null;
        }


        for (
            const material
            of materialList
        ) {

            const regex =
                createMaterialRegex(
                    material
                );


            if (!regex) {
                continue;
            }


            if (
                regex.test(
                    original
                )
            ) {

                return {

                    material:
                        normalizeText(
                            material
                        ),

                    raw:
                        original

                };

            }

        }


        return null;

    }


    /* =====================================================
       PARSE ONE LINE
    ====================================================== */

    function parseMaterialLine(
        line,
        materialList,
        ticket
    ) {

        const text =
            normalizeText(line);


        if (!text) {
            return null;
        }


        const detected =
            detectMaterialInLine(
                text,
                materialList
            );


        if (!detected) {

            return {

                success:
                    false,

                ticket:
                    ticket || "",

                material:
                    text,

                qty:
                    findQty(text),

                satuan:
                    findUnit(text),

                kode:
                    findCode(text),

                error:
                    "Nama material tidak ditemukan dalam daftar pengaturan.",

                raw:
                    text

            };

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
                findQty(text),

            quantity:
                findQty(text),

            satuan:
                findUnit(text),

            unit:
                findUnit(text),

            kode:
                findCode(text),

            code:
                findCode(text),

            raw:
                text,

            sourceLine:
                text,

            type:
                "OFFICIAL",

            matchedAlias:
                detected.material,

            score:
                100

        };

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


        if (!materialList.length) {

            return {

                materials: [],

                errors: [{

                    ticket:
                        ticket || "",

                    material: "",

                    qty: "",

                    satuan: "",

                    kode: "",

                    error:
                        "Daftar Nama Material belum diatur.",

                    raw: ""

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


        const source =
            String(materialText)
                .replace(/\r/g, "");


        if (!source.trim()) {

            return {

                materials: [],

                errors: []

            };

        }


        const lines =
            source.split("\n");


        const materials = [];
        const errors = [];


        let i = 0;


        while (
            i < lines.length
        ) {

            let current =
                normalizeText(
                    lines[i]
                );


            if (!current) {

                i++;

                continue;

            }


            /*
             * Coba satu baris.
             */

            let parsed =
                parseMaterialLine(
                    current,
                    materialList,
                    ticket
                );


            /*
             * Coba gabung 2 baris.
             *
             * Contoh:
             *
             * Splitter
             * 1:2
             */

            if (
                parsed &&
                !parsed.success &&
                i + 1 < lines.length
            ) {

                const next =
                    normalizeText(
                        lines[i + 1]
                    );


                if (next) {

                    const combined =
                        current +
                        " " +
                        next;


                    const combinedParsed =
                        parseMaterialLine(
                            combined,
                            materialList,
                            ticket
                        );


                    if (
                        combinedParsed &&
                        combinedParsed.success
                    ) {

                        parsed =
                            combinedParsed;

                        i++;

                    }

                }

            }


            /*
             * Kalau berhasil
             */

            if (
                parsed &&
                parsed.success
            ) {

                materials.push(
                    parsed
                );

            }

            /*
             * Kalau gagal, jangan anggap
             * seluruh teks CIR sebagai error.
             *
             * Hanya baris yang terlihat
             * seperti data material.
             */

            else if (
                parsed &&
                !parsed.success
            ) {

                const looksLikeMaterial =
                    /\d/.test(current) ||
                    /\b(qty|quantity|jumlah|kode|code|unit|pcs|pc|meter|batang|buah|set)\b/i.test(
                        current
                    );


                if (
                    looksLikeMaterial
                ) {

                    errors.push(
                        parsed
                    );

                }

            }


            i++;

        }


        return {

            materials:
                materials,

            errors:
                errors

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
       FLATTEN
    ===================================================== */

    function flatten(
        results
    ) {

        const output = [];


        /*
         * Bisa menerima:
         *
         * [
         *   {
         *      materials: [...]
         *   }
         * ]
         *
         * atau langsung:
         *
         * {
         *    materials: [...]
         * }
         */

        const list =
            Array.isArray(results)
                ? results
                : [results];


        list.forEach(
            function (result) {

                if (!result) {
                    return;
                }


                const materials =
                    Array.isArray(
                        result.materials
                    )
                        ? result.materials
                        : [];


                materials.forEach(
                    function (item) {

                        if (!item) {
                            return;
                        }


                        output.push({

                            ticket:
                                item.ticket ||
                                "",

                            material:
                                item.material ||
                                "",

                            originalMaterial:
                                item.originalMaterial ||
                                item.material ||
                                "",

                            quantity:
                                item.quantity ??
                                item.qty ??
                                "",

                            unit:
                                item.unit ||
                                item.satuan ||
                                "",

                            code:
                                item.code ||
                                item.kode ||
                                "",

                            type:
                                item.type ||
                                "OFFICIAL",

                            matchedAlias:
                                item.matchedAlias ||
                                "",

                            score:
                                item.score ??
                                100,

                            raw:
                                item.raw ||
                                item.sourceLine ||
                                ""

                        });

                    }
                );

            }
        );


        return output;

    }


    /* =====================================================
       MAIN PARSE ALIAS
    ====================================================== */

    function parse(
        cirText,
        ticket
    ) {

        const result =
            parseMaterialBlock(
                cirText,
                ticket
            );


        /*
         * Compatibility:
         *
         * excel.js versi lama mengharapkan
         * array hasil parser.
         *
         * excel.js versi baru juga bisa
         * membaca array.
         */

        return result.materials;

    }


    /* =====================================================
       FULL PARSE
       Untuk kebutuhan lanjutan.
    ====================================================== */

    function parseDetailed(
        cirText,
        ticket
    ) {

        return parseMaterialBlock(
            cirText,
            ticket
        );

    }


    /* =====================================================
       PUBLIC API
    ====================================================== */

    const api = {

        parse:
            parse,

        parseDetailed:
            parseDetailed,

        parseMaterial:
            parseMaterialBlock,

        parseMaterials:
            parseMaterialBlock,

        parseFromCIR:
            parseMaterialsFromCIR,

        parseFromLines:
            parseMaterialsFromLines,

        detect:
            detectMaterialInLine,

        getMaterialList:
            getMaterialListFromSettings,

        normalize:
            normalizeMaterialName,

        flatten:
            flatten

    };


    /*
     * Nama utama.
     */

    window.MaterialParser =
        api;


    /*
     * Nama yang dicari excel.js.
     */

    window.ReportCheckerMaterial =
        api;


    /*
     * Alias global lama.
     */

    window.parseMaterial =
        parseMaterialBlock;


    window.parseMaterials =
        parseMaterialBlock;


    window.getMaterialList =
        getMaterialListFromSettings;


    /* =====================================================
       DEBUG
    ====================================================== */

    console.log(
        "Report Checker Material Parser aktif.",
        "Jumlah material:",
        getMaterialListFromSettings().length
    );


})();
