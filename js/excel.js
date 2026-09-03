/* =========================================================
   REPORT CHECKER
   excel.js

   VERSION FINAL / STABLE

   Fungsi:
   - Upload Excel
   - Validasi header A sampai AF
   - TT Number = kolom D
   - CIR = kolom AF
   - Validasi Ticket Release
   - Parsing Material dari CIR
   - Pisahkan SESUAI / TIDAK SESUAI
   - Material menggunakan TT Number
   - Material Error jika CIR ada tetapi material gagal ditemukan
   - Export hasil Excel
   - Kompatibel dengan app.js
   - Kompatibel dengan material-parser.js
   - Kompatibel dengan validator.js
   - SheetJS XLSX

   ========================================================= */

(function () {

    "use strict";


    /* =====================================================
       CONFIG
    ===================================================== */

    const EXPECTED_HEADERS = [

        "Datetime Receive",
        "Customer Ticket",
        "Ref Ticket",
        "TT Number",
        "Cust ID",
        "Segment/Link",
        "Span Length",
        "LFO Id",
        "City Name",
        "Branch",
        "Type Workorder",
        "Customer Name",
        "Parsing Name",
        "Region",
        "Problem Subject",
        "Status TT",
        "Shift",
        "Team Name",
        "Teknisi Name",
        "Restore Time",
        "MTTR",
        "Final SLA",
        "Start Stopclock 1",
        "End Stopclock 1",
        "Start Stopclock 2",
        "End Stopclock 2",
        "RCA",
        "SUB RCA",
        "ACTION",
        "TIKOR 1",
        "TIKOR 2",
        "CIR"

    ];


    /*
     * Kolom Excel:
     *
     * A = 0
     * B = 1
     * C = 2
     * D = 3
     *
     * AF = 31
     */

    const TT_NUMBER_COLUMN_INDEX = 3;

    const CIR_COLUMN_INDEX = 31;


    /* =====================================================
       STATE
    ===================================================== */

    const state = {

        workbook: null,

        sheetName: "",

        rows: [],

        originalRows: [],

        validationResults: [],

        sesuai: [],

        tidakSesuai: [],

        invalid: [],

        materials: [],

        materialError: [],

        materialNotFound: [],

        customMaterials: [],

        fileName: ""

    };


    /* =====================================================
       UTILITY
    ===================================================== */

    function cleanValue(value) {

        if (
            value === null ||
            value === undefined
        ) {

            return "";

        }


        if (
            value instanceof Date
        ) {

            return value;

        }


        return String(value)
            .replace(/\u00A0/g, " ")
            .trim();

    }


    function normalizeHeader(value) {

        return String(
            value ?? ""
        )
            .replace(/\u00A0/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();

    }


    function isEmptyValue(value) {

        return (
            value === null ||
            value === undefined ||
            String(value).trim() === ""
        );

    }


    /* =====================================================
       XLSX
    ===================================================== */

    function getXLSX() {

        if (
            typeof XLSX !== "undefined"
        ) {

            return XLSX;

        }


        throw new Error(
            "Library XLSX belum dimuat."
        );

    }


    /* =====================================================
       HEADER
    ===================================================== */

    function findHeader(
        headers,
        expected
    ) {

        const target =
            normalizeHeader(
                expected
            );


        for (
            let i = 0;
            i < headers.length;
            i++
        ) {

            if (
                normalizeHeader(
                    headers[i]
                ) === target
            ) {

                return i;

            }

        }


        return -1;

    }


    function validateHeaders(
        headers
    ) {

        const result = {

            valid: true,

            missing: [],

            found: [],

            indexes: {}

        };


        if (
            !Array.isArray(headers)
        ) {

            result.valid =
                false;

            result.missing =
                EXPECTED_HEADERS.slice();

            return result;

        }


        for (
            const expected
            of EXPECTED_HEADERS
        ) {

            const index =
                findHeader(
                    headers,
                    expected
                );


            if (
                index === -1
            ) {

                result.valid =
                    false;

                result.missing.push(
                    expected
                );

            }
            else {

                result.found.push(
                    expected
                );

                result.indexes[
                    expected
                ] = index;

            }

        }


        return result;

    }


    /* =====================================================
       FILE READER
    ===================================================== */

    function readFile(file) {

        return new Promise(
            function (
                resolve,
                reject
            ) {

                if (!file) {

                    reject(
                        new Error(
                            "File tidak ditemukan."
                        )
                    );

                    return;

                }


                const reader =
                    new FileReader();


                reader.onload =
                    function (event) {

                        try {

                            const xlsx =
                                getXLSX();


                            const data =
                                new Uint8Array(
                                    event.target.result
                                );


                            const workbook =
                                xlsx.read(
                                    data,
                                    {

                                        type: "array",

                                        cellDates: true,

                                        raw: true

                                    }
                                );


                            resolve(
                                workbook
                            );

                        }
                        catch (error) {

                            reject(
                                error
                            );

                        }

                    };


                reader.onerror =
                    function () {

                        reject(
                            new Error(
                                "Gagal membaca file Excel."
                            )
                        );

                    };


                reader.readAsArrayBuffer(
                    file
                );

            }
        );

    }


    /* =====================================================
       FIRST SHEET
    ===================================================== */

    function getFirstSheet(
        workbook
    ) {

        if (
            !workbook ||
            !Array.isArray(
                workbook.SheetNames
            ) ||
            workbook.SheetNames.length === 0
        ) {

            throw new Error(
                "Workbook tidak memiliki sheet."
            );

        }


        const sheetName =
            workbook.SheetNames[0];


        const sheet =
            workbook.Sheets[
                sheetName
            ];


        if (!sheet) {

            throw new Error(
                "Sheet pertama tidak dapat dibaca."
            );

        }


        return {

            name:
                sheetName,

            sheet:
                sheet

        };

    }


    /* =====================================================
       SHEET -> ARRAY
    ===================================================== */

    function sheetToArray(
        sheet
    ) {

        const xlsx =
            getXLSX();


        return xlsx.utils.sheet_to_json(
            sheet,
            {

                header: 1,

                defval: "",

                raw: true,

                blankrows: false

            }
        );

    }


    /* =====================================================
       SHEET -> OBJECT
    ===================================================== */

    function sheetToRows(
        sheet
    ) {

        const xlsx =
            getXLSX();


        return xlsx.utils.sheet_to_json(
            sheet,
            {

                defval: "",

                raw: true,

                blankrows: false

            }
        );

    }


    /* =====================================================
       NORMALIZE ROW
    ===================================================== */

    function normalizeRow(
        row
    ) {

        const output = {};


        for (
            const header
            of EXPECTED_HEADERS
        ) {

            output[header] =
                row?.[header] ??
                "";

        }


        /*
         * Pertahankan kolom tambahan
         */

        if (row) {

            Object.keys(row)
                .forEach(
                    function (key) {

                        if (
                            !Object.prototype
                                .hasOwnProperty
                                .call(
                                    output,
                                    key
                                )
                        ) {

                            output[key] =
                                row[key];

                        }

                    }
                );

        }


        return output;

    }


    /* =====================================================
       GET TT NUMBER
    ===================================================== */

    function getTTNumber(
        row
    ) {

        if (!row) {

            return "";

        }


        /*
         * Array:
         * D = index 3
         */

        if (
            Array.isArray(row)
        ) {

            return cleanValue(
                row[
                    TT_NUMBER_COLUMN_INDEX
                ]
            );

        }


        /*
         * Object:
         * Prioritas hanya TT Number.
         */

        const fields = [

            "TT Number",
            "TT number",
            "TT_NUMBER",
            "tt_number",
            "TTNumber",
            "ttNumber"

        ];


        for (
            const field
            of fields
        ) {

            if (
                row[field] !== undefined &&
                row[field] !== null
            ) {

                const value =
                    cleanValue(
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
       GET TICKET
       
       Alias lama.
       
       Ticket sistem = TT Number.
    ===================================================== */

    function getTicket(
        row
    ) {

        return getTTNumber(
            row
        );

    }


    /* =====================================================
       GET CIR
    ===================================================== */

    function getCIR(
        row
    ) {

        if (!row) {

            return "";

        }


        /*
         * Array:
         * AF = index 31
         */

        if (
            Array.isArray(row)
        ) {

            return cleanValue(
                row[
                    CIR_COLUMN_INDEX
                ]
            );

        }


        /*
         * Object
         */

        if (
            row["CIR"] !== undefined
        ) {

            return cleanValue(
                row["CIR"]
            );

        }


        return "";

    }


    /* =====================================================
       MATERIAL PARSER
    ===================================================== */

    function getMaterialParser() {

        if (
            !window.ReportCheckerMaterial
        ) {

            throw new Error(
                "material-parser.js belum berhasil dimuat."
            );

        }


        if (
            typeof window
                .ReportCheckerMaterial
                .parse !==
            "function"
        ) {

            throw new Error(
                "Fungsi parse() pada material-parser.js tidak ditemukan."
            );

        }


        return window.ReportCheckerMaterial;

    }


    /* =====================================================
       PARSE MATERIAL
    ===================================================== */

    function parseMaterials(
        ttNumber,
        cirText
    ) {

        const ticket =
            cleanValue(
                ttNumber
            );


        const cir =
            cleanValue(
                cirText
            );


        /*
         * Tidak ada TT Number
         */

        if (!ticket) {

            return {

                found: false,

                status:
                    "NO TICKET",

                ticket: "",

                materials: [],

                note:
                    "TT Number tidak ditemukan."

            };

        }


        /*
         * CIR kosong
         */

        if (!cir) {

            return {

                found: false,

                status:
                    "NO MATERIAL",

                ticket:
                    ticket,

                materials: [],

                note:
                    "CIR tidak berisi material."

            };

        }


        const parser =
            getMaterialParser();


        let parsed;


        try {

            parsed =
                parser.parse(
                    cir
                );

        }
        catch (error) {

            return {

                found: false,

                status:
                    "PARSE ERROR",

                ticket:
                    ticket,

                materials: [],

                note:
                    error?.message ||
                    "Gagal parsing material dari CIR."

            };

        }


        const materialList =
            Array.isArray(parsed)
                ? parsed
                : [];


        const rows = [];


        for (
            const item
            of materialList
        ) {

            if (!item) {

                continue;

            }


            const material =
                cleanValue(
                    item.material
                );


            /*
             * Material kosong jangan dianggap
             * sebagai material valid.
             */

            if (!material) {

                continue;

            }


            rows.push({

                ticket:
                    ticket,

                material:
                    material,

                originalMaterial:
                    cleanValue(
                        item.originalMaterial ||
                        item.material
                    ),

                quantity:
                    item.qty ??
                    item.quantity ??
                    1,

                unit:
                    cleanValue(
                        item.satuan ||
                        item.unit ||
                        ""
                    ),

                code:
                    cleanValue(
                        item.kode ||
                        item.code ||
                        ""
                    ),

                type:
                    cleanValue(
                        item.type ||
                        "OFFICIAL"
                    ),

                matchedAlias:
                    cleanValue(
                        item.matchedAlias ||
                        ""
                    ),

                score:
                    item.score ??
                    0,

                raw:
                    cleanValue(
                        item.raw ||
                        item.sourceLine ||
                        ""
                    )

            });

        }


        return {

            found:
                rows.length > 0,

            status:
                rows.length > 0
                    ? "FOUND"
                    : "NO MATERIAL",

            ticket:
                ticket,

            materials:
                rows,

            note:
                rows.length > 0
                    ? ""
                    : "Tidak ditemukan material resmi di dalam CIR."

        };

    }


    /* =====================================================
       CREATE MATERIAL ERROR
    ===================================================== */

    function createNoMaterial(
        ticket,
        note,
        cir
    ) {

        return {

            ticket:
                cleanValue(
                    ticket
                ),

            material:
                "",

            originalMaterial:
                "",

            quantity:
                "",

            unit:
                "",

            code:
                "",

            type:
                "NOT FOUND",

            matchedAlias:
                "",

            score:
                0,

            raw:
                cleanValue(
                    cir
                ),

            reason:
                note ||
                "Material tidak ditemukan."

        };

    }


    /* =====================================================
       PROCESS ONE ROW
    ===================================================== */

    function processRow(
        row,
        index
    ) {

        const normalized =
            normalizeRow(
                row
            );


        /*
         * Ticket utama:
         * TT Number kolom D.
         */

        const ttNumber =
            getTTNumber(
                normalized
            );


        /*
         * CIR:
         * kolom AF.
         */

        const cir =
            getCIR(
                normalized
            );


        /*
         * Validator
         */

        if (
            !window.ReportCheckerValidator ||
            typeof window
                .ReportCheckerValidator
                .validate !==
            "function"
        ) {

            throw new Error(
                "validator.js belum berhasil dimuat atau fungsi validate() tidak tersedia."
            );

        }


        let validation;


        try {

            validation =
                window
                    .ReportCheckerValidator
                    .validate(
                        normalized
                    );

        }
        catch (error) {

            throw new Error(
                "Gagal validasi baris " +
                (index + 2) +
                ": " +
                (
                    error?.message ||
                    error
                )
            );

        }


        if (
            !validation ||
            typeof validation !== "object"
        ) {

            validation = {};

        }


        /*
         * Paksa ticket hasil = TT Number.
         */

        validation.ticket =
            ttNumber;


        validation.ttNumber =
            ttNumber;


        validation.rowIndex =
            index;


        validation.originalRow =
            normalized;


        /*
         * Material
         */

        const materialResult =
            parseMaterials(
                ttNumber,
                cir
            );


        validation.materialResult =
            materialResult;


        validation.cir =
            cir;


        return validation;

    }


    /* =====================================================
       FLATTEN MATERIAL
    ===================================================== */

    function flattenMaterialResults(
        materialResults
    ) {

        const output = [];


        for (
            const result
            of materialResults || []
        ) {

            if (!result) {

                continue;

            }


            const ticket =
                cleanValue(
                    result.ticket
                );


            /*
             * Material tanpa ticket
             * tidak boleh masuk output.
             */

            if (!ticket) {

                continue;

            }


            const materials =
                Array.isArray(
                    result.materials
                )
                    ? result.materials
                    : [];


            for (
                const item
                of materials
            ) {

                if (!item) {

                    continue;

                }


                const material =
                    cleanValue(
                        item.material
                    );


                if (!material) {

                    continue;

                }


                output.push({

                    ticket:
                        ticket,

                    material:
                        material,

                    originalMaterial:
                        cleanValue(
                            item.originalMaterial ||
                            material
                        ),

                    quantity:
                        item.quantity ??
                        item.qty ??
                        1,

                    unit:
                        cleanValue(
                            item.unit ||
                            item.satuan ||
                            ""
                        ),

                    code:
                        cleanValue(
                            item.code ||
                            item.kode ||
                            ""
                        ),

                    type:
                        cleanValue(
                            item.type ||
                            "OFFICIAL"
                        ),

                    matchedAlias:
                        cleanValue(
                            item.matchedAlias ||
                            ""
                        ),

                    score:
                        item.score ??
                        0,

                    raw:
                        cleanValue(
                            item.raw ||
                            item.sourceLine ||
                            ""
                        )

                });

            }

        }


        return output;

    }


    /* =====================================================
       MATERIAL ERROR
    ===================================================== */

    function buildMaterialErrors(
        validationResults
    ) {

        const errors = [];


        for (
            const item
            of validationResults || []
        ) {

            if (!item) {

                continue;

            }


            const ticket =
                cleanValue(
                    item.ttNumber ||
                    item.ticket
                );


            /*
             * Baris tanpa TT Number
             * tidak masuk Material Error,
             * karena tidak bisa dikaitkan ke Ticket.
             */

            if (!ticket) {

                continue;

            }


            const materialResult =
                item.materialResult;


            if (!materialResult) {

                errors.push(
                    createNoMaterial(
                        ticket,
                        "Hasil parsing material tidak tersedia.",
                        item.cir
                    )
                );

                continue;

            }


            if (
                !materialResult.found
            ) {

                errors.push(
                    createNoMaterial(
                        ticket,
                        materialResult.note ||
                        "Material tidak ditemukan.",
                        item.cir
                    )
                );

            }

        }


        return errors;

    }


    /* =====================================================
       PROCESS WORKBOOK
    ===================================================== */

    function processWorkbook(
        workbook,
        fileName
    ) {

        if (!workbook) {

            throw new Error(
                "Workbook kosong."
            );

        }


        const firstSheet =
            getFirstSheet(
                workbook
            );


        /*
         * Baca array mentah
         */

        const arrayRows =
            sheetToArray(
                firstSheet.sheet
            );


        if (
            !arrayRows.length
        ) {

            throw new Error(
                "Sheet Excel kosong."
            );

        }


        const headers =
            arrayRows[0] || [];


        /*
         * Validasi header
         */

        const headerValidation =
            validateHeaders(
                headers
            );


        if (
            !headerValidation.valid
        ) {

            throw new Error(
                "Header Excel tidak lengkap.\n\n" +
                "Kolom yang belum ditemukan:\n\n" +
                headerValidation.missing
                    .map(
                        function (item) {

                            return "• " + item;

                        }
                    )
                    .join("\n")
            );

        }


        /*
         * Baca object rows
         */

        const rows =
            sheetToRows(
                firstSheet.sheet
            );


        if (
            !rows.length
        ) {

            throw new Error(
                "Tidak ada data setelah header."
            );

        }


        /*
         * Normalisasi
         */

        const normalizedRows =
            rows.map(
                function (row) {

                    return normalizeRow(
                        row
                    );

                }
            );


        /*
         * PROCESS
         */

        const validationResults =
            normalizedRows.map(
                function (
                    row,
                    index
                ) {

                    return processRow(
                        row,
                        index
                    );

                }
            );


        /*
         * VALIDATOR SPLIT
         */

        if (
            !window.ReportCheckerValidator ||
            typeof window
                .ReportCheckerValidator
                .split !==
            "function"
        ) {

            throw new Error(
                "validator.js belum memiliki fungsi split()."
            );

        }


        let split;


        try {

            split =
                window
                    .ReportCheckerValidator
                    .split(
                        validationResults
                    );

        }
        catch (error) {

            throw new Error(
                "Gagal memisahkan hasil validasi: " +
                (
                    error?.message ||
                    error
                )
            );

        }


        split =
            split || {};


        /*
         * MATERIAL RESULTS
         */

        const materialResults =
            validationResults.map(
                function (item) {

                    return item?.materialResult;

                }
            );


        /*
         * FLATTEN
         */

        const materialRows =
            flattenMaterialResults(
                materialResults
            );


        /*
         * MATERIAL ERROR
         */

        const materialError =
            buildMaterialErrors(
                validationResults
            );


        /*
         * CUSTOM MATERIAL
         */

        const customMaterials =
            materialRows.filter(
                function (item) {

                    return (
                        String(
                            item?.type ||
                            ""
                        )
                            .trim()
                            .toUpperCase() ===
                        "CUSTOM"
                    );

                }
            );


        /*
         * VALIDASI SPLIT
         */

        const sesuai =
            Array.isArray(
                split.sesuai
            )
                ? split.sesuai
                : [];


        const tidakSesuai =
            Array.isArray(
                split.tidakSesuai
            )
                ? split.tidakSesuai
                : [];


        const invalid =
            Array.isArray(
                split.invalid
            )
                ? split.invalid
                : [];


        /*
         * SAVE STATE
         */

        state.workbook =
            workbook;


        state.sheetName =
            firstSheet.name;


        state.rows =
            normalizedRows;


        state.originalRows =
            rows;


        state.validationResults =
            validationResults;


        state.sesuai =
            sesuai;


        state.tidakSesuai =
            tidakSesuai;


        state.invalid =
            invalid;


        state.materials =
            materialRows;


        state.materialError =
            materialError;


        state.materialNotFound =
            materialError;


        state.customMaterials =
            customMaterials;


        state.fileName =
            fileName ||
            "report.xlsx";


        /*
         * RETURN RESULT
         */

        return {

            workbook:
                state.workbook,

            sheetName:
                state.sheetName,

            rows:
                state.rows,

            validation:
                state.validationResults,

            validationResults:
                state.validationResults,

            sesuai:
                state.sesuai,

            tidakSesuai:
                state.tidakSesuai,

            invalid:
                state.invalid,

            materials:
                state.materials,

            materialError:
                state.materialError,

            materialNotFound:
                state.materialNotFound,

            customMaterials:
                state.customMaterials,

            summary: {

                total:
                    state.validationResults.length,

                sesuai:
                    state.sesuai.length,

                tidakSesuai:
                    state.tidakSesuai.length,

                invalid:
                    state.invalid.length,

                material:
                    state.materials.length,

                materialError:
                    state.materialError.length,

                materialNotFound:
                    state.materialNotFound.length,

                customMaterial:
                    state.customMaterials.length

            }

        };

    }


    /* =====================================================
       LOAD
    ===================================================== */

    async function loadExcel(
        file
    ) {

        const workbook =
            await readFile(
                file
            );


        return processWorkbook(
            workbook,
            file?.name ||
            "report.xlsx"
        );

    }


    /* =====================================================
       WORKSHEET
    ===================================================== */

    function createWorksheet(
        rows,
        headers
    ) {

        const xlsx =
            getXLSX();


        const safeRows =
            Array.isArray(rows)
                ? rows
                : [];


        const safeHeaders =
            Array.isArray(headers)
                ? headers
                : [];


        const data = [

            safeHeaders,

            ...safeRows.map(
                function (row) {

                    return safeHeaders.map(
                        function (header) {

                            const value =
                                row?.[header];


                            if (
                                value === null ||
                                value === undefined
                            ) {

                                return "";

                            }


                            return value;

                        }
                    );

                }
            )

        ];


        return xlsx.utils.aoa_to_sheet(
            data
        );

    }


    /* =====================================================
       AUTO WIDTH
    ===================================================== */

    function autoWidth(
        sheet,
        rows,
        headers
    ) {

        if (!sheet) {

            return;

        }


        const widths = [];


        for (
            let i = 0;
            i < headers.length;
            i++
        ) {

            let max =
                String(
                    headers[i] || ""
                ).length;


            for (
                const row
                of rows || []
            ) {

                const value =
                    String(
                        row?.[
                            headers[i]
                        ] ??
                        ""
                    );


                max =
                    Math.max(
                        max,
                        Math.min(
                            value.length,
                            50
                        )
                    );

            }


            widths.push({

                wch:
                    Math.max(
                        12,
                        Math.min(
                            max + 2,
                            50
                        )
                    )

            });

        }


        sheet["!cols"] =
            widths;

    }


    /* =====================================================
       DOWNLOAD WORKBOOK
    ===================================================== */

    function downloadWorkbook(
        rows,
        headers,
        fileName,
        sheetName
    ) {

        const xlsx =
            getXLSX();


        const workbook =
            xlsx.utils.book_new();


        const sheet =
            createWorksheet(
                rows,
                headers
            );


        autoWidth(
            sheet,
            rows,
            headers
        );


        let safeSheetName =
            String(
                sheetName ||
                "Data"
            )
                .replace(
                    /[:\\/?*\[\]]/g,
                    "_"
                )
                .substring(
                    0,
                    31
                );


        if (!safeSheetName) {

            safeSheetName =
                "Data";

        }


        xlsx.utils.book_append_sheet(
            workbook,
            sheet,
            safeSheetName
        );


        xlsx.writeFile(
            workbook,
            fileName ||
            "hasil.xlsx"
        );

    }


    /* =====================================================
       VALIDATION EXPORT
    ===================================================== */

    function makeValidationExportRows(
        source
    ) {

        return (
            source || []
        ).map(
            function (item) {

                const original =
                    item?.originalRow ||
                    {};


                return {

                    ...original,

                    "TT Release":
                        item?.releaseDateTime ??
                        "",

                    "Validation Status":
                        item?.status ??
                        "",

                    "Validation Note":
                        item?.reason ??
                        ""

                };

            }
        );

    }


    function validationHeaders() {

        return [

            ...EXPECTED_HEADERS,

            "TT Release",

            "Validation Status",

            "Validation Note"

        ];

    }


    /* =====================================================
       EXPORT SESUAI
    ===================================================== */

    function exportSesuai(
        fileName
    ) {

        const rows =
            makeValidationExportRows(
                state.sesuai
            );


        downloadWorkbook(
            rows,
            validationHeaders(),
            fileName ||
            "hasil_sesuai.xlsx",
            "SESUAI"
        );

    }


    /* =====================================================
       EXPORT TIDAK SESUAI
    ===================================================== */

    function exportTidakSesuai(
        fileName
    ) {

        const rows =
            makeValidationExportRows(
                state.tidakSesuai
            );


        downloadWorkbook(
            rows,
            validationHeaders(),
            fileName ||
            "hasil_tidak_sesuai.xlsx",
            "TIDAK SESUAI"
        );

    }


    /* =====================================================
       EXPORT INVALID
    ===================================================== */

    function exportInvalid(
        fileName
    ) {

        const rows =
            makeValidationExportRows(
                state.invalid
            );


        downloadWorkbook(
            rows,
            validationHeaders(),
            fileName ||
            "hasil_invalid.xlsx",
            "INVALID"
        );

    }


    /* =====================================================
       MATERIAL EXPORT
    ===================================================== */

    function makeMaterialExportRows() {

        return state.materials
            .filter(
                function (item) {

                    return (
                        item &&
                        cleanValue(
                            item.ticket
                        )
                    );

                }
            )
            .map(
                function (item) {

                    return {

                        "Ticket":
                            item.ticket,

                        "Material":
                            item.material,

                        "Original Material":
                            item.originalMaterial ||
                            item.material,

                        "Quantity":
                            item.quantity,

                        "Unit":
                            item.unit,

                        "Code":
                            item.code,

                        "Type":
                            item.type,

                        "Matched Alias":
                            item.matchedAlias,

                        "Score":
                            item.score,

                        "Raw":
                            item.raw

                    };

                }
            );

    }


    function materialHeaders() {

        return [

            "Ticket",

            "Material",

            "Original Material",

            "Quantity",

            "Unit",

            "Code",

            "Type",

            "Matched Alias",

            "Score",

            "Raw"

        ];

    }


    function exportMaterial(
        fileName
    ) {

        const rows =
            makeMaterialExportRows();


        downloadWorkbook(
            rows,
            materialHeaders(),
            fileName ||
            "hasil_material.xlsx",
            "MATERIAL"
        );

    }


    /* =====================================================
       MATERIAL ERROR EXPORT
    ===================================================== */

    function makeMaterialErrorExportRows() {

        return state.materialError
            .filter(
                function (item) {

                    return (
                        item &&
                        cleanValue(
                            item.ticket
                        )
                    );

                }
            )
            .map(
                function (item) {

                    return {

                        "Ticket":
                            item.ticket,

                        "Material":
                            item.material,

                        "Original Material":
                            item.originalMaterial,

                        "Quantity":
                            item.quantity,

                        "Unit":
                            item.unit,

                        "Code":
                            item.code,

                        "Type":
                            item.type,

                        "Matched Alias":
                            item.matchedAlias,

                        "Score":
                            item.score,

                        "Raw":
                            item.raw,

                        "Error":
                            item.reason

                    };

                }
            );

    }


    function materialErrorHeaders() {

        return [

            "Ticket",

            "Material",

            "Original Material",

            "Quantity",

            "Unit",

            "Code",

            "Type",

            "Matched Alias",

            "Score",

            "Raw",

            "Error"

        ];

    }


    function exportMaterialError(
        fileName
    ) {

        const rows =
            makeMaterialErrorExportRows();


        downloadWorkbook(
            rows,
            materialErrorHeaders(),
            fileName ||
            "material_error.xlsx",
            "MATERIAL ERROR"
        );

    }


    /* =====================================================
       MATERIAL NOT FOUND
       
       Alias kompatibilitas lama.
    ===================================================== */

    function exportMaterialNotFound(
        fileName
    ) {

        exportMaterialError(
            fileName ||
            "material_not_found.xlsx"
        );

    }


    /* =====================================================
       CUSTOM MATERIAL
    ===================================================== */

    function exportCustomMaterial(
        fileName
    ) {

        const rows =
            state.customMaterials
                .filter(
                    function (item) {

                        return (
                            item &&
                            cleanValue(
                                item.ticket
                            )
                        );

                    }
                )
                .map(
                    function (item) {

                        return {

                            "Ticket":
                                item.ticket,

                            "Material":
                                item.material,

                            "Original Material":
                                item.originalMaterial,

                            "Quantity":
                                item.quantity,

                            "Unit":
                                item.unit,

                            "Code":
                                item.code,

                            "Type":
                                item.type,

                            "Matched Alias":
                                item.matchedAlias,

                            "Score":
                                item.score,

                            "Raw":
                                item.raw

                        };

                    }
                );


        downloadWorkbook(
            rows,
            materialHeaders(),
            fileName ||
            "material_custom.xlsx",
            "CUSTOM"
        );

    }


    /* =====================================================
       EXPORT ALL
    ===================================================== */

    function exportAll(
        fileName
    ) {

        const xlsx =
            getXLSX();


        const workbook =
            xlsx.utils.book_new();


        function appendSheet(
            rows,
            headers,
            name
        ) {

            const sheet =
                createWorksheet(
                    rows,
                    headers
                );


            autoWidth(
                sheet,
                rows,
                headers
            );


            const safeName =
                String(
                    name ||
                    "Data"
                )
                    .replace(
                        /[:\\/?*\[\]]/g,
                        "_"
                    )
                    .substring(
                        0,
                        31
                    );


            xlsx.utils.book_append_sheet(
                workbook,
                sheet,
                safeName
            );

        }


        /*
         * SESUAI
         */

        appendSheet(

            makeValidationExportRows(
                state.sesuai
            ),

            validationHeaders(),

            "SESUAI"

        );


        /*
         * TIDAK SESUAI
         */

        appendSheet(

            makeValidationExportRows(
                state.tidakSesuai
            ),

            validationHeaders(),

            "TIDAK SESUAI"

        );


        /*
         * INVALID
         */

        appendSheet(

            makeValidationExportRows(
                state.invalid
            ),

            validationHeaders(),

            "INVALID"

        );


        /*
         * MATERIAL
         */

        appendSheet(

            makeMaterialExportRows(),

            materialHeaders(),

            "MATERIAL"

        );


        /*
         * MATERIAL ERROR
         */

        appendSheet(

            makeMaterialErrorExportRows(),

            materialErrorHeaders(),

            "MATERIAL ERROR"

        );


        /*
         * CUSTOM
         */

        const customRows =
            state.customMaterials
                .map(
                    function (item) {

                        return {

                            "Ticket":
                                item.ticket,

                            "Material":
                                item.material,

                            "Original Material":
                                item.originalMaterial,

                            "Quantity":
                                item.quantity,

                            "Unit":
                                item.unit,

                            "Code":
                                item.code,

                            "Type":
                                item.type,

                            "Matched Alias":
                                item.matchedAlias,

                            "Score":
                                item.score,

                            "Raw":
                                item.raw

                        };

                    }
                );


        appendSheet(

            customRows,

            materialHeaders(),

            "CUSTOM"

        );


        /*
         * DOWNLOAD
         */

        xlsx.writeFile(
            workbook,
            fileName ||
            "report_checker_result.xlsx"
        );

    }


    /* =====================================================
       EXPORT RESULT
       
       API utama untuk app.js
    ===================================================== */

    function exportResult(
        type
    ) {

        const target =
            String(
                type || ""
            )
                .trim()
                .toLowerCase();


        switch (target) {

            case "valid":

                exportSesuai(
                    "Sesuai.xlsx"
                );

                break;


            case "invalid":

                exportTidakSesuai(
                    "Tidak_Sesuai.xlsx"
                );

                break;


            case "material":

                exportMaterial(
                    "Material.xlsx"
                );

                break;


            case "material-error":

                exportMaterialError(
                    "Material_Error.xlsx"
                );

                break;


            case "all":

                exportAll(
                    "Report_Checker_Result.xlsx"
                );

                break;


            default:

                throw new Error(
                    "Tipe export tidak dikenal: " +
                    type
                );

        }

    }


    /* =====================================================
       GET STATE
    ===================================================== */

    function getState() {

        return {

            workbook:
                state.workbook,

            sheetName:
                state.sheetName,

            rows:
                state.rows,

            originalRows:
                state.originalRows,

            validationResults:
                state.validationResults,

            sesuai:
                state.sesuai,

            tidakSesuai:
                state.tidakSesuai,

            invalid:
                state.invalid,

            materials:
                state.materials,

            materialError:
                state.materialError,

            materialNotFound:
                state.materialNotFound,

            customMaterials:
                state.customMaterials,

            fileName:
                state.fileName,

            summary: {

                total:
                    state.validationResults.length,

                sesuai:
                    state.sesuai.length,

                tidakSesuai:
                    state.tidakSesuai.length,

                invalid:
                    state.invalid.length,

                material:
                    state.materials.length,

                materialError:
                    state.materialError.length,

                materialNotFound:
                    state.materialNotFound.length,

                customMaterial:
                    state.customMaterials.length

            }

        };

    }


    /* =====================================================
       RESET
    ===================================================== */

    function reset() {

        state.workbook =
            null;

        state.sheetName =
            "";

        state.rows =
            [];

        state.originalRows =
            [];

        state.validationResults =
            [];

        state.sesuai =
            [];

        state.tidakSesuai =
            [];

        state.invalid =
            [];

        state.materials =
            [];

        state.materialError =
            [];

        state.materialNotFound =
            [];

        state.customMaterials =
            [];

        state.fileName =
            "";

    }


    /* =====================================================
       PUBLIC API
    ===================================================== */

    window.ReportCheckerExcel = {

        /*
         * Load Excel
         */

        load:
            loadExcel,


        /*
         * Process workbook
         */

        process:
            processWorkbook,


        /*
         * Header
         */

        validateHeaders:
            validateHeaders,


        /*
         * Ticket
         */

        getTicket:
            getTicket,

        getTTNumber:
            getTTNumber,


        /*
         * CIR
         */

        getCIR:
            getCIR,


        /*
         * State
         */

        getState:
            getState,


        /*
         * Reset
         */

        reset:
            reset,


        /*
         * Export
         */

        exportSesuai:
            exportSesuai,

        exportTidakSesuai:
            exportTidakSesuai,

        exportInvalid:
            exportInvalid,

        exportMaterial:
            exportMaterial,

        exportMaterialError:
            exportMaterialError,

        exportMaterialNotFound:
            exportMaterialNotFound,

        exportCustomMaterial:
            exportCustomMaterial,

        exportAll:
            exportAll,


        /*
         * API utama app.js
         */

        exportResult:
            exportResult,


        /*
         * Headers
         */

        headers:
            EXPECTED_HEADERS,


        /*
         * Constants
         */

        TT_NUMBER_COLUMN_INDEX:
            TT_NUMBER_COLUMN_INDEX,

        CIR_COLUMN_INDEX:
            CIR_COLUMN_INDEX

    };


})();
