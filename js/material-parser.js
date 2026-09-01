/* =========================================================
   REPORT CHECKER
   material-parser.js

   VERSION:
   - Master material
   - Alias material
   - CUSTOM / UNKNOWN detection
   - Quantity
   - Unit
   - Material code
   - Material section detection
   - Ticket wajib ada
   - Support variasi penulisan report
========================================================= */

(function () {

    "use strict";


    /* =====================================================
       MASTER MATERIAL
    ===================================================== */

    const MATERIAL_MASTER = [

        {
            name: "Pigtail",
            aliases: [
                "pigtail"
            ]
        },

        {
            name: "Patchcord",
            aliases: [
                "patchcord",
                "patch cord"
            ]
        },

        {
            name: "Splitter 1:2",
            aliases: [
                "splitter 1:2",
                "splitter 1/2",
                "splitter 1x2"
            ]
        },

        {
            name: "Splitter 1:4",
            aliases: [
                "splitter 1:4",
                "splitter 1/4",
                "splitter 1x4"
            ]
        },

        {
            name: "Splitter 1:8",
            aliases: [
                "splitter 1:8",
                "splitter 1/8",
                "splitter 1x8"
            ]
        },

        {
            name: "Splitter 1:16",
            aliases: [
                "splitter 1:16",
                "splitter 1/16",
                "splitter 1x16"
            ]
        },

        {
            name: "2C",
            aliases: [
                "2c",
                "2 c",
                "2 core",
                "2 core meter",
                "kabel 2c",
                "kabel 2 c"
            ]
        },

        {
            name: "12C",
            aliases: [
                "12c",
                "12 c",
                "12 core",
                "12 core meter",
                "kabel 12c",
                "kabel 12 c"
            ]
        },

        {
            name: "24C",
            aliases: [
                "24c",
                "24 c",
                "24 core",
                "24 core meter",
                "kabel 24c",
                "kabel 24 c"
            ]
        },

        {
            name: "48C",
            aliases: [
                "48c",
                "48 c",
                "48 core",
                "48 core meter",
                "kabel 48c",
                "kabel 48 c"
            ]
        },

        {
            name: "96C",
            aliases: [
                "96c",
                "96 c",
                "96 core",
                "96 core meter",
                "96f",
                "96 f",
                "96 fiber",
                "kabel 96f",
                "kabel 96 f",
                "kabel 96 core"
            ]
        },

        {
            name: "DPFO",
            aliases: [
                "dpfo"
            ]
        },

        {
            name: "12C DOME",
            aliases: [
                "12c dome",
                "12 c dome",
                "dome 12c",
                "dome 12 c"
            ]
        },

        {
            name: "24C DOME",
            aliases: [
                "24c dome",
                "24 c dome",
                "dome 24c",
                "dome 24 c"
            ]
        },

        {
            name: "48C DOME",
            aliases: [
                "48c dome",
                "48 c dome",
                "dome 48c",
                "dome 48 c"
            ]
        },

        {
            name: "96C DOME",
            aliases: [
                "96c dome",
                "96 c dome",
                "dome 96c",
                "dome 96 c"
            ]
        },

        {
            name: "144C DOME",
            aliases: [
                "144c dome",
                "144 c dome",
                "dome 144c",
                "dome 144 c"
            ]
        },

        {
            name: "24C INLINE",
            aliases: [
                "24c inline",
                "24 c inline",
                "inline 24c",
                "24c inlane",
                "24 c inlane"
            ]
        },

        {
            name: "48C INLINE",
            aliases: [
                "48c inline",
                "48 c inline",
                "inline 48c",
                "48c inlane",
                "48 c inlane"
            ]
        },

        {
            name: "96C INLINE",
            aliases: [
                "96c inline",
                "96 c inline",
                "inline 96c",
                "96c inlane",
                "96 c inlane"
            ]
        },

        {
            name: "144C INLINE",
            aliases: [
                "144c inline",
                "144 c inline",
                "inline 144c",
                "144c inlane",
                "144 c inlane"
            ]
        },

        {
            name: "Fixing Slack",
            aliases: [
                "fixing slack",
                "fix slack",
                "slack fixing"
            ]
        },

        {
            name: "Kaset JB",
            aliases: [
                "kaset jb",
                "kaset",
                "cassette jb",
                "jb cassette"
            ]
        },

        {
            name: "Terminal Roset",
            aliases: [
                "terminal roset",
                "terminal rosette",
                "roset",
                "rosette"
            ]
        },

        {
            name: "Tiang 7",
            aliases: [
                "tiang 7",
                "tiang 7 batang",
                "tiang7"
            ]
        },

        {
            name: "Tiang 9",
            aliases: [
                "tiang 9",
                "tiang 9 batang",
                "tiang9"
            ]
        },

        {
            name: "Subduct",
            aliases: [
                "subduct",
                "sub duct"
            ]
        },

        {
            name: "Handhole 40 x 40",
            aliases: [
                "handhole 40 x 40",
                "handhole 40x40",
                "hand hole 40 x 40",
                "hand hole 40x40"
            ]
        },

        {
            name: "Handhole 60 x 60",
            aliases: [
                "handhole 60 x 60",
                "handhole 60x60",
                "hand hole 60 x 60",
                "hand hole 60x60"
            ]
        },

        {
            name: "Handhole 80 x 80",
            aliases: [
                "handhole 80 x 80",
                "handhole 80x80",
                "hand hole 80 x 80",
                "hand hole 80x80"
            ]
        },

        {
            name: "Dead End",
            aliases: [
                "dead end",
                "deadend",
                "dead-end",
                "death end",
                "deathend",
                "death ned",
                "death net",
                "dead ned"
            ]
        }

    ];


    /* =====================================================
       DEFAULT SETTINGS
    ===================================================== */

    const DEFAULT_SETTINGS = {

        materialStartPhrases: [
            "Material :",
            "Material:",
            "Material",
            "MATERIAL :",
            "MATERIAL:",
            "MATERIAL",
            "Material yang digunakan :",
            "Material yang digunakan:",
            "Material digunakan :",
            "Material digunakan:",
            "List Material :",
            "List Material:"
        ],

        materialEndPhrases: [
            "Tim qn",
            "Team QN",
            "TEAM QN",
            "Tim QN",
            "PIC FS",
            "PIC fs",
            "PIC FS:",
            "RFO",
            "RFO:",
            "Action",
            "Action:",
            "Act",
            "Act:",
            "===CIR===",
            "==="
        ],

        notFoundPhrases: [
            "NOT YET",
            "Not Yet",
            "not yet",
            "NOT FOUND",
            "Not Found",
            "not found",
            "Belum ada",
            "belum ada",
            "Belum tersedia",
            "belum tersedia",
            "Pending",
            "pending",
            "N/A",
            "n/a"
        ]

    };


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
            .replace(/\r\n/g, "\n")
            .replace(/\r/g, "\n")
            .replace(/\u00A0/g, " ")
            .trim();

    }


    /* =====================================================
       NORMALIZE LINE
    ===================================================== */

    function normalizeLine(value) {

        return String(value || "")
            .replace(/\s+/g, " ")
            .trim();

    }


    /* =====================================================
       REMOVE BULLET
    ===================================================== */

    function removeBullet(line) {

        return String(line || "")
            .replace(
                /^\s*(?:[-•*]|\>\s*)+/,
                ""
            )
            .trim();

    }


    /* =====================================================
       GET SETTINGS
    ===================================================== */

    function getSettings() {

        if (
            window.ReportCheckerSettings &&
            typeof window.ReportCheckerSettings.get ===
                "function"
        ) {

            const settings =
                window.ReportCheckerSettings.get();


            return {

                ...DEFAULT_SETTINGS,

                ...settings

            };

        }


        return {

            ...DEFAULT_SETTINGS

        };

    }


    /* =====================================================
       NORMALIZE MATERIAL NAME
    ===================================================== */

    function normalizeMaterialText(
        value
    ) {

        return String(value || "")
            .toLowerCase()
            .replace(/\u00a0/g, " ")
            .replace(/[“”"]/g, "")
            .replace(/\s+/g, " ")
            .trim();

    }


    /* =====================================================
       FIND MASTER MATERIAL
    ===================================================== */

    function findMasterMaterial(
        value
    ) {

        const text =
            normalizeMaterialText(
                value
            );


        if (!text) {

            return null;

        }


        /*
         * Urutkan alias dari yang paling panjang.
         *
         * Ini penting supaya:
         *
         * 96C DOME
         *
         * tidak lebih dulu terbaca sebagai:
         *
         * 96C
         */

        const candidates = [];


        for (
            const item of MATERIAL_MASTER
        ) {

            for (
                const alias of item.aliases
            ) {

                candidates.push({

                    master:
                        item.name,

                    alias:
                        alias,

                    normalized:
                        normalizeMaterialText(
                            alias
                        )

                });

            }

        }


        candidates.sort(
            function (a, b) {

                return (
                    b.normalized.length -
                    a.normalized.length
                );

            }
        );


        for (
            const candidate of candidates
        ) {

            if (
                text.includes(
                    candidate.normalized
                )
            ) {

                return {

                    name:
                        candidate.master,

                    alias:
                        candidate.alias,

                    type:
                        "MASTER"

                };

            }

        }


        return null;

    }


    /* =====================================================
       NORMALIZE MATERIAL NAME PUBLIC
    ===================================================== */

    function normalizeMaterialName(
        value
    ) {

        const found =
            findMasterMaterial(
                value
            );


        if (found) {

            return found.name;

        }


        return String(value || "")
            .trim();

    }


    /* =====================================================
       PARSE QUANTITY + UNIT
    ===================================================== */

    function parseQuantityUnit(
        text
    ) {

        if (!text) {

            return {

                quantity: null,

                unit: ""

            };

        }


        const value =
            String(text)
                .trim();


        /*
         * Format:
         *
         * 1 pcs
         * 70 pcs
         * 149 m
         * 1508 meter
         * 2 unit
         * 10 batang
         */

        const match =
            value.match(
                /(?:^|\s|:)(\d+(?:[.,]\d+)?)\s*(pcs|pc|buah|unit|units|set|m|meter|meters|km|core|cores|lembar|roll|batang)\b/i
            );


        if (!match) {

            return {

                quantity: null,

                unit: ""

            };

        }


        const quantity =
            Number(
                match[1]
                    .replace(",", ".")
            );


        let unit =
            match[2]
                .toLowerCase()
                .trim();


        const unitMap = {

            pc: "pcs",

            pcs: "pcs",

            buah: "pcs",

            unit: "unit",

            units: "unit",

            set: "set",

            m: "m",

            meter: "m",

            meters: "m",

            km: "km",

            core: "core",

            cores: "core",

            lembar: "lembar",

            roll: "roll",

            batang: "batang"

        };


        unit =
            unitMap[unit] ||
            unit;


        return {

            quantity:
                quantity,

            unit:
                unit

        };

    }


    /* =====================================================
       PARSE MATERIAL CODE
    ===================================================== */

    function parseMaterialCode(
        text
    ) {

        if (!text) {

            return "";

        }


        const match =
            String(text)
                .match(
                    /\b(?:kode|code|item\s*code|material\s*code)\s*[:=]?\s*([A-Za-z0-9._/-]+)/i
                );


        if (!match) {

            return "";

        }


        return match[1]
            .trim();

    }


    /* =====================================================
       REMOVE CODE
    ===================================================== */

    function removeMaterialCode(
        text
    ) {

        return String(text || "")
            .replace(
                /\b(?:kode|code|item\s*code|material\s*code)\s*[:=]?\s*[A-Za-z0-9._/-]+/ig,
                ""
            );

    }


    /* =====================================================
       REMOVE QUANTITY
    ===================================================== */

    function removeQuantity(
        text
    ) {

        return String(text || "")
            .replace(
                /\b\d+(?:[.,]\d+)?\s*(pcs|pc|buah|unit|units|set|m|meter|meters|km|core|cores|lembar|roll|batang)\b/ig,
                ""
            );

    }


    /* =====================================================
       CLEAN MATERIAL NAME
    ===================================================== */

    function cleanMaterialName(
        text
    ) {

        let value =
            String(text || "")
                .trim();


        value =
            removeBullet(
                value
            );


        value =
            removeMaterialCode(
                value
            );


        value =
            removeQuantity(
                value
            );


        /*
         * Hapus colon / equal di akhir
         */

        value =
            value.replace(
                /\s*[:=]\s*$/,
                ""
            );


        /*
         * Hapus separator yang tersisa
         */

        value =
            value.replace(
                /\s*[,;-]\s*$/,
                ""
            );


        value =
            value.trim();


        return value;

    }


    /* =====================================================
       DETECT MATERIAL TYPE
       
       MASTER
       CUSTOM
       UNKNOWN
    ===================================================== */

    function detectMaterialType(
        materialName
    ) {

        const found =
            findMasterMaterial(
                materialName
            );


        if (found) {

            return {

                type:
                    "MASTER",

                normalizedName:
                    found.name,

                matchedAlias:
                    found.alias

            };

        }


        if (
            materialName &&
            materialName.trim()
        ) {

            return {

                type:
                    "CUSTOM",

                normalizedName:
                    materialName.trim(),

                matchedAlias:
                    ""

            };

        }


        return {

            type:
                "UNKNOWN",

            normalizedName:
                "",

            matchedAlias:
                ""

        };

    }


    /* =====================================================
       CHECK MATERIAL LINE
    ===================================================== */

    function looksLikeMaterialLine(
        line
    ) {

        if (!line) {

            return false;

        }


        const clean =
            removeBullet(
                normalizeLine(
                    line
                )
            );


        if (!clean) {

            return false;

        }


        /*
         * Jika mempunyai quantity + unit,
         * sangat mungkin material.
         */

        const quantity =
            parseQuantityUnit(
                clean
            );


        if (
            quantity.quantity !== null
        ) {

            return true;

        }


        /*
         * Jika ada kode material.
         */

        if (
            /\b(?:kode|code|item\s*code|material\s*code)\s*[:=]/i
                .test(clean)
        ) {

            return true;

        }


        /*
         * Jika cocok dengan master material,
         * tetap dianggap material walaupun quantity
         * tidak tertulis.
         */

        if (
            findMasterMaterial(
                clean
            )
        ) {

            return true;

        }


        return false;

    }


    /* =====================================================
       PARSE ONE MATERIAL LINE
    ===================================================== */

    function parseMaterialLine(
        line
    ) {

        const original =
            normalizeLine(
                line
            );


        if (!original) {

            return null;

        }


        const cleanLine =
            removeBullet(
                original
            );


        if (
            !looksLikeMaterialLine(
                cleanLine
            )
        ) {

            return null;

        }


        const quantity =
            parseQuantityUnit(
                cleanLine
            );


        const code =
            parseMaterialCode(
                cleanLine
            );


        const rawName =
            cleanMaterialName(
                cleanLine
            );


        if (!rawName) {

            return null;

        }


        const materialInfo =
            detectMaterialType(
                rawName
            );


        return {

            material:
                materialInfo.normalizedName,

            originalMaterial:
                rawName,

            quantity:
                quantity.quantity,

            unit:
                quantity.unit,

            code:
                code,

            type:
                materialInfo.type,

            matchedAlias:
                materialInfo.matchedAlias,

            raw:
                original

        };

    }


    /* =====================================================
       FIND MATERIAL START
    ===================================================== */

    function findMaterialStart(
        lines,
        phrases
    ) {

        for (
            let i = 0;
            i < lines.length;
            i++
        ) {

            const line =
                normalizeLine(
                    lines[i]
                );


            if (!line) {

                continue;

            }


            for (
                const phrase of phrases || []
            ) {

                if (!phrase) {

                    continue;

                }


                const p =
                    String(phrase)
                        .trim();


                if (
                    p.toLowerCase() ===
                    "material"
                ) {

                    if (
                        /^material\s*$/i
                            .test(line)
                    ) {

                        return i;

                    }

                    continue;

                }


                if (
                    line.toLowerCase()
                        .startsWith(
                            p.toLowerCase()
                        )
                ) {

                    return i;

                }

            }

        }


        return -1;

    }


    /* =====================================================
       FIND MATERIAL END
    ===================================================== */

    function findMaterialEnd(
        lines,
        startIndex,
        phrases
    ) {

        for (
            let i = startIndex + 1;
            i < lines.length;
            i++
        ) {

            const line =
                normalizeLine(
                    lines[i]
                );


            if (!line) {

                continue;

            }


            if (
                containsPhrase(
                    line,
                    phrases
                )
            ) {

                return i;

            }

        }


        return lines.length;

    }


    /* =====================================================
       CONTAINS PHRASE
    ===================================================== */

    function containsPhrase(
        line,
        phrases
    ) {

        const value =
            String(line || "")
                .toLowerCase();


        for (
            const phrase of phrases || []
        ) {

            if (!phrase) {

                continue;

            }


            if (
                value.includes(
                    String(phrase)
                        .toLowerCase()
                )
            ) {

                return true;

            }

        }


        return false;

    }


    /* =====================================================
       EXTRACT MATERIAL BLOCK
    ===================================================== */

    function extractMaterialBlock(
        cirText
    ) {

        const text =
            normalizeText(
                cirText
            );


        if (!text) {

            return {

                found:
                    false,

                lines:
                    [],

                startIndex:
                    -1,

                endIndex:
                    -1

            };

        }


        const settings =
            getSettings();


        const lines =
            text.split("\n");


        const startIndex =
            findMaterialStart(
                lines,
                settings.materialStartPhrases
            );


        if (
            startIndex === -1
        ) {

            return {

                found:
                    false,

                lines:
                    [],

                startIndex:
                    -1,

                endIndex:
                    -1

            };

        }


        const endIndex =
            findMaterialEnd(
                lines,
                startIndex,
                settings.materialEndPhrases
            );


        return {

            found:
                true,

            lines:
                lines.slice(
                    startIndex + 1,
                    endIndex
                ),

            startIndex:
                startIndex,

            endIndex:
                endIndex

        };

    }


    /* =====================================================
       PARSE MATERIALS
    ===================================================== */

    function parseMaterials(
        cirText,
        ticket
    ) {

        const cleanTicket =
            String(
                ticket || ""
            ).trim();


        const result = {

            found:
                false,

            status:
                "NOT FOUND",

            ticket:
                cleanTicket,

            materials:
                [],

            customMaterials:
                [],

            rawLines:
                [],

            note:
                ""

        };


        /*
         * TICKET WAJIB ADA
         */

        if (!cleanTicket) {

            result.status =
                "NO TICKET";

            result.note =
                "Material tidak diproses karena Ticket kosong.";

            return result;

        }


        const block =
            extractMaterialBlock(
                cirText
            );


        if (!block.found) {

            result.status =
                "NOT FOUND";

            result.note =
                "Bagian Material tidak ditemukan.";

            return result;

        }


        result.rawLines =
            block.lines;


        /*
         * Parse setiap line.
         */

        for (
            const line of block.lines
        ) {

            const parsed =
                parseMaterialLine(
                    line
                );


            if (!parsed) {

                continue;

            }


            /*
             * Ticket selalu ikut.
             */

            parsed.ticket =
                cleanTicket;


            result.materials.push(
                parsed
            );


            if (
                parsed.type ===
                "CUSTOM"
            ) {

                result.customMaterials.push(
                    parsed
                );

            }

        }


        /* ---------------------------------------------
           Tidak ada material
        --------------------------------------------- */

        if (
            result.materials.length === 0
        ) {

            result.status =
                "NOT FOUND";

            result.note =
                "Section Material ditemukan tetapi tidak ada material yang dapat dibaca.";

            return result;

        }


        result.found =
            true;


        result.status =
            "FOUND";


        result.note =
            `Ditemukan ${result.materials.length} material.`;

        return result;

    }


    /* =====================================================
       PARSE MULTIPLE ROWS
    ===================================================== */

    function parseMultipleMaterials(
        rows,
        cirField,
        ticketField
    ) {

        if (
            !Array.isArray(rows)
        ) {

            return [];

        }


        return rows.map(
            function (row) {

                const cir =
                    row
                        ? row[cirField]
                        : "";


                const ticket =
                    row
                        ? row[ticketField]
                        : "";


                return parseMaterials(
                    cir,
                    ticket
                );

            }
        );

    }


    /* =====================================================
       FLATTEN MATERIALS
       
       1 Ticket
       3 Material
       
       menjadi 3 row:
       
       Ticket | Material 1
       Ticket | Material 2
       Ticket | Material 3
    ===================================================== */

    function flattenMaterials(
        results
    ) {

        if (
            !Array.isArray(results)
        ) {

            return [];

        }


        const output = [];


        for (
            const result of results
        ) {

            if (
                !result ||
                !Array.isArray(
                    result.materials
                )
            ) {

                continue;

            }


            for (
                const material of result.materials
            ) {

                /*
                 * SAFETY:
                 * material tanpa Ticket
                 * tidak boleh masuk output.
                 */

                if (
                    !material ||
                    !material.ticket ||
                    !String(
                        material.ticket
                    ).trim()
                ) {

                    continue;

                }


                output.push({

                    ticket:
                        String(
                            material.ticket
                        ).trim(),

                    material:
                        material.material,

                    originalMaterial:
                        material.originalMaterial,

                    quantity:
                        material.quantity,

                    unit:
                        material.unit,

                    code:
                        material.code,

                    type:
                        material.type,

                    matchedAlias:
                        material.matchedAlias,

                    raw:
                        material.raw

                });

            }

        }


        return output;

    }


    /* =====================================================
       CREATE NO MATERIAL RECORD
       
       Tetap memiliki Ticket.
    ===================================================== */

    function createNoMaterialRecord(
        ticket,
        reason
    ) {

        const cleanTicket =
            String(
                ticket || ""
            ).trim();


        if (!cleanTicket) {

            return null;

        }


        return {

            ticket:
                cleanTicket,

            material:
                "NOT FOUND",

            originalMaterial:
                "",

            quantity:
                null,

            unit:
                "",

            code:
                "",

            type:
                "UNKNOWN",

            matchedAlias:
                "",

            raw:
                "",

            reason:
                reason ||
                "Material tidak ditemukan."

        };

    }


    /* =====================================================
       GET MASTER MATERIAL
    ===================================================== */

    function getMasterMaterials() {

        return MATERIAL_MASTER.map(
            function (item) {

                return {

                    name:
                        item.name,

                    aliases:
                        [...item.aliases]

                };

            }
        );

    }


    /* =====================================================
       ADD CUSTOM ALIAS
       
       Digunakan nanti oleh Settings.
       
       Contoh:
       
       addAlias(
           "Dead End",
           "death ned"
       );
    ===================================================== */

    function addAlias(
        masterName,
        alias
    ) {

        const master =
            MATERIAL_MASTER.find(
                function (item) {

                    return (
                        item.name
                            .toLowerCase() ===
                        String(
                            masterName
                        )
                            .toLowerCase()
                            .trim()
                    );

                }
            );


        if (!master) {

            return {

                success:
                    false,

                message:
                    "Master material tidak ditemukan."

            };

        }


        const cleanAlias =
            String(
                alias || ""
            ).trim();


        if (!cleanAlias) {

            return {

                success:
                    false,

                message:
                    "Alias kosong."

            };

        }


        const exists =
            master.aliases.some(
                function (item) {

                    return (
                        item.toLowerCase() ===
                        cleanAlias.toLowerCase()
                    );

                }
            );


        if (exists) {

            return {

                success:
                    false,

                message:
                    "Alias sudah ada."

            };

        }


        master.aliases.push(
            cleanAlias
        );


        return {

            success:
                true,

            message:
                "Alias berhasil ditambahkan."

        };

    }


    /* =====================================================
       PUBLIC API
    ===================================================== */

    window.ReportCheckerMaterial = {

        /*
         * Main parser
         */
        parse:
            parseMaterials,


        /*
         * Parse satu line
         */
        parseLine:
            parseMaterialLine,


        /*
         * Ambil section Material
         */
        extractBlock:
            extractMaterialBlock,


        /*
         * Banyak row
         */
        parseMultiple:
            parseMultipleMaterials,


        /*
         * Flatten untuk tabel/export
         */
        flatten:
            flattenMaterials,


        /*
         * Record jika material tidak ditemukan
         */
        createNoMaterial:
            createNoMaterialRecord,


        /*
         * Normalisasi nama material
         */
        normalizeName:
            normalizeMaterialName,


        /*
         * Cari master
         */
        findMaster:
            findMasterMaterial,


        /*
         * Master list
         */
        getMaster:
            getMasterMaterials,


        /*
         * Tambah alias
         */
        addAlias:
            addAlias

    };


})();
