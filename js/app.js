/* =========================================================
   REPORT CHECKER
   app.js

   FULL VERSION
   Integrasi:
   - material-parser.js
   - validator.js

   FITUR:
   - Upload Excel
   - Baca worksheet
   - Deteksi header
   - TT Number dari kolom "TT Number"
   - Datetime Receive
   - CIR
   - Validasi TT Release
   - Parse material dari CIR
   - Material hanya dari MASTER LIST
   - Material excluded otomatis ditolak
   - Status SESUAI / TIDAK SESUAI / INVALID
   - Tabel hasil
   - Summary
   - Export Excel
========================================================= */

(function () {

    "use strict";


    /* =====================================================
       GLOBAL STATE
    ===================================================== */

    const state = {

        workbook: null,

        worksheet: null,

        rows: [],

        results: [],

        materialRows: [],

        combinedRows: [],

        headers: [],

        fileName: "",

        sheetName: "",

        initialized: false

    };


    /* =====================================================
       DOM HELPER
    ===================================================== */

    function $(selector) {

        return document.querySelector(
            selector
        );

    }


    function $$(selector) {

        return Array.from(
            document.querySelectorAll(
                selector
            )
        );

    }


    function byId(id) {

        return document.getElementById(
            id
        );

    }


    /* =====================================================
       ELEMENT FINDER
    ===================================================== */

    function findElement(
        selectors
    ) {

        for (
            const selector
            of selectors
        ) {

            const element =
                document.querySelector(
                    selector
                );

            if (element) {

                return element;

            }

        }

        return null;

    }


    /* =====================================================
       GET UI ELEMENTS
    ===================================================== */

    function getUI() {

        return {

            fileInput:
                findElement([
                    "#fileInput",
                    "#excelFile",
                    "#uploadFile",
                    "input[type='file']"
                ]),

            sheetSelect:
                findElement([
                    "#sheetSelect",
                    "#sheetName",
                    "#worksheetSelect"
                ]),

            uploadButton:
                findElement([
                    "#uploadBtn",
                    "#btnUpload",
                    "#processBtn"
                ]),

            validateButton:
                findElement([
                    "#validateBtn",
                    "#btnValidate",
                    "#checkBtn"
                ]),

            exportButton:
                findElement([
                    "#exportBtn",
                    "#btnExport",
                    "#downloadBtn"
                ]),

            exportSesuaiButton:
                findElement([
                    "#exportSesuaiBtn",
                    "#btnExportSesuai"
                ]),

            exportTidakSesuaiButton:
                findElement([
                    "#exportTidakSesuaiBtn",
                    "#btnExportTidakSesuai"
                ]),

            status:
                findElement([
                    "#status",
                    "#statusText",
                    "#message"
                ]),

            loading:
                findElement([
                    "#loading",
                    "#loader"
                ]),

            table:
                findElement([
                    "#resultTable",
                    "#resultsTable",
                    "#dataTable"
                ]),

            tableBody:
                findElement([
                    "#resultTableBody",
                    "#resultsTableBody",
                    "#tableBody"
                ]),

            summary:
                findElement([
                    "#summary",
                    "#summaryContainer"
                ]),

            total:
                findElement([
                    "#total",
                    "#totalCount"
                ]),

            sesuai:
                findElement([
                    "#sesuai",
                    "#sesuaiCount"
                ]),

            tidakSesuai:
                findElement([
                    "#tidakSesuai",
                    "#tidakSesuaiCount"
                ]),

            invalid:
                findElement([
                    "#invalid",
                    "#invalidCount"
                ]),

            fileName:
                findElement([
                    "#fileName",
                    "#selectedFile"
                ])

        };

    }


    /* =====================================================
       UI
    ===================================================== */

    function setStatus(
        message,
        type
    ) {

        const ui =
            getUI();

        if (!ui.status) {

            return;

        }


        ui.status.textContent =
            message || "";


        ui.status.className =
            "status";


        if (type) {

            ui.status.classList.add(
                type
            );

        }

    }


    function setLoading(
        loading
    ) {

        const ui =
            getUI();


        if (ui.loading) {

            ui.loading.style.display =
                loading
                    ? ""
                    : "none";

        }

    }


    function setDisabled(
        element,
        disabled
    ) {

        if (!element) {

            return;

        }


        element.disabled =
            !!disabled;

    }


    /* =====================================================
       CHECK DEPENDENCIES
    ===================================================== */

    function checkDependencies() {

        if (
            typeof XLSX ===
            "undefined"
        ) {

            console.error(
                "XLSX library tidak ditemukan."
            );

            setStatus(
                "Library XLSX belum tersedia.",
                "error"
            );

            return false;

        }


        if (
            !window.ReportCheckerMaterial
        ) {

            console.error(
                "material-parser.js belum dimuat."
            );

            setStatus(
                "material-parser.js belum tersedia.",
                "error"
            );

            return false;

        }


        if (
            !window.ReportCheckerValidator
        ) {

            console.error(
                "validator.js belum dimuat."
            );

            setStatus(
                "validator.js belum tersedia.",
                "error"
            );

            return false;

        }


        return true;

    }


    /* =====================================================
       NORMALIZE HEADER
    ===================================================== */

    function normalizeHeader(
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

            .replace(/\s+/g, " ")

            .trim()

            .toLowerCase();

    }


    /* =====================================================
       FIND HEADER
    ===================================================== */

    function findHeader(
        headers,
        names
    ) {

        if (
            !Array.isArray(headers)
        ) {

            return null;

        }


        const wanted =
            names.map(
                normalizeHeader
            );


        for (
            const header
            of headers
        ) {

            const normalized =
                normalizeHeader(
                    header
                );


            if (
                wanted.includes(
                    normalized
                )
            ) {

                return header;

            }

        }


        return null;

    }


    /* =====================================================
       REQUIRED COLUMNS
    ===================================================== */

    function detectColumns(
        rows
    ) {

        if (
            !Array.isArray(rows) ||
            !rows.length
        ) {

            return {

                ttNumber: null,

                datetimeReceive: null,

                cir: null

            };

        }


        const headers =
            Object.keys(
                rows[0] || {}
            );


        return {

            ttNumber:
                findHeader(
                    headers,
                    [
                        "TT Number",
                        "TT number",
                        "TT_NUMBER",
                        "TT_Number"
                    ]
                ),

            datetimeReceive:
                findHeader(
                    headers,
                    [
                        "Datetime Receive",
                        "Datetime receive",
                        "DateTime Receive",
                        "Receive Datetime",
                        "Receive Date",
                        "Datetime"
                    ]
                ),

            cir:
                findHeader(
                    headers,
                    [
                        "CIR",
                        "cir",
                        "CIR Text",
                        "CIR_TEXT"
                    ]
                )

        };

    }


    /* =====================================================
       NORMALIZE INPUT ROW
       
       Penting:
       Validator hanya membaca:
       "TT Number"
       "Datetime Receive"
       "CIR"
    ===================================================== */

    function normalizeInputRow(
        row,
        columns
    ) {

        const output = {

            "TT Number":
                "",

            "Datetime Receive":
                "",

            "CIR":
                "",

            originalRow:
                row

        };


        if (!row) {

            return output;

        }


        if (
            columns.ttNumber
        ) {

            output["TT Number"] =
                row[
                    columns.ttNumber
                ];

        }


        if (
            columns.datetimeReceive
        ) {

            output[
                "Datetime Receive"
            ] =
                row[
                    columns.datetimeReceive
                ];

        }


        if (
            columns.cir
        ) {

            output["CIR"] =
                row[
                    columns.cir
                ];

        }


        return output;

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

                const reader =
                    new FileReader();


                reader.onload =
                    function (event) {

                        try {

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
                                        cellNF:
                                            false,
                                        cellText:
                                            false
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
                                "Gagal membaca file."
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
       WORKSHEET TO JSON
    ===================================================== */

    function worksheetToJSON(
        worksheet
    ) {

        if (!worksheet) {

            return [];

        }


        return XLSX.utils.sheet_to_json(
            worksheet,
            {

                defval: "",

                raw: true,

                blankrows: false

            }
        );

    }


    /* =====================================================
       GET SHEET NAMES
    ===================================================== */

    function getSheetNames(
        workbook
    ) {

        if (
            !workbook ||
            !Array.isArray(
                workbook.SheetNames
            )
        ) {

            return [];

        }


        return workbook.SheetNames.slice();

    }


    /* =====================================================
       POPULATE SHEET SELECT
    ===================================================== */

    function populateSheetSelect(
        workbook
    ) {

        const ui =
            getUI();


        if (!ui.sheetSelect) {

            return;

        }


        const names =
            getSheetNames(
                workbook
            );


        ui.sheetSelect.innerHTML =
            "";


        names.forEach(
            function (name, index) {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    name;


                option.textContent =
                    name;


                if (
                    index === 0
                ) {

                    option.selected =
                        true;

                }


                ui.sheetSelect.appendChild(
                    option
                );

            }
        );


        ui.sheetSelect.disabled =
            names.length <= 1;

    }


    /* =====================================================
       LOAD SELECTED SHEET
    ===================================================== */

    function loadSheet(
        sheetName
    ) {

        if (
            !state.workbook
        ) {

            return false;

        }


        const worksheet =
            state.workbook.Sheets[
                sheetName
            ];


        if (!worksheet) {

            setStatus(
                "Worksheet tidak ditemukan.",
                "error"
            );

            return false;

        }


        const rows =
            worksheetToJSON(
                worksheet
            );


        state.worksheet =
            worksheet;


        state.rows =
            rows;


        state.sheetName =
            sheetName;


        state.headers =
            rows.length
                ? Object.keys(
                    rows[0]
                )
                : [];


        return true;

    }


    /* =====================================================
       VALIDATE REQUIRED COLUMNS
    ===================================================== */

    function validateColumns(
        rows
    ) {

        const columns =
            detectColumns(
                rows
            );


        if (
            !columns.ttNumber
        ) {

            return {

                valid:
                    false,

                error:
                    'Kolom "TT Number" tidak ditemukan.',

                columns:
                    columns

            };

        }


        if (
            !columns.datetimeReceive
        ) {

            return {

                valid:
                    false,

                error:
                    'Kolom "Datetime Receive" tidak ditemukan.',

                columns:
                    columns

            };

        }


        if (
            !columns.cir
        ) {

            return {

                valid:
                    false,

                error:
                    'Kolom "CIR" tidak ditemukan.',

                columns:
                    columns

            };

        }


        return {

            valid:
                true,

            error:
                "",

            columns:
                columns

        };

    }


    /* =====================================================
       PROCESS DATA
    ===================================================== */

    function processData() {

        if (
            !state.rows.length
        ) {

            setStatus(
                "Tidak ada data.",
                "error"
            );

            return [];

        }


        const columnCheck =
            validateColumns(
                state.rows
            );


        if (
            !columnCheck.valid
        ) {

            setStatus(
                columnCheck.error,
                "error"
            );

            return [];

        }


        const normalizedRows =
            state.rows.map(
                function (row) {

                    return normalizeInputRow(
                        row,
                        columnCheck.columns
                    );

                }
            );


        const results =
            window.ReportCheckerValidator
                .validateRows(
                    normalizedRows
                );


        state.results =
            results;


        /*
         * Material parser diproses
         * secara terpisah.
         */

        const materialRows = [];


        normalizedRows.forEach(
            function (row) {

                const parsed =
                    window.ReportCheckerMaterial
                        .buildRows(
                            row,
                            "CIR"
                        );


                materialRows.push(
                    ...parsed
                );

            }
        );


        state.materialRows =
            materialRows;


        /*
         * Gabungkan informasi validation
         * dengan material.
         */

        state.combinedRows =
            buildCombinedRows(
                normalizedRows,
                results,
                materialRows
            );


        return results;

    }


    /* =====================================================
       BUILD COMBINED ROWS
    ===================================================== */

    function buildCombinedRows(
        sourceRows,
        validationResults,
        materialRows
    ) {

        const output = [];


        for (
            let i = 0;
            i < validationResults.length;
            i++
        ) {

            const validation =
                validationResults[i];


            const source =
                sourceRows[i] || {};


            const ticket =
                validation.ticket ||
                "";


            const matchingMaterials =
                materialRows.filter(
                    function (material) {

                        return (
                            String(
                                material.ticket ||
                                ""
                            ).trim() ===
                            String(
                                ticket
                            ).trim()
                        );

                    }
                );


            if (
                matchingMaterials.length
            ) {

                matchingMaterials.forEach(
                    function (
                        material
                    ) {

                        output.push({

                            "TT Number":
                                ticket,

                            "Datetime Receive":
                                validation
                                    .receiveDateFormatted,

                            "TT Release":
                                validation
                                    .releaseDateTime,

                            "Status":
                                validation
                                    .status,

                            "Keterangan":
                                validation
                                    .reason,

                            "Material":
                                material.material,

                            "Quantity":
                                material.quantity,

                            "Satuan":
                                material.unit,

                            "Material Score":
                                material.score,

                            "CIR":
                                source.CIR ||
                                "",

                            "Release Raw":
                                validation
                                    .releaseRaw

                        });

                    }
                );

            } else {

                output.push({

                    "TT Number":
                        ticket,

                    "Datetime Receive":
                        validation
                            .receiveDateFormatted,

                    "TT Release":
                        validation
                            .releaseDateTime,

                    "Status":
                        validation
                            .status,

                    "Keterangan":
                        validation
                            .reason,

                    "Material":
                        "",

                    "Quantity":
                        "",

                    "Satuan":
                        "",

                    "Material Score":
                        "",

                    "CIR":
                        source.CIR ||
                        "",

                    "Release Raw":
                        validation
                            .releaseRaw

                });

            }

        }


        return output;

    }


    /* =====================================================
       RENDER SUMMARY
    ===================================================== */

    function renderSummary(
        results
    ) {

        const summary =
            window.ReportCheckerValidator
                .summary(
                    results
                );


        const ui =
            getUI();


        if (ui.total) {

            ui.total.textContent =
                summary.total;

        }


        if (ui.sesuai) {

            ui.sesuai.textContent =
                summary.sesuai;

        }


        if (ui.tidakSesuai) {

            ui.tidakSesuai.textContent =
                summary.tidakSesuai;

        }


        if (ui.invalid) {

            ui.invalid.textContent =
                summary.invalid;

        }


        if (ui.summary) {

            ui.summary.dataset.total =
                summary.total;

            ui.summary.dataset.sesuai =
                summary.sesuai;

            ui.summary.dataset.tidakSesuai =
                summary.tidakSesuai;

            ui.summary.dataset.invalid =
                summary.invalid;

        }


        return summary;

    }


    /* =====================================================
       ESCAPE HTML
    ===================================================== */

    function escapeHTML(
        value
    ) {

        if (
            value === null ||
            value === undefined
        ) {

            return "";

        }


        return String(value)

            .replace(
                /&/g,
                "&amp;"
            )

            .replace(
                /</g,
                "&lt;"
            )

            .replace(
                />/g,
                "&gt;"
            )

            .replace(
                /"/g,
                "&quot;"
            )

            .replace(
                /'/g,
                "&#039;"
            );

    }


    /* =====================================================
       STATUS CLASS
    ===================================================== */

    function getStatusClass(
        status
    ) {

        switch (
            String(
                status || ""
            ).toUpperCase()
        ) {

            case "SESUAI":

                return "sesuai";

            case "TIDAK SESUAI":

                return "tidak-sesuai";

            case "INVALID":

                return "invalid";

            default:

                return "";

        }

    }


    /* =====================================================
       RENDER TABLE
    ===================================================== */

    function renderTable(
        results
    ) {

        const ui =
            getUI();


        if (
            !ui.table &&
            !ui.tableBody
        ) {

            return;

        }


        let tbody =
            ui.tableBody;


        /*
         * Jika tbody belum ada,
         * cari/create.
         */

        if (
            !tbody &&
            ui.table
        ) {

            tbody =
                ui.table.querySelector(
                    "tbody"
                );

        }


        if (!tbody) {

            return;

        }


        tbody.innerHTML =
            "";


        results.forEach(
            function (
                result,
                index
            ) {

                const tr =
                    document.createElement(
                        "tr"
                    );


                const statusClass =
                    getStatusClass(
                        result.status
                    );


                tr.className =
                    statusClass;


                tr.innerHTML = `

                    <td>
                        ${index + 1}
                    </td>

                    <td>
                        ${escapeHTML(
                            result.ticket
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            result
                                .receiveDateFormatted
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            result
                                .releaseDateTime
                        )}
                    </td>

                    <td>
                        <span class="status-badge ${statusClass}">
                            ${escapeHTML(
                                result.status
                            )}
                        </span>
                    </td>

                    <td>
                        ${escapeHTML(
                            result.reason
                        )}
                    </td>

                `;


                tbody.appendChild(
                    tr
                );

            }
        );

    }


    /* =====================================================
       RENDER MATERIAL TABLE
    ===================================================== */

    function renderMaterialTable(
        rows
    ) {

        const table =
            findElement([
                "#materialTable",
                "#materialsTable"
            ]);


        if (!table) {

            return;

        }


        let tbody =
            table.querySelector(
                "tbody"
            );


        if (!tbody) {

            tbody =
                document.createElement(
                    "tbody"
                );

            table.appendChild(
                tbody
            );

        }


        tbody.innerHTML =
            "";


        rows.forEach(
            function (
                row,
                index
            ) {

                const tr =
                    document.createElement(
                        "tr"
                    );


                tr.innerHTML = `

                    <td>
                        ${index + 1}
                    </td>

                    <td>
                        ${escapeHTML(
                            row.ticket
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            row.material
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            row.quantity
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            row.unit
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            row.score
                        )}
                    </td>

                `;


                tbody.appendChild(
                    tr
                );

            }
        );

    }


    /* =====================================================
       RENDER COMBINED TABLE
    ===================================================== */

    function renderCombinedTable(
        rows
    ) {

        const table =
            findElement([
                "#combinedTable",
                "#exportTable",
                "#detailTable"
            ]);


        if (!table) {

            return;

        }


        let tbody =
            table.querySelector(
                "tbody"
            );


        if (!tbody) {

            tbody =
                document.createElement(
                    "tbody"
                );

            table.appendChild(
                tbody
            );

        }


        tbody.innerHTML =
            "";


        rows.forEach(
            function (
                row,
                index
            ) {

                const tr =
                    document.createElement(
                        "tr"
                    );


                tr.innerHTML = `

                    <td>
                        ${index + 1}
                    </td>

                    <td>
                        ${escapeHTML(
                            row["TT Number"]
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            row["Datetime Receive"]
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            row["TT Release"]
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            row["Material"]
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            row["Quantity"]
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            row["Satuan"]
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            row["Status"]
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            row["Keterangan"]
                        )}
                    </td>

                `;


                tbody.appendChild(
                    tr
                );

            }
        );

    }


    /* =====================================================
       HANDLE FILE
    ===================================================== */

    async function handleFile(
        file
    ) {

        if (!file) {

            return;

        }


        setLoading(
            true
        );


        setStatus(
            "Membaca file...",
            "loading"
        );


        try {

            const workbook =
                await readFile(
                    file
                );


            state.workbook =
                workbook;


            state.fileName =
                file.name;


            populateSheetSelect(
                workbook
            );


            const sheetNames =
                getSheetNames(
                    workbook
                );


            if (
                !sheetNames.length
            ) {

                throw new Error(
                    "Tidak ada worksheet di file."
                );

            }


            loadSheet(
                sheetNames[0]
            );


            const ui =
                getUI();


            if (ui.fileName) {

                ui.fileName.textContent =
                    file.name;

            }


            setStatus(
                `File berhasil dibaca. ${state.rows.length} baris ditemukan.`,
                "success"
            );


            /*
             * Otomatis proses.
             */

            runValidation();

        }

        catch (error) {

            console.error(
                error
            );


            setStatus(
                error.message ||
                "Gagal memproses file.",
                "error"
            );

        }

        finally {

            setLoading(
                false
            );

        }

    }


    /* =====================================================
       RUN VALIDATION
    ===================================================== */

    function runValidation() {

        if (
            !checkDependencies()
        ) {

            return;

        }


        if (
            !state.rows.length
        ) {

            setStatus(
                "Belum ada data Excel.",
                "error"
            );

            return;

        }


        setLoading(
            true
        );


        setStatus(
            "Memvalidasi data...",
            "loading"
        );


        try {

            const results =
                processData();


            if (
                !results.length
            ) {

                renderSummary(
                    []
                );

                renderTable(
                    []
                );

                renderMaterialTable(
                    []
                );

                renderCombinedTable(
                    []
                );

                return;

            }


            renderSummary(
                results
            );


            renderTable(
                results
            );


            renderMaterialTable(
                state.materialRows
            );


            renderCombinedTable(
                state.combinedRows
            );


            const summary =
                window.ReportCheckerValidator
                    .summary(
                        results
                    );


            setStatus(
                `Selesai. Total ${summary.total} data: ${summary.sesuai} sesuai, ${summary.tidakSesuai} tidak sesuai, ${summary.invalid} invalid.`,
                "success"
            );

        }

        catch (error) {

            console.error(
                "Validation error:",
                error
            );


            setStatus(
                error.message ||
                "Terjadi kesalahan saat validasi.",
                "error"
            );

        }

        finally {

            setLoading(
                false
            );

        }

    }


    /* =====================================================
       EXPORT XLSX
    ===================================================== */

    function exportRows(
        rows,
        fileName
    ) {

        if (
            !Array.isArray(rows) ||
            !rows.length
        ) {

            setStatus(
                "Tidak ada data untuk diexport.",
                "error"
            );

            return;

        }


        try {

            const worksheet =
                XLSX.utils.json_to_sheet(
                    rows
                );


            const workbook =
                XLSX.utils.book_new();


            XLSX.utils.book_append_sheet(
                workbook,
                worksheet,
                "Report Checker"
            );


            XLSX.writeFile(
                workbook,
                fileName
            );


            setStatus(
                `Export berhasil: ${fileName}`,
                "success"
            );

        }

        catch (error) {

            console.error(
                error
            );


            setStatus(
                "Gagal melakukan export.",
                "error"
            );

        }

    }


    /* =====================================================
       EXPORT ALL
    ===================================================== */

    function exportAll() {

        if (
            !state.results.length
        ) {

            setStatus(
                "Belum ada hasil validasi.",
                "error"
            );

            return;

        }


        const rows =
            state.results

                .filter(
                    function (result) {

                        return (
                            result &&
                            result.ticket
                        );

                    }
                )

                .map(
                    function (result) {

                        return {

                            "TT Number":
                                result.ticket,

                            "Datetime Receive":
                                result
                                    .receiveDateFormatted,

                            "TT Release":
                                result
                                    .releaseDateTime,

                            "Release Raw":
                                result
                                    .releaseRaw,

                            "Status":
                                result.status,

                            "Keterangan":
                                result.reason

                        };

                    }
                );


        exportRows(
            rows,
            createExportFileName(
                "all"
            )
        );

    }


    /* =====================================================
       EXPORT SESUAI
    ===================================================== */

    function exportSesuai() {

        if (
            !state.results.length
        ) {

            setStatus(
                "Belum ada hasil validasi.",
                "error"
            );

            return;

        }


        const rows =
            window.ReportCheckerValidator
                .exportSesuai(
                    state.results
                );


        exportRows(
            rows,
            createExportFileName(
                "sesuai"
            )
        );

    }


    /* =====================================================
       EXPORT TIDAK SESUAI
    ===================================================== */

    function exportTidakSesuai() {

        if (
            !state.results.length
        ) {

            setStatus(
                "Belum ada hasil validasi.",
                "error"
            );

            return;

        }


        const rows =
            window.ReportCheckerValidator
                .exportTidakSesuai(
                    state.results
                );


        exportRows(
            rows,
            createExportFileName(
                "tidak-sesuai"
            )
        );

    }


    /* =====================================================
       EXPORT MATERIAL
    ===================================================== */

    function exportMaterial() {

        if (
            !state.materialRows.length
        ) {

            setStatus(
                "Tidak ada material untuk diexport.",
                "error"
            );

            return;

        }


        const rows =
            state.materialRows.map(
                function (row) {

                    return {

                        "TT Number":
                            row.ticket,

                        "Material":
                            row.material,

                        "Quantity":
                            row.quantity,

                        "Satuan":
                            row.unit,

                        "Score":
                            row.score,

                        "Source":
                            row.source

                    };

                }
            );


        exportRows(
            rows,
            createExportFileName(
                "material"
            )
        );

    }


    /* =====================================================
       EXPORT COMBINED
    ===================================================== */

    function exportCombined() {

        if (
            !state.combinedRows.length
        ) {

            setStatus(
                "Tidak ada data detail untuk diexport.",
                "error"
            );

            return;

        }


        exportRows(
            state.combinedRows,
            createExportFileName(
                "detail"
            )
        );

    }


    /* =====================================================
       CREATE EXPORT FILE NAME
    ===================================================== */

    function createExportFileName(
        suffix
    ) {

        const original =
            state.fileName
                ? state.fileName
                    .replace(
                        /\.[^.]+$/,
                        ""
                    )
                : "report-checker";


        return (
            `${original}-${suffix}.xlsx`
        );

    }


    /* =====================================================
       HANDLE SHEET CHANGE
    ===================================================== */

    function handleSheetChange(
        event
    ) {

        const sheetName =
            event.target.value;


        if (
            !sheetName
        ) {

            return;

        }


        if (
            loadSheet(
                sheetName
            )
        ) {

            setStatus(
                `Worksheet "${sheetName}" dipilih. ${state.rows.length} baris.`,
                "success"
            );


            runValidation();

        }

    }


    /* =====================================================
       EVENT BINDING
    ===================================================== */

    function bindEvents() {

        const ui =
            getUI();


        /*
         * File input.
         */

        if (
            ui.fileInput
        ) {

            ui.fileInput.addEventListener(
                "change",
                function (event) {

                    const file =
                        event.target
                            .files?.[0];


                    if (file) {

                        handleFile(
                            file
                        );

                    }

                }
            );

        }


        /*
         * Sheet select.
         */

        if (
            ui.sheetSelect
        ) {

            ui.sheetSelect.addEventListener(
                "change",
                handleSheetChange
            );

        }


        /*
         * Upload button.
         */

        if (
            ui.uploadButton
        ) {

            ui.uploadButton.addEventListener(
                "click",
                function () {

                    if (
                        ui.fileInput
                    ) {

                        ui.fileInput.click();

                    }

                }
            );

        }


        /*
         * Validate button.
         */

        if (
            ui.validateButton
        ) {

            ui.validateButton.addEventListener(
                "click",
                runValidation
            );

        }


        /*
         * Export all.
         */

        if (
            ui.exportButton
        ) {

            ui.exportButton.addEventListener(
                "click",
                exportAll
            );

        }


        /*
         * Export sesuai.
         */

        if (
            ui.exportSesuaiButton
        ) {

            ui.exportSesuaiButton.addEventListener(
                "click",
                exportSesuai
            );

        }


        /*
         * Export tidak sesuai.
         */

        if (
            ui.exportTidakSesuaiButton
        ) {

            ui.exportTidakSesuaiButton.addEventListener(
                "click",
                exportTidakSesuai
            );

        }


        /*
         * Optional material export.
         */

        const materialExportButton =
            findElement([
                "#exportMaterialBtn",
                "#btnExportMaterial"
            ]);


        if (
            materialExportButton
        ) {

            materialExportButton.addEventListener(
                "click",
                exportMaterial
            );

        }


        /*
         * Optional combined export.
         */

        const combinedExportButton =
            findElement([
                "#exportCombinedBtn",
                "#btnExportDetail"
            ]);


        if (
            combinedExportButton
        ) {

            combinedExportButton.addEventListener(
                "click",
                exportCombined
            );

        }

    }


    /* =====================================================
       RESET
    ===================================================== */

    function reset() {

        state.workbook =
            null;

        state.worksheet =
            null;

        state.rows =
            [];

        state.results =
            [];

        state.materialRows =
            [];

        state.combinedRows =
            [];

        state.headers =
            [];

        state.fileName =
            "";

        state.sheetName =
            "";


        const ui =
            getUI();


        if (
            ui.fileInput
        ) {

            ui.fileInput.value =
                "";

        }


        if (
            ui.tableBody
        ) {

            ui.tableBody.innerHTML =
                "";

        }


        const materialTable =
            findElement([
                "#materialTable",
                "#materialsTable"
            ]);


        if (materialTable) {

            const tbody =
                materialTable.querySelector(
                    "tbody"
                );


            if (tbody) {

                tbody.innerHTML =
                    "";

            }

        }


        const combinedTable =
            findElement([
                "#combinedTable",
                "#exportTable",
                "#detailTable"
            ]);


        if (combinedTable) {

            const tbody =
                combinedTable.querySelector(
                    "tbody"
                );


            if (tbody) {

                tbody.innerHTML =
                    "";

            }

        }


        renderSummary(
            []
        );


        setStatus(
            "Data telah direset.",
            "success"
        );

    }


    /* =====================================================
       DEBUG DATA
    ===================================================== */

    function debug() {

        console.log(
            "ReportCheckerApp state:",
            state
        );


        return {

            state:
                state,

            results:
                state.results,

            materials:
                state.materialRows,

            combined:
                state.combinedRows

        };

    }


    /* =====================================================
       PUBLIC API
    ===================================================== */

    window.ReportCheckerApp = {

        state:
            state,

        loadFile:
            handleFile,

        loadSheet:
            loadSheet,

        process:
            processData,

        validate:
            runValidation,

        render:
            renderTable,

        renderSummary:
            renderSummary,

        exportAll:
            exportAll,

        exportSesuai:
            exportSesuai,

        exportTidakSesuai:
            exportTidakSesuai,

        exportMaterial:
            exportMaterial,

        exportCombined:
            exportCombined,

        reset:
            reset,

        debug:
            debug

    };


    /* =====================================================
       INIT
    ===================================================== */

    function init() {

        if (
            state.initialized
        ) {

            return;

        }


        state.initialized =
            true;


        bindEvents();


        if (
            checkDependencies()
        ) {

            setStatus(
                "Report Checker siap digunakan.",
                "success"
            );

        }

    }


    /* =====================================================
       DOM READY
    ===================================================== */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            init
        );

    } else {

        init();

    }


    /* =====================================================
       DEBUG
    ===================================================== */

    console.log(
        "ReportChecker app.js loaded."
    );


})();
