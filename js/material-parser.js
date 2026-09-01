/* =========================================================
   REPORT CHECKER
   material-parser.js

   VERSION:
   - Strict Material Matching
   - Material hanya dari MASTER LIST
   - Typo ringan masih diterima
   - Material yang tidak cukup mirip ditolak
   - Material excluded tidak pernah masuk hasil
   - Ticket Material = TT Number / kolom D
   - Customer Ticket tidak digunakan sebagai Ticket
   - Support CIR object maupun array
   - Support parse()
   - Support parseMultiple()
   - Support parseWithTicket()
   - Support buildRows()
   - Support flatten()
   - Support parseDetailed()
========================================================= */

(function () {

    "use strict";


    /* =====================================================
       MATERIAL MASTER LIST
    ===================================================== */

    const MATERIAL_MASTER = [

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

        "24C INLINE (Unit)",

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

        /*
         * Exact = 1.00
         */

        minimumScore: 0.82,

        /*
         * Typo untuk kata panjang.
         */

        longTokenMinimum: 0.78,

        /*
         * Token 4-5 karakter.
         */

        mediumTokenMinimum: 0.84,

        /*
         * Token pendek harus sangat mirip.
         */

        shortTokenMinimum: 0.92

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

            /*
             * 40 x 40
             * 40x40
             */
            .replace(/\s*x\s*/gi, "x")

            /*
             * 1:8
             * 1 : 8
             */
            .replace(/\s*:\s*/g, ":")

            /*
             * 1 / 8 dianggap 1:8
             */
            .replace(
                /(\d+)\s*\/\s*(\d+)/g,
                "$1:$2"
            )

            /*
             * Hilangkan tanda kurung.
             */
            .replace(/[()]/g, " ")

            /*
             * Hilangkan quote.
             */
            .replace(/["']/g, "")

            /*
             * Hyphen / underscore
             */
            .replace(/[_\-]+/g, " ")

            /*
             * Rapikan.
             */
            .replace(/\s+/g, " ")

            .trim();

    }


    /* =====================================================
       CHECK EXCLUDED
    ===================================================== */

    function isExcludedMaterial(value) {

        const normalized =
            normalizeMaterialName(
                value
            );

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
            normalizeMaterialName(
                value
            );

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

        /*
         * Jangan gunakan includes di sini
         * sebagai penentu utama.
         */

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
         *
         * 1 != 2
         * 12 != 24
         */
        if (
            /^\d+$/.test(target)
        ) {

            return source === target
                ? 1
                : 0;

        }

        /*
         * Exact token.
         */
        if (
            source === target
        ) {

            return 1;

        }

        /*
         * Typo ringan.
         */
        return similarity(
            source,
            target
        );

    }


    /* =====================================================
       MATERIAL MATCH SCORE
       
       STRICT MODE
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

        /*
         * EXACT
         */
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

        /*
         * Special case:
         *
         * target = pigtail
         * source = pigtail 10
         *
         * Setelah quantity dibuang,
         * biasanya source sudah pigtail.
         */

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

                /*
                 * Semua token master wajib cocok.
                 */
                return 0;

            }

        }

        /*
         * Semua token master harus ketemu.
         */
        if (
            matchedCount !==
            targetTokens.length
        ) {

            return 0;

        }

        const tokenScore =
            scoreTotal /
            targetTokens.length;

        /*
         * Untuk source yang jauh lebih panjang
         * dari master, jangan terlalu mudah menerima.
         */
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

        /*
         * Excluded material langsung reject.
         */
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

        let best = null;

        let bestScore = 0;

        for (
            const master
                of MATERIAL_MASTER
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

        /*
         * Tidak cukup mirip.
         */
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
       
       PRIORITAS:
       1. Array index D
       2. Object TT Number
       3. originalRow
       4. source
    ===================================================== */

    function getTTNumber(row) {

        if (!row) {

            return "";

        }

        /*
         * Array
         */
        if (
            Array.isArray(row)
        ) {

            return normalizeLine(
                row[
                    TT_NUMBER_COLUMN_INDEX
                ]
            );

        }

        /*
         * Object
         */
        const possibleFields = [

            "TT Number",
            "TT number",
            "TT_NUMBER",
            "tt_number",
            "TTNumber",
            "ttNumber"

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

        /*
         * originalRow
         */
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

        /*
         * source
         */
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

        /*
         * Array + numeric index.
         */
        if (
            Array.isArray(row) &&
            typeof cirField === "number"
        ) {

            return normalizeText(
                row[cirField]
            );

        }

        /*
         * Object + custom field.
         */
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

        /*
         * Object field CIR.
         */
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
            normalizeLine(
                text
            );

        let match =
            value.match(
                /(?:qty|quantity|jumlah)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i
            );

        if (match) {

            return normalizeNumber(
                match[1]
            );

        }

        /*
         * Contoh:
         *
         * Pigtail 10 pcs
         */
        match =
            value.match(
                /(?:^|\s)(\d+(?:[.,]\d+)?)\s*(?:pcs?|piece|unit|batang|m|meter|metre)\b/i
            );

        if (match) {

            return normalizeNumber(
                match[1]
            );

        }

        /*
         * Contoh:
         *
         * Pigtail : 10
         */
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
            normalizeLine(
                text
            );

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

    function cleanMaterialText(
        line
    ) {

        return normalizeLine(line)

            /*
             * Qty 10
             */
            .replace(
                /\bqty\b\s*[:=]?\s*\d+(?:[.,]\d+)?/gi,
                " "
            )

            /*
             * Quantity 10
             */
            .replace(
                /\bquantity\b\s*[:=]?\s*\d+(?:[.,]\d+)?/gi,
                " "
            )

            /*
             * Jumlah 10
             */
            .replace(
                /\bjumlah\b\s*[:=]?\s*\d+(?:[.,]\d+)?/gi,
                " "
            )

            /*
             * 10 pcs
             * 10 unit
             * 10 meter
             */
            .replace(
                /\b\d+(?:[.,]\d+)?\s*(?:pcs?|piece|unit|batang|m|meter|metre)\b/gi,
                " "
            )

            /*
             * : 10
             * = 10
             */
            .replace(
                /[:=]\s*\d+(?:[.,]\d+)?\s*$/i,
                " "
            )

            /*
             * Rapikan.
             */
            .replace(
                /\s+/g,
                " "
            )

            .trim();

    }


    /* =====================================================
       PARSE MATERIAL LINE
       
       HANYA RETURN material kalau cocok MASTER.
    ===================================================== */

    function parseMaterialLine(line) {

        const originalLine =
            normalizeLine(line);

        if (!originalLine) {

            return null;

        }

        /*
         * Heading.
         */
        if (
            /^material\s*:?\s*$/i.test(
                originalLine
            )
        ) {

            return null;

        }

        /*
         * Excluded.
         */
        if (
            isExcludedMaterial(
                originalLine
            )
        ) {

            return {

                material: null,

                qty: 0,

                satuan: "",

                score: 0,

                sourceLine:
                    originalLine,

                status:
                    "ERROR",

                error:
                    "Material excluded"

            };

        }

        const materialText =
            cleanMaterialText(
                originalLine
            );

        /*
         * Jangan mencoba material kosong.
         */
        if (!materialText) {

            return null;

        }

        const result =
            findBestMaterial(
                materialText
            );

        /*
         * Tidak ditemukan di master.
         */
        if (!result) {

            return {

                material: null,

                qty: 0,

                satuan: "",

                score: 0,

                sourceLine:
                    originalLine,

                status:
                    "ERROR",

                error:
                    "Material tidak ditemukan di MASTER LIST"

            };

        }

        const qty =
            parseQty(
                originalLine
            );

        const satuan =
            parseSatuan(
                originalLine,
                result.material
            );

        return {

            material:
                result.material,

            qty:
                qty,

            satuan:
                satuan,

            score:
                result.score,

            sourceLine:
                originalLine,

            status:
                "OK",

            error:
                ""

        };

    }


    /* =====================================================
       PARSE MATERIAL TEXT
       
       HANYA MATERIAL VALID YANG DIRETURN.
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

            /*
             * ERROR tidak masuk
             * ke hasil utama.
             */
            if (
                parsed.status !== "OK"
            ) {

                continue;

            }

            results.push(
                parsed
            );

        }

        return mergeMaterials(
            results
        );

    }


    /* =====================================================
       PARSE DETAILED
       
       Sama seperti parse(), tetapi menampilkan
       material valid + error.
       
       Berguna untuk debugging/report checker.
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

            if (
                parsed.status ===
                "OK"
            ) {

                materials.push(
                    parsed
                );

            } else {

                errors.push(
                    parsed
                );

            }

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

    function mergeMaterials(
        materials
    ) {

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
                    map.get(
                        key
                    );

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
       
       Compatibility excel.js
    ===================================================== */

    function flatten(input) {

        if (
            input === null ||
            input === undefined
        ) {

            return [];

        }

        /*
         * Object hasil parser.
         */
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

            /*
             * Satu material object.
             */
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

        /*
         * Array.
         */
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

                /*
                 * Nested array.
                 */
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

                /*
                 * Nested parser object.
                 */
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

                /*
                 * Material object.
                 */
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
            normalizeLine(
                row.ticket ||
                row.Ticket ||
                row.ttNumber ||
                row["TT Number"] ||
                ""
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
       GET MATERIAL MASTER
    ===================================================== */

    function getMaterialMaster() {

        return MATERIAL_MASTER.slice();

    }


    /* =====================================================
       PUBLIC API
    ===================================================== */

    window.ReportCheckerMaterial = {

        /*
         * Parser utama
         */
        parse:
            parseMaterialText,

        /*
         * Parser detailed
         */
        parseDetailed:
            parseDetailed,

        /*
         * Banyak row
         */
        parseMultiple:
            parseMultiple,

        /*
         * Manual ticket
         */
        parseWithTicket:
            parseWithTicket,

        /*
         * Build rows
         */
        buildRows:
            buildMaterialRows,

        /*
         * Compatibility excel.js
         */
        flatten:
            flatten,

        /*
         * Utility
         */
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
            cleanMaterialText

    };


    /* =====================================================
       DEBUG
    ===================================================== */

    console.log(
        "ReportCheckerMaterial loaded.",
        {

            masterCount:
                MATERIAL_MASTER.length,

            minimumScore:
                MATCH_CONFIG.minimumScore,

            hasFlatten:
                typeof window
                    .ReportCheckerMaterial
                    .flatten ===
                "function",

            hasParseDetailed:
                typeof window
                    .ReportCheckerMaterial
                    .parseDetailed ===
                "function"

        }
    );


})();
