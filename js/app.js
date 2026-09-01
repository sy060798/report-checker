/* =========================================================
   REPORT CHECKER
   app.js

   FULL UPDATE

   Struktur file:
   report-checker/
   ├── index.html
   ├── css/
   │   └── style.css
   └── js/
       ├── app.js
       ├── excel.js
       ├── validator.js
       ├── cir-parser.js
       ├── material-parser.js
       └── settings.js

   CATATAN:
   - TIDAK menggunakan exporter.js
   - Excel dibaca langsung menggunakan XLSX
   - Export Excel juga langsung menggunakan XLSX
   - TT Number hanya dari kolom "TT Number"
   - Datetime Receive dari Excel
   - TT Release dari CIR
   - Material dari material-parser.js
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

        return document.querySelector(selector);

    }


    function $$(selector) {

        return Array.from(
            document.querySelectorAll(selector)
        );

    }


    function byId(id) {

        return document.getElementById(id);

    }


    /* =====================================================
       FIND ELEMENT
    ===================================================== */

    function findElement(selectors) {

        for (const selector of selectors) {

            const element =
                document.querySelector(selector);

            if (element) {

                return element;

            }

        }

        return null;

    }


    /* =====================================================
       UI ELEMENTS
    ===================================================== */

    function getUI() {

        return {

            fileInput:
                findElement([
                    "#fileInput",
                    "#excelFile",
                    "#uploadFile",
                    "#file",
                    "input[type='file']"
                ]),

            sheetSelect:
                findElement([
                    "#sheetSelect",
                    "#sheetName",
                    "#worksheetSelect",
                    "#sheet"
                ]),

            uploadButton:
                findElement([
                    "#uploadBtn",
                    "#btnUpload",
                    "#processBtn",
                    "#chooseFileBtn"
                ]),

            validateButton:
                findElement([
                    "#validateBtn",
                    "#btnValidate",
                    "#checkBtn",
                    "#runBtn"
                ]),

            exportButton:
                findElement([
                    "#exportBtn",
                    "#btnExport",
                    "#downloadBtn",
                    "#exportAllBtn"
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

            exportMaterialButton:
                findElement([
                    "#exportMaterialBtn",
                    "#btnExportMaterial"
                ]),

            exportCombinedButton:
                findElement([
                    "#exportCombinedBtn",
                    "#btnExportDetail",
                    "#exportDetailBtn"
                ]),

            resetButton:
                findElement([
                    "#resetBtn",
                    "#btnReset",
                    "#clearBtn"
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
                    "#loader",
                    "#spinner"
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
                    "#totalCount",
                    "#countTotal"
                ]),

            sesuai:
                findElement([
                    "#sesuai",
                    "#sesuaiCount",
                    "#countSesuai"
                ]),

            tidakSesuai:
                findElement([
                    "#tidakSesuai",
                    "#tidakSesuaiCount",
                    "#countTidakSesuai"
                ]),

            invalid:
                findElement([
                    "#invalid",
                    "#invalidCount",
                    "#countInvalid"
                ]),

            fileName:
                findElement([
                    "#fileName",
                    "#selectedFile",
                    "#fileNameText"
                ])

        };

    }


    /* =====================================================
       STATUS
    ===================================================== */

    function setStatus(message, type) {

        const ui = getUI();

        if (!ui.status) {

            return;

        }

        ui.status.textContent =
            message || "";

        ui.status.className =
            "status";

        if (type) {

            ui.status.classList.add(type);

        }

    }


    /* =====================================================
       LOADING
    ===================================================== */

    function setLoading(loading) {

        const ui = getUI();

        if (!ui.loading) {

            return;

        }

        ui.loading.style.display =
            loading ? "" : "none";

    }


    /* =====================================================
       DEPENDENCIES
    ===================================================== */

    function checkDependencies() {

        /*
         * XLSX bisa berasal dari:
         * - CDN di index.html
         * - excel.js
         */

        if (
            typeof XLSX === "undefined"
        ) {

            console.error(
                "XLSX library tidak ditemukan."
            );

            setStatus(
                "Library Excel (XLSX) belum tersedia. Pastikan excel.js atau SheetJS sudah dimuat.",
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


        /*
         * Material parser bersifat optional.
         *
         * Jika tersedia:
         * material akan diproses.
         *
         * Jika tidak tersedia:
         * validasi utama tetap dapat berjalan.
         */

        if (
            !window.ReportCheckerMaterial
        ) {

            console.warn(
                "material-parser.js belum tersedia. Material tidak akan diproses."
            );

        }


        return true;

    }


    /* =====================================================
       NORMALIZE HEADER
    ===================================================== */

    function normalizeHeader(value) {

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

    function findHeader(headers, names) {

        if (
            !Array.isArray(headers)
        ) {

            return null;

        }

        const wanted =
            names.map(
                normalizeHeader
            );


        for (const header of headers) {

            const normalized =
                normalizeHeader(header);

            if (
                wanted.includes(normalized)
            ) {

                return header;

            }

        }

        return null;

    }


    /* =====================================================
       DETECT COLUMNS
    ===================================================== */

    function detectColumns(rows) {

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

            /*
             * WAJIB TT Number.
             *
             * Tidak menggunakan:
             * - Customer Ticket
             * - Ref Ticket
             * - Ticket
             */

            ttNumber:
                findHeader(
                    headers,
                    [
                        "TT Number"
                    ]
                ),


            datetimeReceive:
                findHeader(
                    headers,
                    [
                        "Datetime Receive",
                        "DateTime Receive",
                        "Datetime receive"
                    ]
                ),


            cir:
                findHeader(
                    headers,
                    [
                        "CIR"
                    ]
                )

        };

    }


    /* =====================================================
       NORMALIZE INPUT ROW
    ===================================================== */

    function normalizeInputRow(row, columns) {

        const output = {

            "TT Number": "",

            "Datetime Receive": "",

            "CIR": "",

            originalRow: row

        };


        if (!row) {

            return output;

        }


        if (columns.ttNumber) {

            output["TT Number"] =
                row[
                    columns.ttNumber
                ];

        }


        if (columns.datetimeReceive) {

            output["Datetime Receive"] =
                row[
                    columns.datetimeReceive
                ];

        }


        if (columns.cir) {

            output["CIR"] =
                row[
                    columns.cir
                ];

        }


        return output;

    }


    /* =====================================================
       READ EXCEL FILE
    ===================================================== */

    function readExcelFile(file) {

        return new Promise(
            function (resolve, reject) {

                if (!file) {

                    reject(
                        new Error(
                            "File tidak dipilih."
                        )
                    );

                    return;

                }


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
                                        type: "array",

                                        cellDates: true,

                                        cellNF: false,

                                        cellText: false,

                                        raw: true
                                    }
                                );


                            if (
                                !workbook ||
                                !workbook.SheetNames ||
                                !workbook.SheetNames.length
                            ) {

                                throw new Error(
                                    "File Excel tidak memiliki worksheet."
                                );

                            }


                            resolve(workbook);

                        }

                        catch (error) {

                            reject(error);

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


                reader.readAsArrayBuffer(file);

            }
        );

    }


    /* =====================================================
       WORKSHEET TO JSON
    ===================================================== */

    function worksheetToJSON(worksheet) {

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

    function getSheetNames(workbook) {

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

    function populateSheetSelect(workbook) {

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
       LOAD SHEET
    ===================================================== */

    function loadSheet(sheetName) {

        if (
            !state.workbook
        ) {

            setStatus(
                "Workbook belum tersedia.",
                "error"
            );

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


        console.log(
            "Worksheet loaded:",
            {
                sheetName,
                rowCount: rows.length,
                headers: state.headers
            }
        );


        return true;

    }


    /* =====================================================
       VALIDATE COLUMNS
    ===================================================== */

    function validateColumns(rows) {

        const columns =
            detectColumns(rows);


        if (!columns.ttNumber) {

            return {

                valid: false,

                error:
                    'Kolom "TT Number" tidak ditemukan. Pastikan nama kolom tepat "TT Number".',

                columns

            };

        }


        if (!columns.datetimeReceive) {

            return {

                valid: false,

                error:
                    'Kolom "Datetime Receive" tidak ditemukan.',

                columns

            };

        }


        if (!columns.cir) {

            return {

                valid: false,

                error:
                    'Kolom "CIR" tidak ditemukan.',

                columns

            };

        }


        return {

            valid: true,

            error: "",

            columns

        };

    }


    /* =====================================================
       PROCESS MATERIAL
    ===================================================== */

    function processMaterials(normalizedRows) {

        const materialRows = [];


        /*
         * Jika parser tidak tersedia,
         * return kosong.
         */

        if (
            !window.ReportCheckerMaterial
        ) {

            return materialRows;

        }


        if (
            typeof window
                .ReportCheckerMaterial
                .buildRows !== "function"
        ) {

            console.warn(
                "ReportCheckerMaterial.buildRows tidak ditemukan."
            );

            return materialRows;

        }


        normalizedRows.forEach(
            function (row) {

                try {

                    const parsed =
                        window
                            .ReportCheckerMaterial
                            .buildRows(
                                row,
                                "CIR"
                            );


                    if (
                        Array.isArray(parsed)
                    ) {

                        materialRows.push(
                            ...parsed
                        );

                    }

                }

                catch (error) {

                    console.error(
                        "Material parser error:",
                        error
                    );

                }

            }
        );


        return materialRows;

    }


    /* =====================================================
       PROCESS DATA
    ===================================================== */

    function processData() {

        if (
            !Array.isArray(
                state.rows
            ) ||
            !state.rows.length
        ) {

            setStatus(
                "Tidak ada data Excel.",
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


        console.log(
            "Normalized rows:",
            normalizedRows
        );


        /*
         * VALIDATOR
         */

        const results =
            window
                .ReportCheckerValidator
                .validateRows(
                    normalizedRows
                );


        state.results =
            Array.isArray(results)
                ? results
                : [];


        /*
         * MATERIAL
         */

        state.materialRows =
            processMaterials(
                normalizedRows
            );


        /*
         * COMBINED
         */

        state.combinedRows =
            buildCombinedRows(
                normalizedRows,
                state.results,
                state.materialRows
            );


        return state.results;

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


        if (
            !Array.isArray(
                validationResults
            )
        ) {

            return output;

        }


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
                validation.ttNumber ||
                "";


            const matchingMaterials =
                Array.isArray(materialRows)
                    ? materialRows.filter(
                        function (material) {

                            return (
                                String(
                                    material?.ticket ||
                                    ""
                                ).trim() ===
                                String(
                                    ticket
                                ).trim()
                            );

                        }
                    )
                    : [];


            /*
             * Jika ada material.
             */

            if (
                matchingMaterials.length
            ) {

                matchingMaterials.forEach(
                    function (material) {

                        output.push({

                            "TT Number":
                                ticket,

                            "Datetime Receive":
                                validation
                                    .receiveDateFormatted ||
                                "",

                            "TT Release":
                                validation
                                    .releaseDateTime ||
                                "",

                            "Status":
                                validation
                                    .status ||
                                "",

                            "Keterangan":
                                validation
                                    .reason ||
                                "",

                            "Material":
                                material.material ||
                                "",

                            "Quantity":
                                material.quantity ??
                                "",

                            "Satuan":
                                material.unit ||
                                "",

                            "Material Score":
                                material.score ??
                                "",

                            "CIR":
                                source.CIR ||
                                "",

                            "Release Raw":
                                validation
                                    .releaseRaw ||
                                ""

                        });

                    }
                );

            }

            else {

                output.push({

                    "TT Number":
                        ticket,

                    "Datetime Receive":
                        validation
                            .receiveDateFormatted ||
                        "",

                    "TT Release":
                        validation
                            .releaseDateTime ||
                        "",

                    "Status":
                        validation
                            .status ||
                        "",

                    "Keterangan":
                        validation
                            .reason ||
                        "",

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
                            .releaseRaw ||
                        ""

                });

            }

        }


        return output;

    }


    /* =====================================================
       SUMMARY
    ===================================================== */

    function renderSummary(results) {

        if (
            !window.ReportCheckerValidator ||
            typeof window
                .ReportCheckerValidator
                .summary !== "function"
        ) {

            return {

                total: 0,

                sesuai: 0,

                tidakSesuai: 0,

                invalid: 0

            };

        }


        const summary =
            window
                .ReportCheckerValidator
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

    function escapeHTML(value) {

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

    function getStatusClass(status) {

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
       RENDER RESULT TABLE
    ===================================================== */

    function renderTable(results) {

        const ui =
            getUI();


        let tbody =
            ui.tableBody;


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


        if (
            !Array.isArray(results)
        ) {

            return;

        }


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
                            result.ticket ||
                            result.ttNumber ||
                            ""
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            result.receiveDateFormatted ||
                            ""
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            result.releaseDateTime ||
                            ""
                        )}
                    </td>

                    <td>
                        <span class="status-badge ${statusClass}">
                            ${escapeHTML(
                                result.status ||
                                ""
                            )}
                        </span>
                    </td>

                    <td>
                        ${escapeHTML(
                            result.reason ||
                            ""
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

    function renderMaterialTable(rows) {

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


        if (
            !Array.isArray(rows)
        ) {

            return;

        }


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
                            row.ticket ||
                            ""
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            row.material ||
                            ""
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            row.quantity ??
                            ""
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            row.unit ||
                            ""
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            row.score ??
                            ""
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

    function renderCombinedTable(rows) {

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


        if (
            !Array.isArray(rows)
        ) {

            return;

        }


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

    async function handleFile(file) {

        if (!file) {

            return;

        }


        setLoading(true);

        setStatus(
            "Membaca file Excel...",
            "loading"
        );


        try {

            const workbook =
                await readExcelFile(
                    file
                );


            state.workbook =
                workbook;


            state.fileName =
                file.name;


            const sheetNames =
                getSheetNames(
                    workbook
                );


            if (
                !sheetNames.length
            ) {

                throw new Error(
                    "Tidak ada worksheet di file Excel."
                );

            }


            populateSheetSelect(
                workbook
            );


            const firstSheet =
                sheetNames[0];


            if (
                !loadSheet(
                    firstSheet
                )
            ) {

                throw new Error(
                    "Gagal membuka worksheet."
                );

            }


            const ui =
                getUI();


            if (ui.fileName) {

                ui.fileName.textContent =
                    file.name;

            }


            setStatus(
                `File berhasil dibaca. Worksheet "${firstSheet}" — ${state.rows.length} baris ditemukan.`,
                "success"
            );


            /*
             * Jalankan validasi otomatis.
             */

            runValidation();

        }

        catch (error) {

            console.error(
                "Excel error:",
                error
            );


            state.workbook =
                null;

            state.worksheet =
                null;

            state.rows =
                [];

            state.results =
                [];


            setStatus(
                error?.message ||
                "Gagal membaca file Excel.",
                "error"
            );

        }

        finally {

            setLoading(false);

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


        setLoading(true);


        setStatus(
            "Memvalidasi data...",
            "loading"
        );


        try {

            const results =
                processData();


            if (
                !Array.isArray(
                    results
                ) ||
                !results.length
            ) {

                renderSummary([]);

                renderTable([]);

                renderMaterialTable([]);

                renderCombinedTable([]);

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
                window
                    .ReportCheckerValidator
                    .summary(
                        results
                    );


            setStatus(
                `Selesai. Total ${summary.total} data: ${summary.sesuai} sesuai, ${summary.tidakSesuai} tidak sesuai, ${summary.invalid} invalid.`,
                "success"
            );


            console.log(
                "Report Checker results:",
                {
                    summary,
                    results,
                    materials:
                        state.materialRows,
                    combined:
                        state.combinedRows
                }
            );

        }

        catch (error) {

            console.error(
                "Validation error:",
                error
            );


            setStatus(
                error?.message ||
                "Terjadi kesalahan saat validasi.",
                "error"
            );

        }

        finally {

            setLoading(false);

        }

    }


    /* =====================================================
       EXPORT EXCEL
       
       TIDAK MENGGUNAKAN exporter.js
       
       Langsung menggunakan XLSX.
    ===================================================== */

    function exportRows(rows, fileName) {

        if (
            !Array.isArray(rows) ||
            !rows.length
        ) {

            setStatus(
                "Tidak ada data untuk diexport.",
                "error"
            );

            return false;

        }


        if (
            typeof XLSX === "undefined"
        ) {

            setStatus(
                "Library XLSX tidak tersedia.",
                "error"
            );

            return false;

        }


        try {

            const worksheet =
                XLSX.utils.json_to_sheet(
                    rows
                );


            /*
             * Lebar kolom otomatis.
             */

            const headers =
                Object.keys(
                    rows[0] || {}
                );


            worksheet["!cols"] =
                headers.map(
                    function (header) {

                        let maxLength =
                            String(
                                header
                            ).length;


                        rows.forEach(
                            function (row) {

                                const value =
                                    row[header];

                                const length =
                                    value === null ||
                                    value === undefined
                                        ? 0
                                        : String(
                                            value
                                        ).length;


                                if (
                                    length >
                                    maxLength
                                ) {

                                    maxLength =
                                        length;

                                }

                            }
                        );


                        return {

                            wch:
                                Math.min(
                                    Math.max(
                                        maxLength + 2,
                                        10
                                    ),
                                    60
                                )

                        };

                    }
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


            return true;

        }

        catch (error) {

            console.error(
                "Export error:",
                error
            );


            setStatus(
                "Gagal melakukan export Excel.",
                "error"
            );


            return false;

        }

    }


    /* =====================================================
       CREATE EXPORT FILE NAME
    ===================================================== */

    function createExportFileName(suffix) {

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
       BUILD EXPORT ALL
    ===================================================== */

    function buildExportAllRows() {

        return state.results

            .filter(
                function (result) {

                    return (
                        result &&
                        result.ticket &&
                        String(
                            result.ticket
                        ).trim()
                    );

                }
            )

            .map(
                function (result) {

                    return {

                        "TT Number":
                            result.ticket,

                        "Datetime Receive":
                            result.receiveDateFormatted ||
                            "",

                        "TT Release":
                            result.releaseDateTime ||
                            "",

                        "Release Raw":
                            result.releaseRaw ||
                            "",

                        "Status":
                            result.status ||
                            "",

                        "Keterangan":
                            result.reason ||
                            ""

                    };

                }
            );

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
            buildExportAllRows();


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


        let rows = [];


        if (
            window.ReportCheckerValidator &&
            typeof window
                .ReportCheckerValidator
                .exportSesuai ===
            "function"
        ) {

            rows =
                window
                    .ReportCheckerValidator
                    .exportSesuai(
                        state.results
                    );

        }

        else {

            rows =
                state.results

                    .filter(
                        function (result) {

                            return (
                                result &&
                                result.status ===
                                "SESUAI" &&
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
                                    result.receiveDateFormatted ||
                                    "",

                                "TT Release":
                                    result.releaseDateTime ||
                                    "",

                                "Release Raw":
                                    result.releaseRaw ||
                                    "",

                                "Status":
                                    result.status,

                                "Keterangan":
                                    result.reason ||
                                    ""

                            };

                        }
                    );

        }


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


        let rows = [];


        if (
            window.ReportCheckerValidator &&
            typeof window
                .ReportCheckerValidator
                .exportTidakSesuai ===
            "function"
        ) {

            rows =
                window
                    .ReportCheckerValidator
                    .exportTidakSesuai(
                        state.results
                    );

        }

        else {

            rows =
                state.results

                    .filter(
                        function (result) {

                            return (
                                result &&
                                result.status ===
                                "TIDAK SESUAI" &&
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
                                    result.receiveDateFormatted ||
                                    "",

                                "TT Release":
                                    result.releaseDateTime ||
                                    "",

                                "Release Raw":
                                    result.releaseRaw ||
                                    "",

                                "Status":
                                    result.status,

                                "Keterangan":
                                    result.reason ||
                                    ""

                            };

                        }
                    );

        }


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
                            row.ticket ||
                            "",

                        "Material":
                            row.material ||
                            "",

                        "Quantity":
                            row.quantity ??
                            "",

                        "Satuan":
                            row.unit ||
                            "",

                        "Score":
                            row.score ??
                            "",

                        "Source":
                            row.source ||
                            ""

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
       HANDLE SHEET CHANGE
    ===================================================== */

    function handleSheetChange(event) {

        const sheetName =
            event.target.value;


        if (!sheetName) {

            return;

        }


        if (
            loadSheet(
                sheetName
            )
        ) {

            setStatus(
                `Worksheet "${sheetName}" dipilih. ${state.rows.length} baris ditemukan.`,
                "success"
            );


            runValidation();

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


        if (ui.fileInput) {

            ui.fileInput.value =
                "";

        }


        if (ui.sheetSelect) {

            ui.sheetSelect.innerHTML =
                "";

            ui.sheetSelect.disabled =
                true;

        }


        if (ui.fileName) {

            ui.fileName.textContent =
                "";

        }


        if (ui.tableBody) {

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


        renderSummary([]);


        setStatus(
            "Data telah direset.",
            "success"
        );

    }


    /* =====================================================
       DEBUG
    ===================================================== */

    function debug() {

        console.log(
            "===================================="
        );

        console.log(
            "REPORT CHECKER DEBUG"
        );

        console.log(
            "===================================="
        );

        console.log(
            "File:",
            state.fileName
        );

        console.log(
            "Sheet:",
            state.sheetName
        );

        console.log(
            "Rows:",
            state.rows
        );

        console.log(
            "Headers:",
            state.headers
        );

        console.log(
            "Results:",
            state.results
        );

        console.log(
            "Materials:",
            state.materialRows
        );

        console.log(
            "Combined:",
            state.combinedRows
        );

        console.log(
            "===================================="
        );


        return {

            state,

            rows:
                state.rows,

            results:
                state.results,

            materials:
                state.materialRows,

            combined:
                state.combinedRows

        };

    }


    /* =====================================================
       EVENT BINDING
    ===================================================== */

    function bindEvents() {

        const ui =
            getUI();


        /*
         * FILE INPUT
         */

        if (ui.fileInput) {

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
         * SHEET SELECT
         */

        if (ui.sheetSelect) {

            ui.sheetSelect.addEventListener(
                "change",
                handleSheetChange
            );

        }


        /*
         * UPLOAD BUTTON
         */

        if (ui.uploadButton) {

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
         * VALIDATE BUTTON
         */

        if (ui.validateButton) {

            ui.validateButton.addEventListener(
                "click",
                runValidation
            );

        }


        /*
         * EXPORT ALL
         */

        if (ui.exportButton) {

            ui.exportButton.addEventListener(
                "click",
                exportAll
            );

        }


        /*
         * EXPORT SESUAI
         */

        if (ui.exportSesuaiButton) {

            ui.exportSesuaiButton.addEventListener(
                "click",
                exportSesuai
            );

        }


        /*
         * EXPORT TIDAK SESUAI
         */

        if (ui.exportTidakSesuaiButton) {

            ui.exportTidakSesuaiButton.addEventListener(
                "click",
                exportTidakSesuai
            );

        }


        /*
         * EXPORT MATERIAL
         */

        if (ui.exportMaterialButton) {

            ui.exportMaterialButton.addEventListener(
                "click",
                exportMaterial
            );

        }


        /*
         * EXPORT DETAIL
         */

        if (ui.exportCombinedButton) {

            ui.exportCombinedButton.addEventListener(
                "click",
                exportCombined
            );

        }


        /*
         * RESET
         */

        if (ui.resetButton) {

            ui.resetButton.addEventListener(
                "click",
                reset
            );

        }

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


        /*
         * Jangan memblokir aplikasi
         * hanya karena material parser
         * tidak tersedia.
         */

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

    }

    else {

        init();

    }


    /* =====================================================
       CONSOLE
    ===================================================== */

    console.log(
        "ReportChecker app.js loaded. exporter.js dependency removed."
    );


})();
