/* =========================================================
   REPORT CHECKER
   material-parser.js

   UPDATE:
   - Ticket Material mengambil TT Number dari KOLOM D
   - Customer Ticket TIDAK digunakan sebagai Ticket Material
   - Daftar material resmi tetap dipertahankan
   - Matching material toleran terhadap typo / variasi tulisan
   - Tidak mengambil material yang tidak ada di daftar resmi
   - Exclude:
       Alcohol
       Tisu
       Tissue
       Sleeve Protector
       Sleeve Protect
       Protector
       Protection
       dll
   - Support material dari CIR / text report
   - Qty dan Satuan tetap dipertahankan jika tersedia
   - Material yang tidak cukup mirip tidak dimasukkan
========================================================= */

(function () {

    "use strict";


    /* =====================================================
       MATERIAL MASTER LIST
       
       JANGAN DIHAPUS.
       Ini adalah daftar material resmi.
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
       
       Material ini JANGAN PERNAH masuk hasil.
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
       
       Header:
       A = Datetime Receive
       B = Customer Ticket
       C = Ref Ticket
       D = TT Number
       E = Cust ID
       ...
       CIR = kolom terakhir
       
       Jadi TT Number = index 3.
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

            /*
             * Samakan variasi x
             *
             * 40x40
             * 40 x 40
             */

            .replace(/\s*x\s*/gi, "x")

            /*
             * Hilangkan tanda kurung
             */

            .replace(/[()]/g, " ")

            /*
             * Hilangkan quote
             */

            .replace(/["']/g, "")

            /*
             * Samakan separator
             */

            .replace(/[_\-]+/g, " ")

            /*
             * Rapikan spasi
             */

            .replace(/\s+/g, " ")

            .trim();

    }


    /* =====================================================
       CHECK EXCLUDED MATERIAL
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
       LEVENSHTEIN DISTANCE
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
       
       Tidak sekadar mencari substring.
       Token material diperiksa supaya:
       
       "96C"
       tidak tertukar dengan:
       "96C DOME"
       "96C INLINE"
       
       kecuali memang report memiliki tambahan tersebut.
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


        /*
         * Exact contains.
         */

        if (
            source.includes(target)
        ) {

            return 0.96;

        }


        /*
         * Token comparison.
         */

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


        let matched =
            0;


        for (
            const targetToken
                of targetTokens
        ) {

            let bestTokenScore =
                0;


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


            /*
             * Token pendek seperti:
             *
             * 2C
             * 12C
             * 24C
             * 48C
             * 96C
             *
             * harus cukup ketat.
             */

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


        /*
         * Gabungkan dengan similarity
         * seluruh nama.
         */

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

        if (
            !input
        ) {

            return null;

        }


        if (
            isExcludedMaterial(
                input
            )
        ) {

            return null;

        }


        let best =
            null;


        let bestScore =
            0;


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


        /*
         * Threshold cukup ketat.
         *
         * Jangan asal mengubah tulisan
         * report menjadi material.
         */

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
       
       WAJIB KOLOM D.
       
       row[3]
    ===================================================== */

    function getTTNumber(
        row
    ) {

        if (!row) {

            return "";

        }


        /*
         * Jika row berupa array.
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
         * Jika row berupa object.
         *
         * Support beberapa nama field.
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
         * Jika row berupa object.
         */

        if (
            !Array.isArray(row) &&
            cirField
        ) {

            return normalizeText(
                row[cirField]
            );

        }


        /*
         * Jika cirField berupa index.
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
         * Coba cari field CIR pada object.
         */

        if (
            !Array.isArray(row)
        ) {

            const fields = [

                "CIR",

                "cir",

                "Cir"

            ];


            for (
                const field
                    of fields
            ) {

                if (
                    row[field] !==
                    undefined
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
       PARSE NUMBER
       
       Support:
       
       149
       149 m
       Qty: 149
       Quantity 149
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


        /*
         * Qty:
         */

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
         * Angka sebelum satuan.
         */

        match =
            value.match(
                /(?:^|\s)(\d+(?:[.,]\d+)?)\s*(?:pcs?|unit|batang|m|meter|metre)\b/i
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


        const number =
            Number(
                normalized
            );


        return Number.isFinite(
            number
        )
            ? number
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


        /*
         * Ambil dari report.
         */

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


        /*
         * Default berdasarkan material.
         */

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
       EXTRACT MATERIAL FROM LINE
       
       Contoh:
       
       Kaset JB 1 pcs 0826004
       
       Splitter 1:8 - 1 pcs
       
       96C 149 m
       
       48c ( Meter ) : 71
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
         * Jangan proses line yang jelas
         * merupakan heading / keterangan.
         */

        if (
            /^material\s*:?\s*$/i.test(
                originalLine
            )
        ) {

            return null;

        }


        /*
         * Buat beberapa variasi input.
         */

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


        let best =
            null;


        for (
            const candidate
                of candidates
        ) {

            /*
             * Jangan langsung pakai seluruh line
             * untuk matching karena Qty / kode
             * bisa mengganggu.
             */

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


        /*
         * Ambil Qty dari line asli.
         */

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
       EXTRACT MATERIAL FROM TEXT
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
       MERGE SAME MATERIAL
       
       Jika material yang sama muncul
       beberapa kali, Qty dijumlahkan.
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
                            item.qty || 0,

                        satuan:
                            item.satuan || "pcs",

                        score:
                            item.score || 0,

                        sourceLine:
                            item.sourceLine || ""

                    }
                );

            } else {

                const existing =
                    map.get(
                        key
                    );


                existing.qty +=
                    item.qty || 0;


                /*
                 * Simpan score terbaik.
                 */

                existing.score =
                    Math.max(

                        existing.score || 0,

                        item.score || 0

                    );

            }

        }


        return Array.from(
            map.values()
        );

    }


    /* =====================================================
       BUILD MATERIAL ROW
       
       INI BAGIAN PENTING:
       
       Ticket = TT Number kolom D
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
                     * WAJIB:
                     * Ticket mengambil TT Number
                     * dari kolom D.
                     */

                    Ticket:
                        ttNumber,

                    Material:
                        item.material,

                    Qty:
                        item.qty,

                    Satuan:
                        item.satuan,

                    Kode:
                        "",

                    Score:
                        item.score,

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
       PARSE MATERIAL DENGAN TICKET MANUAL
       
       Berguna jika caller sudah punya TT Number.
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

                    Ticket:
                        ttNumber,

                    Material:
                        item.material,

                    Qty:
                        item.qty,

                    Satuan:
                        item.satuan,

                    Kode:
                        "",

                    Score:
                        item.score,

                    Source:
                        item.sourceLine

                };

            }
        );

    }


    /* =====================================================
       FILTER OFFICIAL MATERIAL
    ===================================================== */

    function getMaterialMaster() {

        return MATERIAL_MASTER
            .slice();

    }


    /* =====================================================
       PUBLIC API
    ===================================================== */

    window.ReportCheckerMaterial = {

        parse:
            parseMaterialText,

        parseMultiple:
            parseMultiple,

        parseWithTicket:
            parseWithTicket,

        buildRows:
            buildMaterialRows,

        getTTNumber:
            getTTNumber,

        getMaterialMaster:
            getMaterialMaster,

        findBestMaterial:
            findBestMaterial,

        isExcludedMaterial:
            isExcludedMaterial,

        normalizeMaterialName:
            normalizeMaterialName

    };


})();
