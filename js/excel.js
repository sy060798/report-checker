/* =========================================================
   REPORT CHECKER
   excel.js

   VERSION UPDATED

   Fungsi:
   - Upload Excel
   - Baca header A sampai AF
   - TT Number = kolom D
   - Validasi Ticket Release
   - Baca CIR
   - Parse Material
   - Pisahkan SESUAI / TIDAK SESUAI
   - Material menggunakan TT Number
   - Material Error jika CIR ada tetapi material gagal ditemukan
   - Export hasil ke Excel

   COMPATIBLE:
   - index.html terbaru
   - app.js terbaru
   - material-parser.js terbaru
   - validator.js
   - SheetJS XLSX
========================================================= */

(function () {

    "use strict";


    /* =====================================================
       COLUMN CONFIG
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
     * Excel:
     *
     * A = 0
     * B = 1
     * C = 2
     * D = 3
     *
     * Jadi TT Number = index 3.
     */

    const TT_NUMBER_COLUMN_INDEX = 3;


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
       NORMALIZE HEADER
    ===================================================== */

    function normalizeHeader(value) {

        return String(
            value ?? ""
        )
            .replace(/\u00A0/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();

    }


    /* =====================================================
       FIND HEADER
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


    /* =====================================================
       VALIDATE HEADER
    ===================================================== */

    function validateHeaders(
        headers
    ) {

        const result = {

            valid: true,

            missing: [],

            found: [],

            indexes: {}

        };


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
       READ FILE
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

                            const XLSX =
                                getXLSX();


                            const data =
                                new Uint8Array(
                                    event.target.result
                                );


                            const workbook =
                                XLSX.read(
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
            !workbook.SheetNames.length
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
       SHEET TO ARRAY
    ===================================================== */

    function sheetToArray(
        sheet
    ) {

        const XLSX =
            getXLSX();


        return XLSX.utils.sheet_to_json(
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
       SHEET TO OBJECT ROWS
    ===================================================== */

    function sheetToRows(
        sheet
    ) {

        const XLSX =
            getXLSX();


        return XLSX.utils.sheet_to_json(
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
         * Simpan field tambahan.
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
       
       PRIORITAS MUTLAK:
       1. TT Number
       2. fallback index D jika row array
       
       TIDAK menggunakan:
       - Customer Ticket
       - Ref Ticket
    ===================================================== */

    function getTTNumber(
        row
    ) {

        if (!row) {

            return "";

        }


        /*
         * Jika array:
         * kolom D = index 3
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
         * Object hasil SheetJS.
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
                row[field] !==
                undefined &&
                row[field] !==
                null
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
       
       Alias supaya kompatibel dengan kode lama.
       
       Sekarang Ticket = TT Number.
    ===================================================== */

    function getTicket(
        row
    ) {

        return getTTNumber(
            row
        );

    }


    /* =====================================================
       CLEAN VALUE
    ===================================================== */

    function cleanValue(
        value
    ) {

        if (
            value === null ||
            value === undefined
        ) {

            return "";

        }


        return String(value)
            .replace(/\u00A0/g, " ")
            .trim();

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


        if (
            Array.isArray(row)
        ) {

            /*
             * CIR = kolom AF
             * index 31
             */

            return cleanValue(
                row[31]
            );

        }


        return cleanValue(
            row["CIR"]
        );

    }


    /* =====================================================
       MATERIAL PARSER CHECK
    ===================================================== */

    function getMaterialParser() {

        if (
            !window.ReportCheckerMaterial
        ) {

            throw new Error(
                "material-parser.js belum berhasil dimuat."
            );

        }


        return window.ReportCheckerMaterial;

    }


    /* =====================================================
       PARSE MATERIAL
       
       Parser baru:
       
       parse(cirText)
       
       BUKAN:
       
       parse(cirText, ticket)
    ===================================================== */

    function parseMaterials(
        ttNumber,
        cirText
    ) {

        const parser =
            getMaterialParser();


        if (!cirText) {

            return {

                found: false,

                status:
                    ttNumber
                        ? "NO MATERIAL"
                        : "NO TICKET",

                ticket:
                    ttNumber,

                materials: [],

                note:
                    ttNumber
                        ? "CIR tidak berisi material."
                        : "TT Number tidak ditemukan."

            };

        }


        const parsed =
            parser.parse(
                cirText
            );


        const materials =
            Array.isArray(parsed)
                ? parsed
                : [];


        /*
         * Tambahkan TT Number ke setiap material.
         *
         * Material parser sendiri sudah support
         * Ticket, tetapi excel.js tetap memaksa
         * ticket berasal dari TT Number kolom D.
         */

        const rows =
            materials.map(
                function (item) {

                    return {

                        ticket:
                            ttNumber,

                        material:
                            item.material ||
                            "",

                        quantity:
                            item.qty ??
                            item.quantity ??
                            1,

                        unit:
                            item.satuan ||
                            item.unit ||
                            "",

                        code:
                            item.kode ||
                            item.code ||
                            "",

                        score:
                            item.score ??
                            0,

                        raw:
                            item.sourceLine ||
                            item.raw ||
                            ""

                    };

                }
            );


        return {

            found:
                rows.length > 0,

            status:
                rows.length > 0
                    ? "FOUND"
                    : "NO MATERIAL",

            ticket:
                ttNumber,

            materials:
                rows,

            note:
                rows.length
                    ? ""
                    : "Tidak ditemukan material resmi di dalam CIR."

        };

    }


    /* =====================================================
       BUILD NO MATERIAL
    ===================================================== */

    function createNoMaterial(
        ticket,
        note
    ) {

        return {

            ticket:
                ticket || "",

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

            raw:
                "",

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
         * TICKET = TT NUMBER KOLOM D
         */

        const ttNumber =
            getTTNumber(
                normalized
            );


        const cir =
            getCIR(
                normalized
            );


        /* ---------------------------------------------
           VALIDATION
        --------------------------------------------- */

        if (
            !window.ReportCheckerValidator ||
            typeof window
                .ReportCheckerValidator
                .validate !==
                "function"
        ) {

            throw new Error(
                "validator.js belum berhasil dimuat."
            );

        }


        const validation =
            window
                .ReportCheckerValidator
                .validate(
                    normalized
                );


        validation.rowIndex =
            index;


        /*
         * Jangan gunakan Customer Ticket
         * sebagai ticket hasil.
         */

        validation.ticket =
            ttNumber;


        validation.ttNumber =
            ttNumber;


        validation.originalRow =
            normalized;


        /* ---------------------------------------------
           MATERIAL
        --------------------------------------------- */

        const materialResult =
            parseMaterials(
                ttNumber,
                cir
            );


        validation.materialResult =
            materialResult;


        return validation;

    }


    /* =====================================================
       FLATTEN MATERIAL
       
       Pengganti API lama:
       ReportCheckerMaterial.flatten()
       
       Tidak lagi bergantung kepada flatten()
       dari material-parser.js.
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


                /*
                 * Ticket selalu TT Number.
                 */

                const materialRow = {

                    ticket:
                        ticket,

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
                        1,

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
                        0,

                    raw:
                        item.raw ||
                        item.sourceLine ||
                        ""

                };


                /*
                 * Jangan masukkan material tanpa ticket.
                 */

                if (!ticket) {

                    continue;

                }


                output.push(
                    materialRow
                );

            }

        }


        return output;

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


        const headerValidation =
            validateHeaders(
                headers
            );


        if (
            !headerValidation.valid
        ) {

            throw new Error(
                "Header Excel tidak lengkap.\n\n" +
                "Kolom yang belum ditemukan:\n" +
                headerValidation.missing.join(
                    ", "
                )
            );

        }


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


        const normalizedRows =
            rows.map(
                normalizeRow
            );


        /*
         * PROCESS VALIDATION + MATERIAL
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


        /* ---------------------------------------------
           SPLIT VALIDATION
        --------------------------------------------- */

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


        const split =
            window
                .ReportCheckerValidator
                .split(
                    validationResults
                );


        /* ---------------------------------------------
           MATERIAL
        --------------------------------------------- */

        const materialResults =
            validationResults.map(
                function (item) {

                    return item.materialResult;

                }
            );


        const materialRows =
            flattenMaterialResults(
                materialResults
            );


        /* ---------------------------------------------
           MATERIAL ERROR / NOT FOUND
        --------------------------------------------- */

        const materialError =
            [];


        for (
            const item
            of validationResults
        ) {

            const ttNumber =
                cleanValue(
                    item?.ttNumber ||
                    item?.ticket
                );


            if (!ttNumber) {

                continue;

            }


            const materialResult =
                item?.materialResult;


            if (
                !materialResult ||
                !materialResult.found
            ) {

                materialError.push(
                    createNoMaterial(
                        ttNumber,
                        materialResult?.note
                    )
                );

            }

        }


        /* ---------------------------------------------
           CUSTOM MATERIAL
           
           Parser versi sekarang hanya memakai
           MATERIAL_MASTER resmi.

           Tetap disediakan agar kompatibel.
        --------------------------------------------- */

        const customMaterials =
            materialRows.filter(
                function (item) {

                    return (
                        String(
                            item.type ||
                            ""
                        ).toUpperCase() ===
                        "CUSTOM"
                    );

                }
            );


        /* ---------------------------------------------
           SAVE STATE
        --------------------------------------------- */

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
            Array.isArray(
                split.sesuai
            )
                ? split.sesuai
                : [];


        state.tidakSesuai =
            Array.isArray(
                split.tidakSesuai
            )
                ? split.tidakSesuai
                : [];


        state.invalid =
            Array.isArray(
                split.invalid
            )
                ? split.invalid
                : [];


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


        /* ---------------------------------------------
           RESULT
        --------------------------------------------- */

        return {

            workbook:
                workbook,

            sheetName:
                firstSheet.name,

            rows:
                normalizedRows,

            validation:
                validationResults,

            validationResults:
                validationResults,

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
                    validationResults.length,

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
       LOAD EXCEL
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
       CREATE WORKSHEET
    ===================================================== */

    function createWorksheet(
        rows,
        headers
    ) {

        const XLSX =
            getXLSX();


        const data = [

            headers,

            ...(rows || []).map(
                function (row) {

                    return headers.map(
                        function (header) {

                            return (
                                row?.[header] ??
                                ""
                            );

                        }
                    );

                }
            )

        ];


        return XLSX.utils.aoa_to_sheet(
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

        const XLSX =
            getXLSX();


        const workbook =
            XLSX.utils.book_new();


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


        XLSX.utils.book_append_sheet(
            workbook,
            sheet,
            (
                sheetName ||
                "Data"
            ).substring(
                0,
                31
            )
        );


        XLSX.writeFile(
            workbook,
            fileName
        );

    }


    /* =====================================================
       VALIDATION EXPORT ROW
    ===================================================== */

    function makeValidationExportRows(
        source
    ) {

        return (
            source || []
        ).map(
            function (item) {

                return {

                    ...(
                        item?.originalRow ||
                        {}
                    ),

                    "TT Release":
                        item?.releaseDateTime ||
                        "",

                    "Validation Status":
                        item?.status ||
                        "",

                    "Validation Note":
                        item?.reason ||
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
       MATERIAL EXPORT ROW
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


    /* =====================================================
       EXPORT MATERIAL
    ===================================================== */

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
       EXPORT MATERIAL ERROR
    ===================================================== */

    function exportMaterialError(
        fileName
    ) {

        const rows =
            state.materialError
                .filter(
                    function (item) {

                        return (
                            item &&
                            cleanValue(
                                item.ticket
                            )
                        );

                    }
                );


        downloadWorkbook(
            rows,
            [
                "ticket",
                "material",
                "originalMaterial",
                "quantity",
                "unit",
                "code",
                "type",
                "matchedAlias",
                "raw",
                "reason"

            ],
            fileName ||
            "material_error.xlsx",
            "MATERIAL ERROR"
        );

    }


    /* =====================================================
       EXPORT MATERIAL NOT FOUND
       
       Alias lama.
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
       EXPORT CUSTOM MATERIAL
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

        const XLSX =
            getXLSX();


        const workbook =
            XLSX.utils.book_new();


        /*
         * HELPER APPEND
         */

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


            XLSX.utils.book_append_sheet(
                workbook,
                sheet,
                name.substring(
                    0,
                    31
                )
            );

        }


        /*
         * SESUAI
         */

        const sesuaiRows =
            makeValidationExportRows(
                state.sesuai
            );


        appendSheet(
            sesuaiRows,
            validationHeaders(),
            "SESUAI"
        );


        /*
         * TIDAK SESUAI
         */

        const tidakRows =
            makeValidationExportRows(
                state.tidakSesuai
            );


        appendSheet(
            tidakRows,
            validationHeaders(),
            "TIDAK SESUAI"
        );


        /*
         * INVALID
         */

        const invalidRows =
            makeValidationExportRows(
                state.invalid
            );


        appendSheet(
            invalidRows,
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

        const materialErrorRows =
            state.materialError
                .filter(
                    function (item) {

                        return (
                            item &&
                            cleanValue(
                                item.ticket
                            )
                        );

                    }
                );


        appendSheet(
            materialErrorRows,
            [
                "ticket",
                "material",
                "originalMaterial",
                "quantity",
                "unit",
                "code",
                "type",
                "matchedAlias",
                "raw",
                "reason"

            ],
            "MATERIAL ERROR"
        );


        /*
         * CUSTOM
         */

        appendSheet(
            state.customMaterials.map(
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
            ),
            materialHeaders(),
            "CUSTOM"
        );


        /*
         * DOWNLOAD
         */

        XLSX.writeFile(
            workbook,
            fileName ||
            "report_checker_result.xlsx"
        );

    }


    /* =====================================================
       EXPORT RESULT
       
       Dipakai app.js:
       excel.exportResult(type)
    ===================================================== */

    function exportResult(
        type
    ) {

        switch (
            String(
                type || ""
            ).toLowerCase()
        ) {

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
                    state.materialError.length

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

        load:
            loadExcel,

        process:
            processWorkbook,

        validateHeaders:
            validateHeaders,

        getTicket:
            getTicket,

        getTTNumber:
            getTTNumber,

        getState:
            getState,

        reset:
            reset,

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
         * Dipakai oleh app.js
         */

        exportResult:
            exportResult,

        headers:
            EXPECTED_HEADERS

    };


})();
