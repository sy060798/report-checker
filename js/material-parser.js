/* =========================================================
   REPORT CHECKER
   material-parser.js

   VERSION:
   - Compatibility dengan excel.js yang memanggil flatten()
   - Ticket Material = TT Number / kolom D
   - Customer Ticket TIDAK digunakan sebagai Ticket
   - Material hanya dari MASTER LIST
   - Matching material toleran terhadap typo / variasi tulisan
   - Material yang tidak cukup mirip tidak dimasukkan
   - Material excluded tidak pernah masuk hasil
   - Support CIR dari object maupun array
   - Support parse(), parseMultiple(), parseWithTicket()
   - Support buildRows()
   - Support flatten() untuk compatibility excel.js
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
       DEFAULT COLUMN
       
       A = Datetime Receive
       B = Customer Ticket
       C = Ref Ticket
       D = TT Number
       E = Cust ID
       ...
       CIR = kolom lainnya
    ===================================================== */

    const TT_NUMBER_COLUMN_INDEX = 3;


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

    function levenshtein(
        a,
        b
    ) {

        a =
            String(a || "");

        b =
            String(b || "");

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

    function similarity(
        a,
        b
    ) {

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

        if (
            left.includes(right) ||
            right.includes(left)
        ) {

            return 0.95;

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

        if (
            source.includes(target)
        ) {

            return 0.96;

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

        let matched = 0;

        for (
            const targetToken
                of targetTokens
        ) {

            let bestTokenScore = 0;

            for (
                const sourceToken
                    of sourceTokens
            ) {

                const score =
                    similarity(
                        sourceToken,
                        targetToken
                    );

                if (
                    score >
                    bestTokenScore
                ) {

                    bestTokenScore =
                        score;

                }

            }

            const minimum =
                targetToken.length <= 3
                    ? 0.82
                    : 0.70;

            if (
                bestTokenScore >=
                minimum
            ) {

                matched += 1;

            }

        }

        const tokenScore =
            matched /
            targetTokens.length;

        const wholeScore =
            similarity(
                source,
                target
            );

        return Math.max(
            tokenScore,
            wholeScore
        );

    }


    /* =====================================================
       FIND BEST MATERIAL
    ===================================================== */

    function findBestMaterial(
        input
    ) {

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

        let best = null;

        let bestScore = 0;

        for (
            const master
                of MATERIAL_MASTER
        ) {

            const score =
                materialMatchScore(
                    input,
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
            bestScore < 0.70
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
    ===================================================== */

    function getTTNumber(
        row
    ) {

        if (!row) {

            return "";

        }

        if (
            Array.isArray(row)
        ) {

            return normalizeLine(
                row[
                    TT_NUMBER_COLUMN_INDEX
                ]
            );

        }

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
         * Support apabila excel.js
         * menyimpan original row.
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
         * Object + field.
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
       PARSE QTY
    ===================================================== */

    function parseQty(
        text
    ) {

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

        match =
            value.match(
                /(?:^|\s)(\d+(?:[.,]\d+)?)\s*(?:pcs?|unit|batang|m|meter|metre)\b/i
            );

        if (match) {

            return normalizeNumber(
                match[1]
            );

        }

        /*
         * Support:
         *
         * Material : 149
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
       NORMALIZE NUMBER
    ===================================================== */

    function normalizeNumber(
        value
    ) {

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
       PARSE MATERIAL LINE
    ===================================================== */

    function parseMaterialLine(
        line
    ) {

        const originalLine =
            normalizeLine(
                line
            );

        if (!originalLine) {

            return null;

        }

        /*
         * Heading tidak dianggap material.
         */

        if (
            /^material\s*:?\s*$/i.test(
                originalLine
            )
        ) {

            return null;

        }

        /*
         * Excluded line langsung skip.
         */

        if (
            isExcludedMaterial(
                originalLine
            )
        ) {

            return null;

        }

        const candidates = [

            originalLine,

            originalLine
                .replace(
                    /[:=]/g,
                    " "
                ),

            originalLine
                .replace(
                    /\bqty\b/gi,
                    ""
                ),

            originalLine
                .replace(
                    /\bquantity\b/gi,
                    ""
                )

        ];

        let best = null;

        for (
            const candidate
                of candidates
        ) {

            const cleaned =
                candidate

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
                        /\b\d+(?:[.,]\d+)?\s*(?:pcs?|unit|batang|m|meter|metre)\b/gi,
                        " "
                    )

                    .replace(
                        /\s+/g,
                        " "
                    )

                    .trim();

            const result =
                findBestMaterial(
                    cleaned
                );

            if (
                result &&
                (
                    !best ||
                    result.score >
                    best.score
                )
            ) {

                best = {

                    material:
                        result.material,

                    score:
                        result.score

                };

            }

        }

        if (!best) {

            return null;

        }

        const qty =
            parseQty(
                originalLine
            );

        const satuan =
            parseSatuan(
                originalLine,
                best.material
            );

        return {

            material:
                best.material,

            qty:
                qty,

            satuan:
                satuan,

            score:
                best.score,

            sourceLine:
                originalLine

        };

    }


    /* =====================================================
       PARSE MATERIAL TEXT
    ===================================================== */

    function parseMaterialText(
        text
    ) {

        const normalized =
            normalizeText(
                text
            );

        if (!normalized) {

            return [];

        }

        const lines =
            normalized.split(
                "\n"
            );

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
                parsed
            );

        }

        return mergeMaterials(
            results
        );

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

                    /*
                     * Format utama
                     * untuk app.js
                     */

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
                        item.sourceLine

                };

            }
        );

    }


    /* =====================================================
       PARSE MULTIPLE ROWS
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
                        item.sourceLine

                };

            }
        );

    }


    /* =====================================================
       FLATTEN
       
       Compatibility dengan excel.js.
       
       Bisa menerima:
       
       flatten(materials)
       
       flatten([row1, row2])
       
       flatten({
           materials: [...]
       })
       
       flatten({
           material: [...]
       })
       
       Tujuannya agar error:
       
       window.ReportCheckerMaterial.flatten
       is not a function
       
       tidak terjadi lagi.
    ===================================================== */

    function flatten(
        input
    ) {

        if (
            input === null ||
            input === undefined
        ) {

            return [];

        }

        /*
         * Jika object hasil parser.
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
                 * Nested object yang punya
                 * materials/materials array.
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
                 * Material object biasa.
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
       
       Membuat hasil konsisten untuk excel.js
       dan app.js.
    ===================================================== */

    function normalizeMaterialRow(
        row
    ) {

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
                source

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
         * Parse banyak row
         */

        parseMultiple:
            parseMultiple,

        /*
         * Parse menggunakan ticket manual
         */

        parseWithTicket:
            parseWithTicket,

        /*
         * Build row
         */

        buildRows:
            buildMaterialRows,

        /*
         * Compatibility API
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
            mergeMaterials

    };


    /* =====================================================
       DEBUG
    ===================================================== */

    console.log(
        "ReportCheckerMaterial loaded.",
        {
            masterCount:
                MATERIAL_MASTER.length,

            hasFlatten:
                typeof window
                    .ReportCheckerMaterial
                    .flatten === "function"
        }
    );


})();
