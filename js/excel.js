/* =========================================================
   REPORT CHECKER
   excel.js

   Fungsi:
   - Upload Excel
   - Baca header A sampai AF
   - Validasi data
   - Baca CIR
   - Ambil TT Release
   - Pisahkan SESUAI / TIDAK SESUAI
   - Ambil MATERIAL
   - Siapkan data untuk export Excel

   REQUIREMENT:
   SheetJS / XLSX harus sudah diload di HTML.

   Contoh:
   <script src="https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js"></script>
   <script src="js/material-parser.js"></script>
   <script src="js/validator.js"></script>
   <script src="js/excel.js"></script>
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


    /* =====================================================
       STATE
    ===================================================== */

    const state = {

        workbook:
            null,

        sheetName:
            "",

        rows:
            [],

        originalRows:
            [],

        validationResults:
            [],

        sesuai:
            [],

        tidakSesuai:
            [],

        invalid:
            [],

        materials:
            [],

        materialNotFound:
            [],

        customMaterials:
            [],

        fileName:
            ""

    };


    /* =====================================================
       GET XLSX
    ===================================================== */

    function getXLSX() {

        if (
            typeof XLSX !==
            "undefined"
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

    function normalizeHeader(
        value
    ) {

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
       CHECK HEADER
    ===================================================== */

    function validateHeaders(
        headers
    ) {

        const result = {

            valid:
                true,

            missing:
                [],

            found:
                [],

            indexes:
                {}

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

    function readFile(
        file
    ) {

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
                                        type:
                                            "array",

                                        cellDates:
                                            true,

                                        raw:
                                            true
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
       GET FIRST SHEET
    ===================================================== */

    function getFirstSheet(
        workbook
    ) {

        if (
            !workbook ||
            !Array.isArray(
                workbook.SheetNames
            ) ||
            workbook.SheetNames.length ===
                0
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


        return {

            name:
                sheetName,

            sheet:
                sheet

        };

    }


    /* =====================================================
       SHEET TO JSON
    ===================================================== */

    function sheetToRows(
        sheet
    ) {

        const XLSX =
            getXLSX();


        return XLSX.utils.sheet_to_json(
            sheet,
            {

                defval:
                    "",

                raw:
                    true,

                blankrows:
                    false

            }
        );

    }


    /* =====================================================
       CONVERT ARRAY ROW
    ===================================================== */

    function sheetToArray(
        sheet
    ) {

        const XLSX =
            getXLSX();


        return XLSX.utils.sheet_to_json(
            sheet,
            {

                header:
                    1,

                defval:
                    "",

                raw:
                    true,

                blankrows:
                    false

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
         * Simpan kolom lain juga jika ada.
         */

        if (row) {

            for (
                const key
                of Object.keys(row)
            ) {

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

        }


        return output;

    }


    /* =====================================================
       GET TICKET
       
       Prioritas:
       1. Customer Ticket
       2. TT Number
       3. Ticket
       4. Ref Ticket
    ===================================================== */

    function getTicket(
        row
    ) {

        const candidates = [

            row?.["Customer Ticket"],

            row?.["TT Number"],

            row?.["Ticket"],

            row?.["Ref Ticket"]

        ];


        for (
            const value
            of candidates
        ) {

            const ticket =
                String(
                    value ?? ""
                ).trim();


            if (ticket) {

                return ticket;

            }

        }


        return "";

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


        const ticket =
            getTicket(
                normalized
            );


        /*
         * Pastikan Customer Ticket terisi
         * jika Ticket hanya berada di TT Number.
         */

        if (
            !String(
                normalized[
                    "Customer Ticket"
                ] || ""
            ).trim() &&
            ticket
        ) {

            normalized[
                "Customer Ticket"
            ] =
                ticket;

        }


        const validation =
            window
                .ReportCheckerValidator
                .validate(
                    normalized
                );


        validation.rowIndex =
            index;


        validation.ticket =
            ticket;


        validation.originalRow =
            normalized;


        /*
         * Material parser
         */

        let materialResult = {

            found:
                false,

            status:
                "NO TICKET",

            ticket:
                ticket,

            materials:
                [],

            customMaterials:
                [],

            rawLines:
                [],

            note:
                ""

        };


        if (
            ticket &&
            window.ReportCheckerMaterial
        ) {

            materialResult =
                window
                    .ReportCheckerMaterial
                    .parse(
                        normalized["CIR"],
                        ticket
                    );

        }


        validation.materialResult =
            materialResult;


        return validation;

    }


    /* =====================================================
       PROCESS WORKBOOK
    ===================================================== */

    function processWorkbook(
        workbook,
        fileName
    ) {

        if (
            !workbook
        ) {

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
                "Header Excel tidak lengkap. Kolom yang belum ditemukan: " +
                headerValidation.missing.join(
                    ", "
                )
            );

        }


        const rows =
            sheetToRows(
                firstSheet.sheet
            );


        const normalizedRows =
            rows.map(
                normalizeRow
            );


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


        const split =
            window
                .ReportCheckerValidator
                .split(
                    validationResults
                );


        /*
         * MATERIAL
         */

        const materialResults =
            validationResults.map(
                function (
                    item
                ) {

                    return item
                        .materialResult;

                }
            );


        const materialRows =
            window
                .ReportCheckerMaterial
                .flatten(
                    materialResults
                );


        /*
         * CUSTOM MATERIAL
         */

        const customMaterials =
            materialRows.filter(
                function (item) {

                    return (
                        item.type ===
                        "CUSTOM"
                    );

                }
            );


        /*
         * TICKET TANPA MATERIAL
         */

        const materialNotFound =
            validationResults
                .map(
                    function (
                        item
                    ) {

                        if (
                            !item.ticket
                        ) {

                            return null;

                        }


                        const materialResult =
                            item.materialResult;


                        if (
                            !materialResult ||
                            !materialResult.found
                        ) {

                            return (
                                window
                                    .ReportCheckerMaterial
                                    .createNoMaterial(
                                        item.ticket,
                                        materialResult?.note
                                    )
                            );

                        }


                        return null;

                    }
                )
                .filter(Boolean);


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
            split.sesuai;


        state.tidakSesuai =
            split.tidakSesuai;


        state.invalid =
            split.invalid;


        state.materials =
            materialRows;


        state.materialNotFound =
            materialNotFound;


        state.customMaterials =
            customMaterials;


        state.fileName =
            fileName ||
            "report.xlsx";


        return {

            workbook:
                workbook,

            sheetName:
                firstSheet.name,

            rows:
                normalizedRows,

            validation:
                validationResults,

            sesuai:
                split.sesuai,

            tidakSesuai:
                split.tidakSesuai,

            invalid:
                split.invalid,

            materials:
                materialRows,

            materialNotFound:
                materialNotFound,

            customMaterials:
                customMaterials,

            summary: {

                total:
                    validationResults.length,

                sesuai:
                    split.sesuai.length,

                tidakSesuai:
                    split.tidakSesuai.length,

                invalid:
                    split.invalid.length,

                material:
                    materialRows.length,

                materialNotFound:
                    materialNotFound.length,

                customMaterial:
                    customMaterials.length

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


        let data;


        if (
            Array.isArray(
                headers
            )
        ) {

            data = [

                headers,

                ...rows.map(
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

        }

        else {

            data =
                rows;

        }


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
                of rows
            ) {

                const value =
                    String(
                        row?.[headers[i]] ??
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
       EXPORT SESUAI
    ===================================================== */

    function exportSesuai(
        fileName
    ) {

        const rows =
            state.sesuai.map(
                function (item) {

                    const row = {

                        ...item.originalRow,

                        "TT Release":
                            item.releaseDateTime,

                        "Validation Status":
                            item.status,

                        "Validation Note":
                            item.reason

                    };


                    return row;

                }
            );


        downloadWorkbook(
            rows,
            [
                ...EXPECTED_HEADERS,

                "TT Release",
                "Validation Status",
                "Validation Note"

            ],
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
            state.tidakSesuai.map(
                function (item) {

                    return {

                        ...item.originalRow,

                        "TT Release":
                            item.releaseDateTime,

                        "Validation Status":
                            item.status,

                        "Validation Note":
                            item.reason

                    };

                }
            );


        downloadWorkbook(
            rows,
            [
                ...EXPECTED_HEADERS,

                "TT Release",
                "Validation Status",
                "Validation Note"

            ],
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
            state.invalid.map(
                function (item) {

                    return {

                        ...item.originalRow,

                        "TT Release":
                            item.releaseDateTime,

                        "Validation Status":
                            item.status,

                        "Validation Note":
                            item.reason

                    };

                }
            );


        downloadWorkbook(
            rows,
            [
                ...EXPECTED_HEADERS,

                "TT Release",
                "Validation Status",
                "Validation Note"

            ],
            fileName ||
            "hasil_invalid.xlsx",

            "INVALID"
        );

    }


    /* =====================================================
       EXPORT MATERIAL
       
       Format:
       Ticket
       Material
       Original Material
       Quantity
       Unit
       Code
       Type
       Matched Alias
    ===================================================== */

    function exportMaterial(
        fileName
    ) {

        const rows =
            state.materials
                .filter(
                    function (item) {

                        /*
                         * TICKET WAJIB ADA
                         */

                        return (
                            item &&
                            item.ticket &&
                            String(
                                item.ticket
                            ).trim()
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

                            "Raw":
                                item.raw

                        };

                    }
                );


        downloadWorkbook(
            rows,
            [
                "Ticket",
                "Material",
                "Original Material",
                "Quantity",
                "Unit",
                "Code",
                "Type",
                "Matched Alias",
                "Raw"

            ],
            fileName ||
            "hasil_material.xlsx",

            "MATERIAL"
        );

    }


    /* =====================================================
       EXPORT MATERIAL NOT FOUND
    ===================================================== */

    function exportMaterialNotFound(
        fileName
    ) {

        const rows =
            state.materialNotFound
                .filter(
                    function (item) {

                        return (
                            item &&
                            item.ticket
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
                "reason"

            ],
            fileName ||
            "material_not_found.xlsx",

            "NOT FOUND"
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
                            item.ticket
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

                            "Raw":
                                item.raw

                        };

                    }
                );


        downloadWorkbook(
            rows,
            [
                "Ticket",
                "Material",
                "Original Material",
                "Quantity",
                "Unit",
                "Code",
                "Type",
                "Matched Alias",
                "Raw"

            ],
            fileName ||
            "material_custom.xlsx",

            "CUSTOM"
        );

    }


    /* =====================================================
       EXPORT ALL RESULTS
       
       Satu file dengan beberapa sheet:
       - SESUAI
       - TIDAK SESUAI
       - INVALID
       - MATERIAL
       - MATERIAL NOT FOUND
       - CUSTOM MATERIAL
    ===================================================== */

    function exportAll(
        fileName
    ) {

        const XLSX =
            getXLSX();


        const workbook =
            XLSX.utils.book_new();


        /* ---------------------------------------------
           SESUAI
        --------------------------------------------- */

        const sesuaiRows =
            state.sesuai.map(
                function (item) {

                    return {

                        ...item.originalRow,

                        "TT Release":
                            item.releaseDateTime,

                        "Validation Status":
                            item.status,

                        "Validation Note":
                            item.reason

                    };

                }
            );


        const sesuaiSheet =
            createWorksheet(
                sesuaiRows,
                [
                    ...EXPECTED_HEADERS,

                    "TT Release",
                    "Validation Status",
                    "Validation Note"

                ]
            );


        autoWidth(
            sesuaiSheet,
            sesuaiRows,
            [
                ...EXPECTED_HEADERS,

                "TT Release",
                "Validation Status",
                "Validation Note"

            ]
        );


        XLSX.utils.book_append_sheet(
            workbook,
            sesuaiSheet,
            "SESUAI"
        );


        /* ---------------------------------------------
           TIDAK SESUAI
        --------------------------------------------- */

        const tidakRows =
            state.tidakSesuai.map(
                function (item) {

                    return {

                        ...item.originalRow,

                        "TT Release":
                            item.releaseDateTime,

                        "Validation Status":
                            item.status,

                        "Validation Note":
                            item.reason

                    };

                }
            );


        const tidakSheet =
            createWorksheet(
                tidakRows,
                [
                    ...EXPECTED_HEADERS,

                    "TT Release",
                    "Validation Status",
                    "Validation Note"

                ]
            );


        autoWidth(
            tidakSheet,
            tidakRows,
            [
                ...EXPECTED_HEADERS,

                "TT Release",
                "Validation Status",
                "Validation Note"

            ]
        );


        XLSX.utils.book_append_sheet(
            workbook,
            tidakSheet,
            "TIDAK SESUAI"
        );


        /* ---------------------------------------------
           INVALID
        --------------------------------------------- */

        const invalidRows =
            state.invalid.map(
                function (item) {

                    return {

                        ...item.originalRow,

                        "TT Release":
                            item.releaseDateTime,

                        "Validation Status":
                            item.status,

                        "Validation Note":
                            item.reason

                    };

                }
            );


        const invalidSheet =
            createWorksheet(
                invalidRows,
                [
                    ...EXPECTED_HEADERS,

                    "TT Release",
                    "Validation Status",
                    "Validation Note"

                ]
            );


        autoWidth(
            invalidSheet,
            invalidRows,
            [
                ...EXPECTED_HEADERS,

                "TT Release",
                "Validation Status",
                "Validation Note"

            ]
        );


        XLSX.utils.book_append_sheet(
            workbook,
            invalidSheet,
            "INVALID"
        );


        /* ---------------------------------------------
           MATERIAL
        --------------------------------------------- */

        const materialRows =
            state.materials
                .filter(
                    function (item) {

                        return (
                            item &&
                            item.ticket
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

                            "Raw":
                                item.raw

                        };

                    }
                );


        const materialHeaders = [

            "Ticket",
            "Material",
            "Original Material",
            "Quantity",
            "Unit",
            "Code",
            "Type",
            "Matched Alias",
            "Raw"

        ];


        const materialSheet =
            createWorksheet(
                materialRows,
                materialHeaders
            );


        autoWidth(
            materialSheet,
            materialRows,
            materialHeaders
        );


        XLSX.utils.book_append_sheet(
            workbook,
            materialSheet,
            "MATERIAL"
        );


        /* ---------------------------------------------
           MATERIAL NOT FOUND
        --------------------------------------------- */

        const notFoundRows =
            state.materialNotFound
                .filter(
                    function (item) {

                        return (
                            item &&
                            item.ticket
                        );

                    }
                );


        const notFoundHeaders = [

            "ticket",
            "material",
            "originalMaterial",
            "quantity",
            "unit",
            "code",
            "type",
            "reason"

        ];


        const notFoundSheet =
            createWorksheet(
                notFoundRows,
                notFoundHeaders
            );


        autoWidth(
            notFoundSheet,
            notFoundRows,
            notFoundHeaders
        );


        XLSX.utils.book_append_sheet(
            workbook,
            notFoundSheet,
            "NOT FOUND"
        );


        /* ---------------------------------------------
           CUSTOM MATERIAL
        --------------------------------------------- */

        const customRows =
            state.customMaterials
                .filter(
                    function (item) {

                        return (
                            item &&
                            item.ticket
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

                            "Raw":
                                item.raw

                        };

                    }
                );


        const customHeaders = [

            "Ticket",
            "Material",
            "Original Material",
            "Quantity",
            "Unit",
            "Code",
            "Type",
            "Matched Alias",
            "Raw"

        ];


        const customSheet =
            createWorksheet(
                customRows,
                customHeaders
            );


        autoWidth(
            customSheet,
            customRows,
            customHeaders
        );


        XLSX.utils.book_append_sheet(
            workbook,
            customSheet,
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

            materialNotFound:
                state.materialNotFound,

            customMaterials:
                state.customMaterials,

            fileName:
                state.fileName

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
         * Header validation
         */
        validateHeaders:
            validateHeaders,

        /*
         * Get ticket
         */
        getTicket:
            getTicket,

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
         * Export individual
         */
        exportSesuai:
            exportSesuai,

        exportTidakSesuai:
            exportTidakSesuai,

        exportInvalid:
            exportInvalid,

        exportMaterial:
            exportMaterial,

        exportMaterialNotFound:
            exportMaterialNotFound,

        exportCustomMaterial:
            exportCustomMaterial,

        /*
         * Export semua dalam 1 workbook
         */
        exportAll:
            exportAll,

        /*
         * Config
         */
        headers:
            EXPECTED_HEADERS

    };


})();
