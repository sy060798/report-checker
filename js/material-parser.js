/* =========================================================
   REPORT CHECKER
   material-parser.js

   UPDATED - SYNC WITH settings.js

   Fungsi:
   - Material hanya diambil berdasarkan MASTER LIST
     dari ReportCheckerSettings
   - Tidak bergantung pada nama material hard-code
   - Typo ringan masih diterima
   - Material yang tidak cukup mirip ditolak
   - Material excluded tidak pernah masuk hasil
   - Support CIR object maupun array
   - Support parse()
   - Support parseMultiple()
   - Support parseWithTicket()
   - Support buildRows()
   - Support flatten()
   - Support parseDetailed()

   CATATAN:
   MASTER MATERIAL sekarang membaca:

       window.ReportCheckerSettings.get()

   dari:

       settings.js

   sehingga daftar material cukup diatur melalui Settings.
========================================================= */

(function () {

    "use strict";


    /* =====================================================
       FALLBACK MASTER MATERIAL

       Hanya digunakan jika settings.js belum tersedia
       atau materialStartPhrases tidak ditemukan.

       Parser TETAP menggunakan setting.js apabila tersedia.
    ===================================================== */

    const FALLBACK_MATERIAL_MASTER = [

        "Pigtail",
        "Patchcord",

        "Splitter 1:2",
        "Splitter 1:4",
        "Splitter 1:8",
        "Splitter 1:16",

        "2C (METER)",
        "12C (Meter)",
        "24C (Meter)",
        "48C (Meter)",
        "96C (Meter)",

        "DPFO",

        "12C DOME (UNIT)",
        "24C DOME (UNIT)",
        "48C DOME (UNIT)",
        "96C DOME (UNIT)",
        "144C DOME (UNIT)",

        "12C INLANE (Unit)",
        "24C INLANE (Unit)",

        "48C INLINE (Unit)",
        "96C INLINE (Unit)",
        "144C INLINE (Unit)",

        "Fixing Slack",
        "Kaset JB",

        "Terminal Roset (Unit)",

        "Tiang 7 (Batang)",
        "Tiang 9 (Batang)",

        "Subduct",

        "Handhole 40 x 40",
        "Handhole 60 x 60",
        "Handhole 80 x 80",

        "Dead End"

    ];


    /* =====================================================
       EXCLUDED MATERIAL
    ===================================================== */

    const EXCLUDED_MATERIAL_PATTERNS = [

        "alcohol",
        "alkohol",

        "tisu",
        "tissue",

        "wet tissue",
        "dry tissue",

        "sleeve protector",
        "sleeve protect",
        "sleeve protection",

        "protector sleeve",
        "protective sleeve",

        "fiber sleeve",
        "splice sleeve",
        "heat sleeve",
        "heat shrink sleeve",

        "protection",
        "protector",
        "protective"

    ];


    /* =====================================================
       TT NUMBER COLUMN

       Excel:
       A = 0
       B = 1
       C = 2
       D = 3

       TT Number = kolom D
    ===================================================== */

    const TT_NUMBER_COLUMN_INDEX = 3;


    /* =====================================================
       MATCHING CONFIG
    ===================================================== */

    const MATCH_CONFIG = {

        minimumScore: 0.82,

        longTokenMinimum: 0.78,

        mediumTokenMinimum: 0.84,

        shortTokenMinimum: 0.92

    };


    /* =====================================================
       GET MATERIAL MASTER FROM SETTINGS.JS
       
       settings.js memiliki:

       materialStartPhrases

       Tetapi daftar contoh user adalah nama material.
       
       Karena itu parser juga mendukung field:
       
       materialMaster
       materialList
       materials
       materialNames

       Jika field tersebut tersedia di settings.js,
       akan dipakai.

       Jika belum ada, fallback digunakan.
    ===================================================== */

    function getSettings() {

        try {

            if (
                window.ReportCheckerSettings &&
                typeof
                    window.ReportCheckerSettings.get ===
                    "function"
            ) {

                return (
                    window.ReportCheckerSettings.get()
                );

            }

        } catch (error) {

            console.error(
                "Gagal membaca ReportCheckerSettings:",
                error
            );

        }

        return null;

    }


    /* =====================================================
       GET MATERIAL MASTER
    ===================================================== */

    function getMaterialMaster() {

        const settings =
            getSettings();


        if (settings) {

            /*
             * Prioritas 1:
             * materialMaster
             */

            if (
                Array.isArray(
                    settings.materialMaster
                ) &&
                settings.materialMaster.length
            ) {

                return cleanMaterialMaster(
                    settings.materialMaster
                );

            }


            /*
             * Prioritas 2:
             * materialList
             */

            if (
                Array.isArray(
                    settings.materialList
                ) &&
                settings.materialList.length
            ) {

                return cleanMaterialMaster(
                    settings.materialList
                );

            }


            /*
             * Prioritas 3:
             * materials
             */

            if (
                Array.isArray(
                    settings.materials
                ) &&
                settings.materials.length
            ) {

                return cleanMaterialMaster(
                    settings.materials
                );

            }


            /*
             * Prioritas 4:
             * materialNames
             */

            if (
                Array.isArray(
                    settings.materialNames
                ) &&
                settings.materialNames.length
            ) {

                return cleanMaterialMaster(
                    settings.materialNames
                );

            }

        }


        /*
         * Jika settings.js belum memiliki
         * field master material,
         * gunakan fallback.
         */

        return FALLBACK_MATERIAL_MASTER.slice();

    }


    /* =====================================================
       CLEAN MATERIAL MASTER
    ===================================================== */

    function cleanMaterialMaster(
        list
    ) {

        if (
            !Array.isArray(list)
        ) {

            return [];

        }


        const output = [];

        const seen = new Set();


        for (
            const item
            of list
        ) {

            const value =
                normalizeLine(
                    item
                );


            if (!value) {

                continue;

            }


            const key =
                normalizeMaterialName(
                    value
                );


            if (!key) {

                continue;

            }


            if (
                seen.has(key)
            ) {

                continue;

            }


            seen.add(key);

            output.push(
                value
            );

        }


        return output;

    }


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

        return normalizeText(value)

            .replace(/\s+/g, " ")

            .trim();

    }


    /* =====================================================
       NORMALIZE MATERIAL NAME
    ===================================================== */

    function normalizeMaterialName(value) {

        if (!value) {

            return "";

        }

        return normalizeLine(value)

            .toLowerCase()

            .replace(/\s*x\s*/gi, "x")

            .replace(/\s*:\s*/g, ":")

            .replace(
                /(\d+)\s*\/\s*(\d+)/g,
                "$1:$2"
            )

            .replace(/[()]/g, " ")

            .replace(/["']/g, "")

            .replace(/[_\-]+/g, " ")

            .replace(/\s+/g, " ")

            .trim();

    }


    /* =====================================================
       CHECK EXCLUDED
    ===================================================== */

    function isExcludedMaterial(value) {

        const normalized =
            normalizeMaterialName(value);


        if (!normalized) {

            return true;

        }


        for (
            const excluded
            of EXCLUDED_MATERIAL_PATTERNS
        ) {

            const normalizedExcluded =
                normalizeMaterialName(
                    excluded
                );


            if (
                normalized.includes(
                    normalizedExcluded
                )
            ) {

                return true;

            }

        }


        return false;

    }


    /* =====================================================
       TOKENIZE
    ===================================================== */

    function tokenize(value) {

        const normalized =
            normalizeMaterialName(value);


        if (!normalized) {

            return [];

        }


        return normalized

            .split(/\s+/)

            .filter(Boolean);

    }


    /* =====================================================
       LEVENSHTEIN
    ===================================================== */

    function levenshtein(a, b) {

        a = String(a || "");
        b = String(b || "");


        if (a === b) {

            return 0;

        }


        if (!a.length) {

            return b.length;

        }


        if (!b.length) {

            return a.length;

        }


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

                            matrix[i - 1][j] + 1,

                            matrix[i][j - 1] + 1,

                            matrix[i - 1][j - 1] + 1

                        );

                }

            }

        }


        return matrix[b.length][a.length];

    }


    /* =====================================================
       SIMILARITY
    ===================================================== */

    function similarity(a, b) {

        const left =
            normalizeMaterialName(a);

        const right =
            normalizeMaterialName(b);


        if (
            !left ||
            !right
        ) {

            return 0;

        }


        if (
            left === right
        ) {

            return 1;

        }


        const distance =
            levenshtein(
                left,
                right
            );


        const maxLength =
            Math.max(
                left.length,
                right.length
            );


        if (!maxLength) {

            return 0;

        }


        return 1 -
            (
                distance /
                maxLength
            );

    }


    /* =====================================================
       TOKEN SCORE
    ===================================================== */

    function tokenSimilarity(
        sourceToken,
        targetToken
    ) {

        const source =
            String(
                sourceToken || ""
            ).toLowerCase();


        const target =
            String(
                targetToken || ""
            ).toLowerCase();


        if (
            !source ||
            !target
        ) {

            return 0;

        }


        /*
         * Angka wajib exact.
         */

        if (
            /^\d+$/.test(target)
        ) {

            return source === target
                ? 1
                : 0;

        }


        if (
            source === target
        ) {

            return 1;

        }


        return similarity(
            source,
            target
        );

    }


    /* =====================================================
       MATERIAL MATCH SCORE
    ===================================================== */

    function materialMatchScore(
        input,
        master
    ) {

        const source =
            normalizeMaterialName(
                input
            );


        const target =
            normalizeMaterialName(
                master
            );


        if (
            !source ||
            !target
        ) {

            return 0;

        }


        if (
            source === target
        ) {

            return 1;

        }


        const sourceTokens =
            tokenize(source);


        const targetTokens =
            tokenize(target);


        if (
            !sourceTokens.length ||
            !targetTokens.length
        ) {

            return 0;

        }


        let matchedCount = 0;

        let scoreTotal = 0;


        for (
            const targetToken
            of targetTokens
        ) {

            let bestScore = 0;


            for (
                const sourceToken
                of sourceTokens
            ) {

                const score =
                    tokenSimilarity(
                        sourceToken,
                        targetToken
                    );


                if (
                    score >
                    bestScore
                ) {

                    bestScore =
                        score;

                }

            }


            let minimumScore;


            if (
                targetToken.length <= 3
            ) {

                minimumScore =
                    MATCH_CONFIG
                        .shortTokenMinimum;

            } else if (
                targetToken.length <= 5
            ) {

                minimumScore =
                    MATCH_CONFIG
                        .mediumTokenMinimum;

            } else {

                minimumScore =
                    MATCH_CONFIG
                        .longTokenMinimum;

            }


            if (
                bestScore >=
                minimumScore
            ) {

                matchedCount++;

                scoreTotal +=
                    bestScore;

            } else {

                return 0;

            }

        }


        if (
            matchedCount !==
            targetTokens.length
        ) {

            return 0;

        }


        const tokenScore =
            scoreTotal /
            targetTokens.length;


        if (
            sourceTokens.length >
            targetTokens.length + 2
        ) {

            return 0;

        }


        return tokenScore;

    }


    /* =====================================================
       FIND BEST MATERIAL
    ===================================================== */

    function findBestMaterial(input) {

        if (!input) {

            return null;

        }


        if (
            isExcludedMaterial(
                input
            )
        ) {

            return null;

        }


        const source =
            normalizeMaterialName(
                input
            );


        if (!source) {

            return null;

        }


        /*
         * MASTER MATERIAL DARI SETTINGS.JS
         */

        const materialMaster =
            getMaterialMaster();


        let best = null;

        let bestScore = 0;


        for (
            const master
            of materialMaster
        ) {

            const score =
                materialMatchScore(
                    source,
                    master
                );


            if (
                score >
                bestScore
            ) {

                bestScore =
                    score;

                best =
                    master;

            }

        }


        if (
            !best ||
            bestScore <
            MATCH_CONFIG.minimumScore
        ) {

            return null;

        }


        return {

            material:
                best,

            score:
                bestScore

        };

    }


    /* =====================================================
       GET TT NUMBER
    ===================================================== */

    function getTTNumber(row) {

        if (!row) {

            return "";

        }


        /* ================================================
           1. ARRAY
        ================================================ */

        if (
            Array.isArray(row)
        ) {

            const value =
                normalizeLine(
                    row[
                        TT_NUMBER_COLUMN_INDEX
                    ]
                );


            if (value) {

                return value;

            }

        }


        /* ================================================
           2. OBJECT
        ================================================ */

        if (
            typeof row === "object"
        ) {

            const possibleFields = [

                "TT Number",
                "TT number",
                "TT NUMBER",

                "TT_Number",
                "TT_NUMBER",

                "tt_number",

                "TTNumber",
                "ttNumber",

                "TT No",
                "TT NO",

                "TT No.",
                "TT NO.",

                "Ticket Number",
                "Ticket number",

                "ticketNumber",
                "ticket_number",

                "Ticket",
                "ticket"

            ];


            for (
                const field
                of possibleFields
            ) {

                if (
                    Object.prototype
                        .hasOwnProperty
                        .call(
                            row,
                            field
                        )
                ) {

                    const value =
                        normalizeLine(
                            row[field]
                        );


                    if (value) {

                        return value;

                    }

                }

            }

        }


        /* ================================================
           3. originalRow
        ================================================ */

        if (
            row.originalRow
        ) {

            const original =
                getTTNumber(
                    row.originalRow
                );


            if (original) {

                return original;

            }

        }


        /* ================================================
           4. source
        ================================================ */

        if (
            row.source
        ) {

            const source =
                getTTNumber(
                    row.source
                );


            if (source) {

                return source;

            }

        }


        /* ================================================
           5. nested row
        ================================================ */

        if (
            row.row
        ) {

            const nested =
                getTTNumber(
                    row.row
                );


            if (nested) {

                return nested;

            }

        }


        return "";

    }


    /* =====================================================
       GET CIR VALUE
    ===================================================== */

    function getCIRValue(
        row,
        cirField
    ) {

        if (!row) {

            return "";

        }


        /* ================================================
           ARRAY + numeric index
        ================================================ */

        if (
            Array.isArray(row) &&
            typeof cirField === "number"
        ) {

            return normalizeText(
                row[cirField]
            );

        }


        /* ================================================
           OBJECT + CUSTOM FIELD
        ================================================ */

        if (
            !Array.isArray(row) &&
            cirField
        ) {

            const value =
                row[cirField];


            if (
                value !== undefined &&
                value !== null
            ) {

                return normalizeText(
                    value
                );

            }

        }


        /* ================================================
           OBJECT FIELD CIR
        ================================================ */

        if (
            !Array.isArray(row)
        ) {

            const fields = [

                "CIR",
                "cir",
                "Cir",

                "CIR Text",
                "CIR_TEXT",

                "cirText",
                "cir_text"

            ];


            for (
                const field
                of fields
            ) {

                if (
                    row[field] !==
                    undefined &&
                    row[field] !==
                    null
                ) {

                    return normalizeText(
                        row[field]
                    );

                }

            }

        }


        return "";

    }


    /* =====================================================
       NORMALIZE NUMBER
    ===================================================== */

    function normalizeNumber(value) {

        if (
            value === null ||
            value === undefined
        ) {

            return 0;

        }


        const normalized =
            String(value)

                .replace(",", ".")

                .trim();


        const result =
            Number(
                normalized
            );


        return Number.isFinite(
            result
        )
            ? result
            : 0;

    }


    /* =====================================================
       PARSE QTY
    ===================================================== */

    function parseQty(text) {

        if (!text) {

            return 1;

        }


        const value =
            normalizeLine(text);


        let match =
            value.match(
                /(?:qty|quantity|jumlah)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i
            );


        if (match) {

            return normalizeNumber(
                match[1]
            );

        }


        match =
            value.match(
                /(?:^|\s)(\d+(?:[.,]\d+)?)\s*(?:pcs?|piece|unit|batang|m|meter|metre)\b/i
            );


        if (match) {

            return normalizeNumber(
                match[1]
            );

        }


        match =
            value.match(
                /[:=]\s*(\d+(?:[.,]\d+)?)\s*$/i
            );


        if (match) {

            return normalizeNumber(
                match[1]
            );

        }


        return 1;

    }


    /* =====================================================
       PARSE SATUAN
    ===================================================== */

    function parseSatuan(
        text,
        material
    ) {

        const value =
            normalizeLine(text);


        const match =
            value.match(
                /\b(pcs?|piece|unit|batang|m|meter|metre)\b/i
            );


        if (match) {

            const unit =
                match[1]
                    .toLowerCase();


            if (
                unit === "pc" ||
                unit === "pcs" ||
                unit === "piece"
            ) {

                return "pcs";

            }


            if (
                unit === "unit"
            ) {

                return "unit";

            }


            if (
                unit === "batang"
            ) {

                return "batang";

            }


            if (
                unit === "m" ||
                unit === "meter" ||
                unit === "metre"
            ) {

                return "m";

            }

        }


        const normalized =
            normalizeMaterialName(
                material
            );


        if (
            normalized.includes(
                "meter"
            )
        ) {

            return "m";

        }


        if (
            normalized.includes(
                "batang"
            )
        ) {

            return "batang";

        }


        if (
            normalized.includes(
                "unit"
            )
        ) {

            return "unit";

        }


        return "pcs";

    }


    /* =====================================================
       CLEAN MATERIAL TEXT
    ===================================================== */

    function cleanMaterialText(line) {

        return normalizeLine(line)

            .replace(
                /\bqty\b\s*[:=]?\s*\d+(?:[.,]\d+)?/gi,
                " "
            )

            .replace(
                /\bquantity\b\s*[:=]?\s*\d+(?:[.,]\d+)?/gi,
                " "
            )

            .replace(
                /\bjumlah\b\s*[:=]?\s*\d+(?:[.,]\d+)?/gi,
                " "
            )

            .replace(
                /\b\d+(?:[.,]\d+)?\s*(?:pcs?|piece|unit|batang|m|meter|metre)\b/gi,
                " "
            )

            .replace(
                /[:=]\s*\d+(?:[.,]\d+)?\s*$/i,
                " "
            )

            .replace(
                /\s+/g,
                " "
            )

            .trim();

    }


    /* =====================================================
       EXTRACT MATERIAL CANDIDATES
       
       INI BAGIAN PENTING.

       CIR bisa menulis:

       matrial
       protek:1
       pigtail:1

       atau:

       material
       Pigtail:1
       Patchcord:2

       Parser tidak lagi menganggap seluruh baris
       sebagai nama material.

       Parser mencoba mencocokkan setiap bagian
       terhadap MASTER LIST dari settings.js.
    ===================================================== */

    function extractMaterialCandidates(
        line
    ) {

        const candidates = [];

        const originalLine =
            normalizeLine(line);


        if (!originalLine) {

            return candidates;

        }


        /*
         * Coba seluruh baris dahulu.
         */

        candidates.push(
            originalLine
        );


        /*
         * Pecah berdasarkan separator umum.
         *
         * Contoh:
         *
         * Pigtail:1
         * Pigtail - 1
         * Pigtail = 1
         */

        const separated =
            originalLine.split(
                /\s*(?:,|;|\||\/)\s*/
            );


        for (
            const part
            of separated
        ) {

            if (
                part &&
                !candidates.includes(part)
            ) {

                candidates.push(
                    part
                );

            }

        }


        /*
         * Coba hapus quantity.
         */

        const cleaned =
            cleanMaterialText(
                originalLine
            );


        if (
            cleaned &&
            !candidates.includes(
                cleaned
            )
        ) {

            candidates.push(
                cleaned
            );

        }


        return candidates;

    }


    /* =====================================================
       FIND MATERIALS INSIDE LINE
       
       Ini memungkinkan:
       
       "protek:1 pigtail:1"

       tetap menemukan Pigtail.

       Tetapi hasil akhirnya HARUS salah satu dari
       MASTER LIST settings.js.
    ===================================================== */

    function findMaterialsInLine(
        line
    ) {

        const master =
            getMaterialMaster();


        if (
            !master.length
        ) {

            return [];

        }


        const originalLine =
            normalizeLine(line);


        if (!originalLine) {

            return [];

        }


        /*
         * Excluded langsung ditolak.
         */

        if (
            isExcludedMaterial(
                originalLine
            )
        ) {

            return [];

        }


        const found = [];


        /*
         * Cari setiap material MASTER di dalam
         * tulisan CIR.
         */

        for (
            const material
            of master
        ) {

            if (
                isExcludedMaterial(
                    material
                )
            ) {

                continue;

            }


            const normalizedMaster =
                normalizeMaterialName(
                    material
                );


            if (!normalizedMaster) {

                continue;

            }


            /*
             * Exact / normalized match
             */

            const normalizedLine =
                normalizeMaterialName(
                    originalLine
                );


            if (
                normalizedLine.includes(
                    normalizedMaster
                )
            ) {

                found.push({

                    material:
                        material,

                    score:
                        1

                });

                continue;

            }


            /*
             * Coba setiap candidate.
             */

            const candidates =
                extractMaterialCandidates(
                    originalLine
                );


            let bestScore = 0;


            for (
                const candidate
                of candidates
            ) {

                const result =
                    materialMatchScore(
                        candidate,
                        material
                    );


                if (
                    result >
                    bestScore
                ) {

                    bestScore =
                        result;

                }

            }


            if (
                bestScore >=
                MATCH_CONFIG.minimumScore
            ) {

                found.push({

                    material:
                        material,

                    score:
                        bestScore

                });

            }

        }


        /*
         * Hilangkan duplicate.
         */

        const map =
            new Map();


        for (
            const item
            of found
        ) {

            const key =
                normalizeMaterialName(
                    item.material
                );


            if (
                !map.has(key)
            ) {

                map.set(
                    key,
                    item
                );

            } else {

                const existing =
                    map.get(key);


                if (
                    item.score >
                    existing.score
                ) {

                    existing.score =
                        item.score;

                }

            }

        }


        return Array.from(
            map.values()
        );

    }


    /* =====================================================
       PARSE MATERIAL LINE
    ===================================================== */

    function parseMaterialLine(line) {

        const originalLine =
            normalizeLine(line);


        if (!originalLine) {

            return [];

        }


        /*
         * Heading material tidak dihitung.
         */

        if (
            /^material\s*:?\s*$/i.test(
                originalLine
            ) ||
            /^matrial\s*:?\s*$/i.test(
                originalLine
            )
        ) {

            return [];

        }


        /*
         * Cari material berdasarkan MASTER LIST.
         */

        const found =
            findMaterialsInLine(
                originalLine
            );


        if (
            !found.length
        ) {

            return [];

        }


        const results = [];


        for (
            const item
            of found
        ) {

            const qty =
                parseQty(
                    originalLine
                );


            const satuan =
                parseSatuan(
                    originalLine,
                    item.material
                );


            results.push({

                material:
                    item.material,

                qty:
                    qty,

                satuan:
                    satuan,

                score:
                    item.score,

                sourceLine:
                    originalLine,

                status:
                    "OK",

                error:
                    ""

            });

        }


        return results;

    }


    /* =====================================================
       PARSE MATERIAL TEXT
    ===================================================== */

    function parseMaterialText(text) {

        const normalized =
            normalizeText(text);


        if (!normalized) {

            return [];

        }


        const lines =
            normalized.split("\n");


        const results = [];


        for (
            const line
            of lines
        ) {

            const parsed =
                parseMaterialLine(
                    line
                );


            if (!parsed) {

                continue;

            }


            results.push(
                ...parsed
            );

        }


        return mergeMaterials(
            results
        );

    }


    /* =====================================================
       PARSE DETAILED
    ===================================================== */

    function parseDetailed(text) {

        const normalized =
            normalizeText(text);


        if (!normalized) {

            return {

                materials: [],

                errors: []

            };

        }


        const lines =
            normalized.split("\n");


        const materials = [];

        const errors = [];


        for (
            const line
            of lines
        ) {

            const parsed =
                parseMaterialLine(
                    line
                );


            if (!parsed) {

                continue;

            }


            materials.push(
                ...parsed
            );

        }


        return {

            materials:
                mergeMaterials(
                    materials
                ),

            errors:
                errors

        };

    }


    /* =====================================================
       MERGE MATERIAL
    ===================================================== */

    function mergeMaterials(materials) {

        const map =
            new Map();


        for (
            const item
            of materials || []
        ) {

            if (!item) {

                continue;

            }


            if (
                !item.material
            ) {

                continue;

            }


            if (
                isExcludedMaterial(
                    item.material
                )
            ) {

                continue;

            }


            const key =
                normalizeMaterialName(
                    item.material
                );


            if (
                !map.has(key)
            ) {

                map.set(
                    key,
                    {

                        material:
                            item.material,

                        qty:
                            Number(
                                item.qty
                            ) || 0,

                        satuan:
                            item.satuan ||
                            "pcs",

                        score:
                            Number(
                                item.score
                            ) || 0,

                        sourceLine:
                            item.sourceLine ||
                            "",

                        status:
                            "OK",

                        error:
                            ""

                    }
                );

            } else {

                const existing =
                    map.get(key);


                existing.qty +=
                    Number(
                        item.qty
                    ) || 0;


                existing.score =
                    Math.max(

                        existing.score || 0,

                        item.score || 0

                    );


                if (
                    !existing.sourceLine &&
                    item.sourceLine
                ) {

                    existing.sourceLine =
                        item.sourceLine;

                }

            }

        }


        return Array.from(
            map.values()
        );

    }


    /* =====================================================
       BUILD MATERIAL ROW
    ===================================================== */

    function buildMaterialRows(
        row,
        cirField
    ) {

        const ttNumber =
            getTTNumber(
                row
            );


        const cirText =
            getCIRValue(
                row,
                cirField
            );


        const materials =
            parseMaterialText(
                cirText
            );


        return materials.map(
            function (item) {

                return {

                    ticket:
                        ttNumber,

                    ttNumber:
                        ttNumber,

                    Ticket:
                        ttNumber,

                    "TT Number":
                        ttNumber,


                    material:
                        item.material,

                    Material:
                        item.material,


                    quantity:
                        item.qty,

                    qty:
                        item.qty,

                    Qty:
                        item.qty,


                    unit:
                        item.satuan,

                    satuan:
                        item.satuan,

                    Satuan:
                        item.satuan,


                    code:
                        "",

                    kode:
                        "",

                    Kode:
                        "",


                    score:
                        item.score,

                    Score:
                        item.score,


                    source:
                        item.sourceLine,

                    Source:
                        item.sourceLine,


                    status:
                        "OK",

                    error:
                        ""

                };

            }
        );

    }


    /* =====================================================
       PARSE MULTIPLE
    ===================================================== */

    function parseMultiple(
        rows,
        cirField
    ) {

        if (
            !Array.isArray(rows)
        ) {

            return [];

        }


        const output = [];


        for (
            const row
            of rows
        ) {

            const materialRows =
                buildMaterialRows(
                    row,
                    cirField
                );


            output.push(
                ...materialRows
            );

        }


        return output;

    }


    /* =====================================================
       PARSE WITH TICKET
    ===================================================== */

    function parseWithTicket(
        ticket,
        cirText
    ) {

        const ttNumber =
            normalizeLine(
                ticket
            );


        const materials =
            parseMaterialText(
                cirText
            );


        return materials.map(
            function (item) {

                return {

                    ticket:
                        ttNumber,

                    ttNumber:
                        ttNumber,

                    Ticket:
                        ttNumber,

                    "TT Number":
                        ttNumber,


                    material:
                        item.material,

                    Material:
                        item.material,


                    quantity:
                        item.qty,

                    qty:
                        item.qty,

                    Qty:
                        item.qty,


                    unit:
                        item.satuan,

                    satuan:
                        item.satuan,

                    Satuan:
                        item.satuan,


                    code:
                        "",

                    kode:
                        "",

                    Kode:
                        "",


                    score:
                        item.score,

                    Score:
                        item.score,


                    source:
                        item.sourceLine,

                    Source:
                        item.sourceLine,


                    status:
                        "OK",

                    error:
                        ""

                };

            }
        );

    }


    /* =====================================================
       FLATTEN
    ===================================================== */

    function flatten(input) {

        if (
            input === null ||
            input === undefined
        ) {

            return [];

        }


        if (
            !Array.isArray(input) &&
            typeof input === "object"
        ) {

            if (
                Array.isArray(
                    input.materials
                )
            ) {

                return flatten(
                    input.materials
                );

            }


            if (
                Array.isArray(
                    input.material
                )
            ) {

                return flatten(
                    input.material
                );

            }


            if (
                input.Material ||
                input.material
            ) {

                return [

                    normalizeMaterialRow(
                        input
                    )

                ];

            }


            return [];

        }


        if (
            Array.isArray(input)
        ) {

            const output = [];


            for (
                const item
                of input
            ) {

                if (
                    item === null ||
                    item === undefined
                ) {

                    continue;

                }


                if (
                    Array.isArray(item)
                ) {

                    output.push(
                        ...flatten(
                            item
                        )
                    );

                    continue;

                }


                if (
                    typeof item === "object" &&
                    (
                        Array.isArray(
                            item.materials
                        ) ||
                        Array.isArray(
                            item.material
                        )
                    )
                ) {

                    output.push(
                        ...flatten(
                            item
                        )
                    );

                    continue;

                }


                if (
                    typeof item === "object"
                ) {

                    output.push(
                        normalizeMaterialRow(
                            item
                        )
                    );

                }

            }


            return output;

        }


        return [];

    }


    /* =====================================================
       NORMALIZE MATERIAL ROW
    ===================================================== */

    function normalizeMaterialRow(row) {

        if (!row) {

            return {};

        }


        const ticket =
            getTTNumber(
                row
            );


        const material =
            normalizeLine(
                row.material ||
                row.Material ||
                ""
            );


        const qty =
            row.quantity ??
            row.qty ??
            row.Qty ??
            1;


        const unit =
            normalizeLine(
                row.unit ||
                row.satuan ||
                row.Satuan ||
                ""
            );


        const code =
            normalizeLine(
                row.code ||
                row.kode ||
                row.Kode ||
                ""
            );


        const score =
            Number(
                row.score ??
                row.Score ??
                0
            ) || 0;


        const source =
            normalizeLine(
                row.source ||
                row.Source ||
                row.sourceLine ||
                ""
            );


        return {

            ticket:
                ticket,

            ttNumber:
                ticket,

            Ticket:
                ticket,

            "TT Number":
                ticket,


            material:
                material,

            Material:
                material,


            quantity:
                Number(qty) || 0,

            qty:
                Number(qty) || 0,

            Qty:
                Number(qty) || 0,


            unit:
                unit,

            satuan:
                unit,

            Satuan:
                unit,


            code:
                code,

            kode:
                code,

            Kode:
                code,


            score:
                score,

            Score:
                score,


            source:
                source,

            Source:
                source,


            status:
                row.status ||
                "OK",

            error:
                row.error ||
                ""

        };

    }


    /* =====================================================
       PUBLIC API
    ===================================================== */

    window.ReportCheckerMaterial = {

        parse:
            parseMaterialText,

        parseDetailed:
            parseDetailed,

        parseMultiple:
            parseMultiple,

        parseWithTicket:
            parseWithTicket,

        buildRows:
            buildMaterialRows,

        flatten:
            flatten,

        getTTNumber:
            getTTNumber,

        getCIRValue:
            getCIRValue,

        getMaterialMaster:
            getMaterialMaster,

        findBestMaterial:
            findBestMaterial,

        isExcludedMaterial:
            isExcludedMaterial,

        normalizeMaterialName:
            normalizeMaterialName,

        parseQty:
            parseQty,

        parseSatuan:
            parseSatuan,

        mergeMaterials:
            mergeMaterials,

        cleanMaterialText:
            cleanMaterialText,

        findMaterialsInLine:
            findMaterialsInLine

    };


    /* =====================================================
       DEBUG
    ===================================================== */

    console.log(
        "ReportCheckerMaterial loaded.",
        {

            masterCount:
                getMaterialMaster().length,

            masterSource:
                (
                    window.ReportCheckerSettings
                        ? "settings.js"
                        : "fallback"
                ),

            minimumScore:
                MATCH_CONFIG.minimumScore,

            ttNumberColumn:
                "D",

            ttNumberIndex:
                TT_NUMBER_COLUMN_INDEX,

            hasFlatten:
                typeof window
                    .ReportCheckerMaterial
                    .flatten ===
                "function",

            hasParseDetailed:
                typeof window
                    .ReportCheckerMaterial
                    .parseDetailed ===
                "function",

            hasGetTTNumber:
                typeof window
                    .ReportCheckerMaterial
                    .getTTNumber ===
                "function"

        }
    );


})();
