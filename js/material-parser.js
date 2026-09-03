/* =========================================================
   MATERIAL PARSER
   ---------------------------------------------------------
   Fungsi:
   - Mengambil daftar nama material dari settings.js
   - Otomatis sinkron dengan pengaturan Material
   - Mencari material di bagian CIR
   - Mendukung nama material multi-baris
   - Mengambil Qty, Satuan, dan Kode jika tersedia
   - Material yang tidak cocok dimasukkan ke error
========================================================= */

(function () {

    "use strict";


    /* =====================================================
       HELPER
    ====================================================== */

    function normalizeText(value) {

        if (value === null || value === undefined) {
            return "";
        }

        return String(value)
            .replace(/\r/g, "")
            .replace(/\u00A0/g, " ")
            .trim();

    }


    function normalizeMaterialName(value) {

        return normalizeText(value)
            .replace(/\s+/g, " ")
            .toLowerCase();

    }


    function escapeRegex(value) {

        return String(value)
            .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    }


    function getSettings() {

        /*
         * settings.js diharapkan menyediakan:
         *
         * getParserSettings()
         *
         * atau:
         *
         * PARSER_SETTINGS
         *
         * atau:
         *
         * parserSettings
         */

        try {

            if (typeof getParserSettings === "function") {

                const settings = getParserSettings();

                if (settings) {
                    return settings;
                }

            }

        } catch (error) {

            console.warn(
                "Gagal membaca getParserSettings():",
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
                "Gagal membaca PARSER_SETTINGS:",
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
                "Gagal membaca parserSettings:",
                error
            );

        }


        return {};

    }


    /* =====================================================
       AMBIL DAFTAR MATERIAL DARI SETTINGS
    ====================================================== */

    function getMaterialListFromSettings() {

        const settings = getSettings();

        let materialList = [];


        /*
         * Format yang didukung:
         *
         * materialNames
         * materials
         * materialList
         * materialNamesList
         */

        if (Array.isArray(settings.materialNames)) {

            materialList = settings.materialNames;

        } else if (Array.isArray(settings.materials)) {

            materialList = settings.materials;

        } else if (Array.isArray(settings.materialList)) {

            materialList = settings.materialList;

        } else if (Array.isArray(settings.materialNamesList)) {

            materialList = settings.materialNamesList;

        }


        /*
         * Kalau settings menyimpan textarea sebagai string
         */

        if (
            materialList.length === 0 &&
            typeof settings.materialNames === "string"
        ) {

            materialList =
                settings.materialNames.split(/\r?\n/);

        }


        /*
         * Fallback langsung dari textarea HTML.
         * Ini membuat parser tetap otomatis mengikuti
         * isi "Daftar Nama Material".
         */

        if (materialList.length === 0) {

            const textarea =
                document.getElementById(
                    "materialNames"
                );

            if (textarea) {

                materialList =
                    textarea.value.split(/\r?\n/);

            }

        }


        /*
         * Bersihkan daftar.
         */

        materialList = materialList
            .map(item => normalizeText(item))
            .filter(item => item !== "");


        /*
         * Hilangkan duplikat berdasarkan lowercase.
         */

        const unique = [];
        const seen = new Set();

        materialList.forEach(material => {

            const key =
                normalizeMaterialName(material);

            if (!key) {
                return;
            }

            if (!seen.has(key)) {

                seen.add(key);

                unique.push(material);

            }

        });


        /*
         * Material lebih panjang diletakkan di depan.
         *
         * Contoh:
         *
         * Tiang 7
         * Tiang 7 (Batang)
         *
         * Yang lebih spesifik dicoba terlebih dahulu.
         */

        unique.sort(function (a, b) {

            return b.length - a.length;

        });


        return unique;

    }


    /* =====================================================
       BERSIHKAN NAMA MATERIAL MULTI BARIS
    ====================================================== */

    function cleanMaterialName(value) {

        return normalizeText(value)
            .replace(/\s+/g, " ")
            .trim();

    }


    /* =====================================================
       PARSE ANGKA
    ====================================================== */

    function parseNumber(value) {

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
         * Format:
         *
         * 1.000
         * 1,000
         * 1.5
         * 1,5
         */

        if (
            text.includes(".") &&
            text.includes(",")
        ) {

            /*
             * Anggap titik ribuan dan koma desimal.
             */

            text =
                text
                    .replace(/\./g, "")
                    .replace(",", ".");

        } else if (
            text.includes(",") &&
            !text.includes(".")
        ) {

            /*
             * Koma desimal.
             */

            text =
                text.replace(",", ".");

        }


        const number =
            Number(text);


        if (Number.isNaN(number)) {

            return value;

        }


        return number;

    }


    /* =====================================================
       CARI QTY
    ====================================================== */

    function findQty(text) {

        const value =
            normalizeText(text);


        /*
         * Contoh:
         *
         * Pigtail 2
         * Pigtail : 2
         * Pigtail = 2
         */

        const match =
            value.match(
                /(?:qty|jumlah)?\s*[:=]?\s*(-?\d+(?:[.,]\d+)?)/i
            );


        if (match) {

            return parseNumber(match[1]);

        }


        return "";

    }


    /* =====================================================
       CARI SATUAN
    ====================================================== */

    function findUnit(text) {

        const value =
            normalizeText(text);


        const units = [

            "meter",
            "m",
            "unit",
            "batang",
            "pcs",
            "pc",
            "set",
            "buah"

        ];


        for (const unit of units) {

            const regex =
                new RegExp(
                    "\\b" +
                    escapeRegex(unit) +
                    "\\b",
                    "i"
                );


            if (regex.test(value)) {

                return unit;

            }

        }


        /*
         * Beberapa nama material sudah memiliki
         * satuan di dalam namanya.
         */

        const lower =
            value.toLowerCase();


        if (lower.includes("meter")) {
            return "Meter";
        }

        if (lower.includes("(unit)")) {
            return "Unit";
        }

        if (lower.includes("(batang)")) {
            return "Batang";
        }


        return "";

    }


    /* =====================================================
       CARI KODE
    ====================================================== */

    function findCode(text) {

        const value =
            normalizeText(text);


        /*
         * Mendukung:
         *
         * Kode: ABC123
         * Code: ABC123
         * Kode = ABC123
         */

        const match =
            value.match(
                /(?:kode|code)\s*[:=]\s*([A-Za-z0-9._/-]+)/i
            );


        if (match) {

            return match[1];

        }


        return "";

    }


    /* =====================================================
       BUAT REGEX MATERIAL
    ====================================================== */

    function createMaterialRegex(materialName) {

        /*
         * Material bisa mempunyai line break.
         *
         * Contoh:
         *
         * Splitter
         * 1:2
         *
         * akan tetap cocok dengan:
         *
         * Splitter 1:2
         */

        const parts =
            String(materialName)
                .split(/\s+/)
                .filter(Boolean);


        if (parts.length === 0) {
            return null;
        }


        const pattern =
            parts
                .map(part => escapeRegex(part))
                .join("\\s*");


        return new RegExp(
            "(^|[^A-Za-z0-9])" +
            pattern +
            "(?=$|[^A-Za-z0-9])",
            "i"
        );

    }


    /* =====================================================
       DETEKSI MATERIAL
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


        /*
         * Coba material yang paling panjang
         * terlebih dahulu.
         */

        for (const material of materialList) {

            const regex =
                createMaterialRegex(material);


            if (!regex) {
                continue;
            }


            if (regex.test(original)) {

                return {

                    material:
                        cleanMaterialName(material),

                    raw:
                        original

                };

            }

        }


        return null;

    }


    /* =====================================================
       PARSE SATU BARIS MATERIAL
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

                success: false,

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
                    "Nama material tidak ditemukan dalam daftar pengaturan."

            };

        }


        return {

            success: true,

            ticket:
                ticket || "",

            material:
                detected.material,

            qty:
                findQty(text),

            satuan:
                findUnit(text),

            kode:
                findCode(text),

            raw:
                text

        };

    }


    /* =====================================================
       PARSE BLOK MATERIAL
    ====================================================== */

    function parseMaterialBlock(
        materialText,
        ticket
    ) {

        const materialList =
            getMaterialListFromSettings();


        if (!materialList.length) {

            console.warn(
                "Daftar Nama Material kosong."
            );

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
                        "Daftar Nama Material belum diatur."

                }]

            };

        }


        const text =
            normalizeText(materialText);


        if (!text) {

            return {

                materials: [],

                errors: []

            };

        }


        /*
         * Pecah berdasarkan baris.
         */

        const lines =
            String(materialText)
                .replace(/\r/g, "")
                .split("\n");


        const materials = [];
        const errors = [];


        /*
         * Tangani material multi-line.
         *
         * Contoh:
         *
         * Splitter
         * 1:2
         *
         * akan digabung sementara.
         */

        let i = 0;


        while (i < lines.length) {

            let current =
                normalizeText(lines[i]);


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
                    materialList,
                    ticket
                );


            /*
             * Kalau belum ketemu,
             * gabungkan dengan baris berikutnya.
             */

            if (
                parsed &&
                !parsed.success &&
                i + 1 < lines.length
            ) {

                const combined =
                    normalizeText(
                        current +
                        " " +
                        lines[i + 1]
                    );


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

                    i += 1;

                }

            }


            if (parsed) {

                if (parsed.success) {

                    materials.push(parsed);

                } else {

                    /*
                     * Jangan langsung memasukkan semua
                     * baris biasa sebagai error.
                     *
                     * Hanya masukkan jika baris terlihat
                     * seperti data material.
                     */

                    const looksLikeMaterial =
                        /\d/.test(current) ||
                        /qty|jumlah|kode|code|unit|pcs|meter|batang/i.test(current);


                    if (looksLikeMaterial) {

                        errors.push(parsed);

                    }

                }

            }


            i++;

        }


        return {

            materials,

            errors

        };

    }


    /* =====================================================
       PARSE DARI ARRAY BARIS
    ====================================================== */

    function parseMaterialsFromLines(
        lines,
        ticket
    ) {

        if (!Array.isArray(lines)) {

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
       PARSE DARI CIR
    ====================================================== */

    function parseMaterialsFromCIR(
        cirText,
        ticket
    ) {

        if (
            cirText === null ||
            cirText === undefined
        ) {

            return {

                materials: [],

                errors: []

            };

        }


        return parseMaterialBlock(
            String(cirText),
            ticket
        );

    }


    /* =====================================================
       ALIAS FUNCTION
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
       EXPORT GLOBAL
    ====================================================== */

    window.MaterialParser = {

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

        getMaterialList:
            getMaterialListFromSettings,

        normalize:
            normalizeMaterialName

    };


    /*
     * Alias supaya kode lama tetap bisa bekerja.
     */

    window.parseMaterial =
        parseMaterial;

    window.parseMaterials =
        parseMaterialBlock;

    window.getMaterialList =
        getMaterialListFromSettings;


    /* =====================================================
       DEBUG
    ====================================================== */

    console.log(
        "Material Parser aktif. Daftar material:",
        getMaterialListFromSettings()
    );


})();
