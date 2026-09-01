/* =========================================================
   REPORT CHECKER
   material-parser.js

   UPDATED VERSION
   ---------------------------------------------------------
   ATURAN UTAMA:

   1. Ticket WAJIB menggunakan:
      TT Number = KOLOM D

   2. Customer Ticket TIDAK digunakan sebagai ticket.

   3. Ref Ticket TIDAK digunakan sebagai ticket.

   4. Jika TT Number kosong:
      => NO TICKET
      => material tidak diproses.

   5. CIR diambil dari kolom:
      CIR

   6. Material hanya boleh berasal dari:
      MATERIAL_MASTER

   7. Material di luar master:
      => DIABAIKAN

   8. Support:
      - Exact matching
      - Contains matching
      - Similar / typo ringan
      - Alias
      - Quantity
      - Unit
      - Material code
      - Raw material
      - Raw line

   9. Material section harus berada di antara:
      Material
      sampai
      section berikutnya seperti:
      Team QN
      PIC FS
      RFO
      Action
      CIR separator

   10. Tidak mengambil material seperti:
       - protek
       - sleeve
       - tisu alkohol
       - alcohol tissue
       - dll
       selama tidak ada di MATERIAL_MASTER.

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
                "splitter 1x2",
                "splitter 1 2"
            ]
        },

        {
            name: "Splitter 1:4",
            aliases: [
                "splitter 1:4",
                "splitter 1/4",
                "splitter 1x4",
                "splitter 1 4"
            ]
        },

        {
            name: "Splitter 1:8",
            aliases: [
                "splitter 1:8",
                "splitter 1/8",
                "splitter 1x8",
                "splitter 1 8"
            ]
        },

        {
            name: "Splitter 1:16",
            aliases: [
                "splitter 1:16",
                "splitter 1/16",
                "splitter 1x16",
                "splitter 1 16"
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
                "kabel 2 c",
                "kabel 2 core"
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
                "kabel 12 c",
                "kabel 12 core",
                "12f",
                "12 f"
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
                "kabel 24 c",
                "kabel 24 core",
                "24f",
                "24 f"
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
                "kabel 48 c",
                "kabel 48 core",
                "48f",
                "48 f"
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
                "kabel 96c",
                "kabel 96 c",
                "kabel 96f",
                "kabel 96 f",
                "kabel 96 core",
                "kabel 96 fiber"
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
                "dome 12 c",
                "12f dome"
            ]
        },

        {
            name: "24C DOME",
            aliases: [
                "24c dome",
                "24 c dome",
                "dome 24c",
                "dome 24 c",
                "24f dome"
            ]
        },

        {
            name: "48C DOME",
            aliases: [
                "48c dome",
                "48 c dome",
                "dome 48c",
                "dome 48 c",
                "48f dome"
            ]
        },

        {
            name: "96C DOME",
            aliases: [
                "96c dome",
                "96 c dome",
                "dome 96c",
                "dome 96 c",
                "96f dome"
            ]
        },

        {
            name: "144C DOME",
            aliases: [
                "144c dome",
                "144 c dome",
                "dome 144c",
                "dome 144 c",
                "144f dome"
            ]
        },

        {
            name: "24C INLINE",
            aliases: [
                "24c inline",
                "24 c inline",
                "inline 24c",
                "24c inlane",
                "24 c inlane",
                "inline 24 c"
            ]
        },

        {
            name: "48C INLINE",
            aliases: [
                "48c inline",
                "48 c inline",
                "inline 48c",
                "48c inlane",
                "48 c inlane",
                "inline 48 c"
            ]
        },

        {
            name: "96C INLINE",
            aliases: [
                "96c inline",
                "96 c inline",
                "inline 96c",
                "96c inlane",
                "96 c inlane",
                "inline 96 c"
            ]
        },

        {
            name: "144C INLINE",
            aliases: [
                "144c inline",
                "144 c inline",
                "inline 144c",
                "144c inlane",
                "144 c inlane",
                "inline 144 c"
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
                "jb cassette",
                "jb 96f",
                "jb 96 f",
                "jb96f",
                "jb96 f"
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
                "hand hole 40x40",
                "handhole 40"
            ]
        },

        {
            name: "Handhole 60 x 60",
            aliases: [
                "handhole 60 x 60",
                "handhole 60x60",
                "hand hole 60 x 60",
                "hand hole 60x60",
                "handhole 60"
            ]
        },

        {
            name: "Handhole 80 x 80",
            aliases: [
                "handhole 80 x 80",
                "handhole 80x80",
                "hand hole 80 x 80",
                "hand hole 80x80",
                "handhole 80"
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
                "dead ned",
                "dead net"
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
            "======CIR======",
            "======CIR========",
            "==="
        ],

        notFoundPhrases: [
            "NOT YET",
            "NOT FOUND",
            "Belum ada",
            "Belum tersedia",
            "Pending",
            "N/A"
        ],

        /*
         * Nama kolom Excel.
         *
         * Struktur yang digunakan:
         *
         * A = Datetime Receive
         * B = Customer Ticket
         * C = Ref Ticket
         * D = TT Number
         * ...
         * AF = CIR
         */

        ticketField:
            "TT Number",

        cirField:
            "CIR"

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
       NORMALIZE MATERIAL TEXT
    ===================================================== */

    function normalizeMaterialText(value) {

        return String(value || "")
            .toLowerCase()
            .replace(/\u00a0/g, " ")
            .replace(/[“”"]/g, "")
            .replace(/[‐-‒–—]/g, "-")
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
       BUILD ALIAS LIST
    ===================================================== */

    function buildAliasList() {

        const candidates = [];


        MATERIAL_MASTER.forEach(
            function (item) {

                item.aliases.forEach(
                    function (alias) {

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
                );

            }
        );


        candidates.sort(
            function (a, b) {

                return (
                    b.normalized.length -
                    a.normalized.length
                );

            }
        );


        return candidates;

    }


    const ALIAS_LIST =
        buildAliasList();


    /* =====================================================
       FIND MASTER MATERIAL
    ===================================================== */

    function findMasterMaterial(value) {

        const text =
            normalizeMaterialText(
                value
            );


        if (!text) {

            return null;

        }


        /*
         * EXACT
         */

        for (
            const candidate of ALIAS_LIST
        ) {

            if (
                text ===
                candidate.normalized
            ) {

                return {

                    name:
                        candidate.master,

                    alias:
                        candidate.alias,

                    type:
                        "MASTER",

                    confidence:
                        "EXACT"

                };

            }

        }


        /*
         * CONTAINS
         *
         * Contoh:
         *
         * Kabel 96f terpakai : 149 m
         *
         * => 96C
         */

        for (
            const candidate of ALIAS_LIST
        ) {

            const alias =
                candidate.normalized;


            if (
                alias.length < 2
            ) {

                continue;

            }


            const escaped =
                alias.replace(
                    /[.*+?^${}()|[\]\\]/g,
                    "\\$&"
                );


            const regex =
                new RegExp(
                    "(^|[^a-z0-9])" +
                    escaped +
                    "([^a-z0-9]|$)",
                    "i"
                );


            if (
                regex.test(text)
            ) {

                return {

                    name:
                        candidate.master,

                    alias:
                        candidate.alias,

                    type:
                        "MASTER",

                    confidence:
                        "CONTAINS"

                };

            }

        }


        return null;

    }


    /* =====================================================
       LEVENSHTEIN
    ===================================================== */

    function levenshtein(
        a,
        b
    ) {

        a =
            String(a || "");

        b =
            String(b || "");


        const matrix = [];


        for (
            let i = 0;
            i <= b.length;
            i++
        ) {

            matrix[i] = [i];

        }


        for (
            let j = 0;
            j <= a.length;
            j++
        ) {

            matrix[0][j] = j;

        }


        for (
            let i = 1;
            i <= b.length;
            i++
        ) {

            for (
                let j = 1;
                j <= a.length;
                j++
            ) {

                if (
                    b.charAt(i - 1) ===
                    a.charAt(j - 1)
                ) {

                    matrix[i][j] =
                        matrix[i - 1][j - 1];

                } else {

                    matrix[i][j] =
                        Math.min(

                            matrix[i - 1][j - 1] + 1,

                            matrix[i][j - 1] + 1,

                            matrix[i - 1][j] + 1

                        );

                }

            }

        }


        return matrix[b.length][a.length];

    }


    /* =====================================================
       SIMILARITY
    ===================================================== */

    function similarity(
        a,
        b
    ) {

        const first =
            normalizeMaterialText(a);


        const second =
            normalizeMaterialText(b);


        if (
            !first ||
            !second
        ) {

            return 0;

        }


        const distance =
            levenshtein(
                first,
                second
            );


        const maxLength =
            Math.max(
                first.length,
                second.length
            );


        if (!maxLength) {

            return 1;

        }


        return (
            1 -
            (
                distance /
                maxLength
            )
        );

    }


    /* =====================================================
       FIND SIMILAR MASTER
    ===================================================== */

    function findSimilarMaterial(
        value
    ) {

        const text =
            normalizeMaterialText(
                value
            );


        if (
            !text ||
            text.length < 4
        ) {

            return null;

        }


        let best =
            null;


        for (
            const candidate of ALIAS_LIST
        ) {

            const alias =
                candidate.normalized;


            if (
                alias.length < 4
            ) {

                continue;

            }


            /*
             * Angka material harus sama.
             *
             * 96C tidak boleh menjadi 48C.
             */

            const textNumbers =
                text.match(/\d+/g) || [];


            const aliasNumbers =
                alias.match(/\d+/g) || [];


            if (
                aliasNumbers.length &&
                textNumbers.length
            ) {

                if (
                    aliasNumbers.join(",") !==
                    textNumbers.join(",")
                ) {

                    continue;

                }

            }


            const score =
                similarity(
                    text,
                    alias
                );


            if (
                !best ||
                score > best.score
            ) {

                best = {

                    name:
                        candidate.master,

                    alias:
                        candidate.alias,

                    score:
                        score

                };

            }

        }


        if (
            best &&
            best.score >= 0.72
        ) {

            return {

                name:
                    best.name,

                alias:
                    best.alias,

                type:
                    "SIMILAR",

                confidence:
                    Math.round(
                        best.score * 100
                    ) + "%"

            };

        }


        return null;

    }


    /* =====================================================
       NORMALIZE MATERIAL NAME
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


        return String(
            value || ""
        ).trim();

    }


    /* =====================================================
       PARSE QUANTITY + UNIT
    ===================================================== */

    function parseQuantityUnit(
        text
    ) {

        if (!text) {

            return {

                quantity:
                    null,

                unit:
                    ""

            };

        }


        const value =
            String(text)
                .trim();


        const match =
            value.match(
                /(?:^|\s|:)(\d+(?:[.,]\d+)?)\s*(pcs|pc|buah|unit|units|set|m|meter|meters|km|core|cores|lembar|roll|batang)\b/i
            );


        if (!match) {

            return {

                quantity:
                    null,

                unit:
                    ""

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

            pc:
                "pcs",

            pcs:
                "pcs",

            buah:
                "pcs",

            unit:
                "unit",

            units:
                "unit",

            set:
                "set",

            m:
                "m",

            meter:
                "m",

            meters:
                "m",

            km:
                "km",

            core:
                "core",

            cores:
                "core",

            lembar:
                "lembar",

            roll:
                "roll",

            batang:
                "batang"

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
       REMOVE MATERIAL CODE
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


        value =
            value.replace(
                /\s*[:=]\s*$/,
                ""
            );


        value =
            value.replace(
                /\s*[,;-]\s*$/,
                ""
            );


        return value.trim();

    }


    /* =====================================================
       EXTRACT MASTER MATERIAL
    ===================================================== */

    function extractMasterFromLine(
        line
    ) {

        const clean =
            removeBullet(
                normalizeLine(
                    line
                )
            );


        if (!clean) {

            return null;

        }


        /*
         * EXACT / CONTAINS
         */

        const exact =
            findMasterMaterial(
                clean
            );


        if (exact) {

            return exact;

        }


        /*
         * Setelah quantity dan code dibuang.
         */

        const cleanedName =
            cleanMaterialName(
                clean
            );


        if (
            cleanedName &&
            cleanedName !== clean
        ) {

            const second =
                findMasterMaterial(
                    cleanedName
                );


            if (second) {

                return second;

            }

        }


        /*
         * Similar hanya sebagai bantuan.
         *
         * Tidak otomatis digunakan untuk semua line.
         * Ini mencegah false positive.
         */

        const similar =
            findSimilarMaterial(
                cleanedName || clean
            );


        if (similar) {

            return similar;

        }


        return null;

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


        const master =
            extractMasterFromLine(
                clean
            );


        return !!master;

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


        const materialMatch =
            extractMasterFromLine(
                cleanLine
            );


        /*
         * STRICT:
         * Tidak cocok master = tidak masuk.
         */

        if (!materialMatch) {

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


        return {

            material:
                materialMatch.name,

            originalMaterial:
                rawName,

            raw:
                original,

            quantity:
                quantity.quantity,

            unit:
                quantity.unit,

            code:
                code,

            type:
                "MASTER",

            matchType:
                materialMatch.confidence,

            matchedAlias:
                materialMatch.alias

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


                /*
                 * "Material" harus berdiri sendiri.
                 */

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
                    line
                        .toLowerCase()
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
       GET TT NUMBER
       
       PENTING:
       Hanya TT Number yang dipakai.
    ===================================================== */

    function getTTNumber(
        row,
        ticketField
    ) {

        /*
         * Jika object Excel:
         *
         * row["TT Number"]
         */

        if (
            row &&
            typeof row === "object" &&
            !Array.isArray(row)
        ) {

            const value =
                row[
                    ticketField ||
                    "TT Number"
                ];


            return String(
                value ?? ""
            ).trim();

        }


        /*
         * Jika row berupa array:
         *
         * Kolom D = index 3
         */

        if (
            Array.isArray(row)
        ) {

            return String(
                row[3] ?? ""
            ).trim();

        }


        return "";

    }


    /* =====================================================
       GET CIR
       
       Default:
       CIR = kolom AF
       
       Jika object:
       row["CIR"]
       
       Jika array:
       AF = index 31
    ===================================================== */

    function getCIR(
        row,
        cirField
    ) {

        if (
            row &&
            typeof row === "object" &&
            !Array.isArray(row)
        ) {

            return row[
                cirField ||
                "CIR"
            ] || "";

        }


        /*
         * Kolom AF = 32
         * index JavaScript = 31
         */

        if (
            Array.isArray(row)
        ) {

            return row[31] || "";

        }


        return "";

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

            reviewMaterials:
                [],

            rawLines:
                [],

            note:
                ""

        };


        /* =================================================
           TT NUMBER WAJIB ADA
        ================================================= */

        if (!cleanTicket) {

            result.status =
                "NO TICKET";

            result.note =
                "Material tidak diproses karena TT Number pada kolom D kosong.";

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


        /* =================================================
           PARSE SETIAP LINE
        ================================================= */

        for (
            const line of block.lines
        ) {

            const parsed =
                parseMaterialLine(
                    line
                );


            /*
             * Hanya master material.
             */

            if (!parsed) {

                continue;

            }


            /*
             * Ticket selalu TT Number.
             */

            parsed.ticket =
                cleanTicket;


            result.materials.push(
                parsed
            );

        }


        /* =================================================
           TIDAK ADA MATERIAL
        ================================================= */

        if (
            result.materials.length === 0
        ) {

            result.status =
                "NOT FOUND";

            result.note =
                "Section Material ditemukan tetapi tidak ada material yang cocok dengan master material.";

            return result;

        }


        result.found =
            true;


        result.status =
            "FOUND";


        result.note =
            `Ditemukan ${result.materials.length} material master.`;


        return result;

    }


    /* =====================================================
       PARSE MULTIPLE ROWS
       
       DEFAULT:
       ticketField = TT Number
       cirField    = CIR
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


        const settings =
            getSettings();


        const actualCirField =
            cirField ||
            settings.cirField ||
            "CIR";


        const actualTicketField =
            ticketField ||
            settings.ticketField ||
            "TT Number";


        return rows.map(
            function (row) {

                const cir =
                    getCIR(
                        row,
                        actualCirField
                    );


                const ticket =
                    getTTNumber(
                        row,
                        actualTicketField
                    );


                return parseMaterials(
                    cir,
                    ticket
                );

            }
        );

    }


    /* =====================================================
       FLATTEN MATERIALS
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
                 * Material tanpa TT Number
                 * tidak boleh keluar.
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

                    /*
                     * Ticket = TT Number
                     */

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

                    matchType:
                        material.matchType,

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
    ===================================================== */

    function createNoMaterialRecord(
        ticket,
        reason
    ) {

        const cleanTicket =
            String(
                ticket || ""
            ).trim();


        /*
         * TT Number kosong:
         * jangan membuat record.
         */

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

            matchType:
                "",

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
       ADD ALIAS
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


        /*
         * Alias baru langsung aktif.
         */

        ALIAS_LIST.push({

            master:
                master.name,

            alias:
                cleanAlias,

            normalized:
                normalizeMaterialText(
                    cleanAlias
                )

        });


        ALIAS_LIST.sort(
            function (a, b) {

                return (
                    b.normalized.length -
                    a.normalized.length
                );

            }
        );


        return {

            success:
                true,

            message:
                "Alias berhasil ditambahkan."

        };

    }


    /* =====================================================
       GET COLUMN INFO
       
       Helper untuk memastikan mapping Excel.
    ===================================================== */

    function getColumnMapping() {

        return {

            A:
                "Datetime Receive",

            B:
                "Customer Ticket",

            C:
                "Ref Ticket",

            D:
                "TT Number",

            E:
                "Cust ID",

            F:
                "Segment/Link",

            G:
                "Span Length",

            H:
                "LFO Id",

            I:
                "City Name",

            J:
                "Branch",

            K:
                "Type Workorder",

            L:
                "Customer Name",

            M:
                "Parsing Name",

            N:
                "Region",

            O:
                "Problem Subject",

            P:
                "Status TT",

            Q:
                "Shift",

            R:
                "Team Name",

            S:
                "Teknisi Name",

            T:
                "Restore Time",

            U:
                "MTTR",

            V:
                "Final SLA",

            W:
                "Start Stopclock 1",

            X:
                "End Stopclock 1",

            Y:
                "Start Stopclock 2",

            Z:
                "End Stopclock 2",

            AA:
                "RCA",

            AB:
                "SUB RCA",

            AC:
                "ACTION",

            AD:
                "TIKOR 1",

            AE:
                "TIKOR 2",

            AF:
                "CIR"

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
         * Parse multiple Excel rows
         *
         * Default:
         * D  = TT Number
         * AF = CIR
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
         * Cari material typo/mirip
         */
        findSimilar:
            findSimilarMaterial,


        /*
         * Master list
         */
        getMaster:
            getMasterMaterials,


        /*
         * Tambah alias
         */
        addAlias:
            addAlias,


        /*
         * Mapping kolom Excel
         */
        getColumnMapping:
            getColumnMapping,


        /*
         * Setting default
         */
        settings:
            DEFAULT_SETTINGS

    };


})();
