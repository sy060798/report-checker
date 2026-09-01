/* =========================================================
   REPORT CHECKER
   app.js - FULL UPDATE

   TANPA exporter.js

   Integrasi:
   - settings.js
   - cir-parser.js
   - material-parser.js
   - validator.js
   - excel.js (opsional)

   Fitur:
   - Drag & Drop Excel
   - Klik Drop Zone
   - Upload Excel
   - XLSX / XLS / XLSM
   - Multi worksheet
   - Validasi TT Number
   - Datetime Receive
   - CIR
   - Parsing Material
   - Material Error
   - Pagination
   - Export langsung menggunakan XLSX
========================================================= */

(function () {

    "use strict";


    /* =====================================================
       STATE
    ===================================================== */

    const state = {

        workbook: null,

        worksheet: null,

        rows: [],

        results: [],

        materialRows: [],

        materialErrorRows: [],

        combinedRows: [],

        headers: [],

        file: null,

        fileName: "",

        fileSize: 0,

        sheetName: "",

        sheetNames: [],

        initialized: false,

        processed: false,

        pagination: {

            valid: 1,

            invalid: 1,

            material: 1,

            materialError: 1

        },

        pageSize: 25

    };


    /* =====================================================
       DOM HELPERS
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

            dropZone:
                byId("dropZone"),

            fileInput:
                byId("excelFile"),

            selectedFile:
                byId("selectedFile"),

            fileName:
                byId("fileName"),

            fileSize:
                byId("fileSize"),

            removeFileBtn:
                byId("removeFileBtn"),

            processBtn:
                byId("processBtn"),

            processingStatus:
                byId("processingStatus"),

            processingText:
                byId("processingText"),

            systemStatus:
                byId("systemStatus"),

            dashboardSection:
                byId("dashboardSection"),

            resultSummary:
                byId("resultSummary"),

            resetBtn:
                byId("resetBtn"),

            totalCount:
                byId("totalCount"),

            validCount:
                byId("validCount"),

            invalidCount:
                byId("invalidCount"),

            materialCount:
                byId("materialCount"),

            materialErrorCount:
                byId("materialErrorCount"),

            validTabCount:
                byId("validTabCount"),

            invalidTabCount:
                byId("invalidTabCount"),

            materialTabCount:
                byId("materialTabCount"),

            materialErrorTabCount:
                byId("materialErrorTabCount"),

            validTable:
                byId("validTable"),

            validTableBody:
                byId("validTableBody"),

            validEmpty:
                byId("validEmpty"),

            invalidTable:
                byId("invalidTable"),

            invalidTableBody:
                byId("invalidTableBody"),

            invalidEmpty:
                byId("invalidEmpty"),

            materialTable:
                byId("materialTable"),

            materialTableBody:
                byId("materialTableBody"),

            materialEmpty:
                byId("materialEmpty"),

            materialErrorTable:
                byId("materialErrorTable"),

            materialErrorTableBody:
                byId("materialErrorTableBody"),

            materialErrorEmpty:
                byId("materialErrorEmpty"),

            validPagination:
                byId("validPagination"),

            invalidPagination:
                byId("invalidPagination"),

            materialPagination:
                byId("materialPagination"),

            materialErrorPagination:
                byId("materialErrorPagination"),

            validPrevBtn:
                byId("validPrevBtn"),

            validNextBtn:
                byId("validNextBtn"),

            validPageNumber:
                byId("validPageNumber"),

            validPageTotal:
                byId("validPageTotal"),

            invalidPrevBtn:
                byId("invalidPrevBtn"),

            invalidNextBtn:
                byId("invalidNextBtn"),

            invalidPageNumber:
                byId("invalidPageNumber"),

            invalidPageTotal:
                byId("invalidPageTotal"),

            materialPrevBtn:
                byId("materialPrevBtn"),

            materialNextBtn:
                byId("materialNextBtn"),

            materialPageNumber:
                byId("materialPageNumber"),

            materialPageTotal:
                byId("materialPageTotal"),

            materialErrorPrevBtn:
                byId("materialErrorPrevBtn"),

            materialErrorNextBtn:
                byId("materialErrorNextBtn"),

            materialErrorPageNumber:
                byId("materialErrorPageNumber"),

            materialErrorPageTotal:
                byId("materialErrorPageTotal"),

            downloadValidBtn:
                byId("downloadValidBtn"),

            downloadInvalidBtn:
                byId("downloadInvalidBtn"),

            downloadMaterialBtn:
                byId("downloadMaterialBtn"),

            downloadMaterialErrorBtn:
                byId("downloadMaterialErrorBtn"),

            toggleSettingsBtn:
                byId("toggleSettingsBtn"),

            settingsPanel:
                byId("settingsPanel"),

            saveSettingsBtn:
                byId("saveSettingsBtn"),

            resetSettingsBtn:
                byId("resetSettingsBtn"),

            settingsSavedMessage:
                byId("settingsSavedMessage")

        };

    }


    /* =====================================================
       STATUS
    ===================================================== */

    function setSystemStatus(
        text,
        type
    ) {

        const ui = getUI();

        if (!ui.systemStatus) {
            return;
        }

        ui.systemStatus.textContent =
            text || "Ready";

        ui.systemStatus.className =
            "status-badge";

        if (type) {
            ui.systemStatus.classList.add(type);
        }

    }


    function setProcessing(
        active,
        text
    ) {

        const ui = getUI();

        if (!ui.processingStatus) {
            return;
        }

        if (active) {

            ui.processingStatus.classList.remove(
                "hidden"
            );

            if (ui.processingText) {

                ui.processingText.textContent =
                    text ||
                    "Sedang memproses...";

            }

        } else {

            ui.processingStatus.classList.add(
                "hidden"
            );

        }

    }


    /* =====================================================
       DEPENDENCY CHECK
    ===================================================== */

    function checkDependencies() {

        if (
            typeof XLSX === "undefined"
        ) {

            console.error(
                "SheetJS XLSX tidak ditemukan."
            );

            setSystemStatus(
                "XLSX Error",
                "offline"
            );

            return false;
        }


        if (
            !window.ReportCheckerValidator
        ) {

            console.warn(
                "validator.js belum tersedia."
            );

        }


        if (
            !window.ReportCheckerMaterial
        ) {

            console.warn(
                "material-parser.js belum tersedia."
            );

        }


        return true;

    }


    /* =====================================================
       FORMAT FILE SIZE
    ===================================================== */

    function formatFileSize(
        bytes
    ) {

        if (!bytes) {
            return "0 KB";
        }

        if (bytes < 1024) {
            return bytes + " B";
        }

        if (bytes < 1024 * 1024) {

            return (
                (bytes / 1024).toFixed(1) +
                " KB"
            );

        }

        return (
            (bytes / (1024 * 1024)).toFixed(2) +
            " MB"
        );

    }


    /* =====================================================
       FILE VALIDATION
    ===================================================== */

    function isExcelFile(
        file
    ) {

        if (!file) {
            return false;
        }

        const name =
            String(file.name || "")
                .toLowerCase();

        return (
            name.endsWith(".xlsx") ||
            name.endsWith(".xls") ||
            name.endsWith(".xlsm")
        );

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
            const header of headers
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
       DETECT COLUMNS
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
                        "TT_Number",
                        "TTNumber",
                        "Ticket",
                        "Ticket Number",
                        "Ticket Number "
                    ]
                ),

            datetimeReceive:
                findHeader(
                    headers,
                    [
                        "Datetime Receive",
                        "Datetime receive",
                        "DateTime Receive",
                        "Datetime_Receive",
                        "Receive Datetime",
                        "Receive Date",
                        "Receive",
                        "Datetime"
                    ]
                ),

            cir:
                findHeader(
                    headers,
                    [
                        "CIR",
                        "CIR Text",
                        "CIR_TEXT",
                        "CIR Text "
                    ]
                )

        };

    }


    /* =====================================================
       NORMALIZE ROW
    ===================================================== */

    function normalizeInputRow(
        row,
        columns
    ) {

        const result = {

            "TT Number": "",

            "Datetime Receive": "",

            "CIR": "",

            originalRow: row

        };


        if (!row) {
            return result;
        }


        if (
            columns.ttNumber
        ) {

            result["TT Number"] =
                row[
                    columns.ttNumber
                ];

        }


        if (
            columns.datetimeReceive
        ) {

            result[
                "Datetime Receive"
            ] =
                row[
                    columns.datetimeReceive
                ];

        }


        if (
            columns.cir
        ) {

            result["CIR"] =
                row[
                    columns.cir
                ];

        }


        return result;

    }


    /* =====================================================
       READ EXCEL FILE
    ===================================================== */

    function readExcelFile(
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
       POPULATE SHEETS
       
       Kalau index.html belum punya sheet selector,
       kita buat otomatis di bawah drop zone.
    ===================================================== */

    function getOrCreateSheetSelector() {

        let select =
            byId("sheetSelect");


        if (select) {
            return select;
        }


        const ui = getUI();


        if (!ui.selectedFile) {
            return null;
        }


        select =
            document.createElement(
                "select"
            );


        select.id =
            "sheetSelect";

        select.className =
            "sheet-select";


        const label =
            document.createElement(
                "label"
            );


        label.textContent =
            "Worksheet:";

        label.style.display =
            "block";

        label.style.marginTop =
            "12px";

        label.style.marginBottom =
            "6px";


        ui.selectedFile
            .parentNode
            .insertBefore(
                label,
                ui.selectedFile
            );


        ui.selectedFile
            .parentNode
            .insertBefore(
                select,
                ui.selectedFile
            );


        select.addEventListener(
            "change",
            function () {

                loadSheet(
                    select.value
                );

            }
        );


        return select;

    }


    function populateSheetSelect(
        workbook
    ) {

        if (
            !workbook ||
            !Array.isArray(
                workbook.SheetNames
            )
        ) {

            return;

        }


        const select =
            getOrCreateSheetSelector();


        if (!select) {
            return;
        }


        select.innerHTML =
            "";


        workbook.SheetNames.forEach(
            function (
                sheetName,
                index
            ) {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    sheetName;

                option.textContent =
                    sheetName;


                if (index === 0) {
                    option.selected =
                        true;
                }


                select.appendChild(
                    option
                );

            }
        );


        select.disabled =
            workbook.SheetNames.length <= 1;

    }


    /* =====================================================
       LOAD SHEET
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

            console.error(
                "Worksheet tidak ditemukan:",
                sheetName
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
            sheetName,
            "rows:",
            rows.length,
            "headers:",
            state.headers
        );


        return true;

    }


    /* =====================================================
       SHOW SELECTED FILE
    ===================================================== */

    function showSelectedFile(
        file
    ) {

        const ui = getUI();


        if (!file) {
            return;
        }


        if (ui.selectedFile) {

            ui.selectedFile.classList.remove(
                "hidden"
            );

        }


        if (ui.fileName) {

            ui.fileName.textContent =
                file.name;

        }


        if (ui.fileSize) {

            ui.fileSize.textContent =
                formatFileSize(
                    file.size
                );

        }


        if (ui.processBtn) {

            ui.processBtn.disabled =
                false;

        }


        if (ui.dropZone) {

            ui.dropZone.classList.add(
                "has-file"
            );

        }

    }


    /* =====================================================
       HIDE SELECTED FILE
    ===================================================== */

    function hideSelectedFile() {

        const ui = getUI();


        if (ui.selectedFile) {

            ui.selectedFile.classList.add(
                "hidden"
            );

        }


        if (ui.fileName) {
            ui.fileName.textContent =
                "-";
        }


        if (ui.fileSize) {
            ui.fileSize.textContent =
                "-";
        }


        if (ui.processBtn) {

            ui.processBtn.disabled =
                true;

        }


        if (ui.dropZone) {

            ui.dropZone.classList.remove(
                "has-file"
            );

        }

    }


    /* =====================================================
       SET FILE
    ===================================================== */

    function setFile(
        file
    ) {

        if (!file) {
            return false;
        }


        if (!isExcelFile(file)) {

            setSystemStatus(
                "File tidak valid",
                "offline"
            );


            alert(
                "Silakan pilih file Excel (.xlsx, .xls, atau .xlsm)."
            );


            return false;

        }


        state.file =
            file;

        state.fileName =
            file.name;

        state.fileSize =
            file.size;

        state.processed =
            false;


        showSelectedFile(
            file
        );


        setSystemStatus(
            "File dipilih",
            "online"
        );


        return true;

    }


    /* =====================================================
       HANDLE FILE
    ===================================================== */

    async function handleFile(
        file
    ) {

        if (
            !setFile(file)
        ) {

            return;

        }


        await readAndPrepareFile(
            file
        );

    }


    /* =====================================================
       READ AND PREPARE
    ===================================================== */

    async function readAndPrepareFile(
        file
    ) {

        setProcessing(
            true,
            "Membaca file Excel..."
        );


        setSystemStatus(
            "Membaca...",
            "online"
        );


        try {

            const workbook =
                await readExcelFile(
                    file
                );


            if (
                !workbook.SheetNames ||
                !workbook.SheetNames.length
            ) {

                throw new Error(
                    "File Excel tidak memiliki worksheet."
                );

            }


            state.workbook =
                workbook;

            state.sheetNames =
                workbook.SheetNames.slice();


            populateSheetSelect(
                workbook
            );


            const firstSheet =
                workbook.SheetNames[0];


            if (
                !loadSheet(
                    firstSheet
                )
            ) {

                throw new Error(
                    "Gagal membuka worksheet."
                );

            }


            setSystemStatus(
                "File siap",
                "online"
            );


            setProcessing(
                false
            );


            console.log(
                "Excel berhasil dibaca.",
                {
                    file:
                        file.name,

                    sheets:
                        workbook.SheetNames,

                    rows:
                        state.rows.length,

                    headers:
                        state.headers
                }
            );

        }
        catch (error) {

            console.error(
                "Excel read error:",
                error
            );


            setProcessing(
                false
            );


            setSystemStatus(
                "Gagal membaca",
                "offline"
            );


            alert(
                error.message ||
                "Gagal membaca file Excel."
            );

        }

    }


    /* =====================================================
       VALIDATE COLUMNS
    ===================================================== */

    function validateColumns(
        rows
    ) {

        const columns =
            detectColumns(
                rows
            );


        if (!columns.ttNumber) {

            return {

                valid: false,

                error:
                    'Kolom "TT Number" tidak ditemukan.',

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
       VALIDATOR
    ===================================================== */

    function runValidator(
        normalizedRows
    ) {

        if (
            !window.ReportCheckerValidator
        ) {

            throw new Error(
                "validator.js belum dimuat."
            );

        }


        const validator =
            window.ReportCheckerValidator;


        if (
            typeof validator.validateRows ===
            "function"
        ) {

            return validator.validateRows(
                normalizedRows
            );

        }


        if (
            typeof validator.validate ===
            "function"
        ) {

            return validator.validate(
                normalizedRows
            );

        }


        throw new Error(
            "Fungsi validator tidak ditemukan."
        );

    }


    /* =====================================================
       MATERIAL PARSER
    ===================================================== */

    function parseMaterial(
        row
    ) {

        if (
            !window.ReportCheckerMaterial
        ) {

            return [];

        }


        const parser =
            window.ReportCheckerMaterial;


        try {

            if (
                typeof parser.buildRows ===
                "function"
            ) {

                return parser.buildRows(
                    row,
                    "CIR"
                ) || [];

            }


            if (
                typeof parser.parse ===
                "function"
            ) {

                const parsed =
                    parser.parse(
                        row.CIR
                    );


                if (
                    Array.isArray(parsed)
                ) {

                    return parsed;

                }

                if (
                    parsed &&
                    Array.isArray(
                        parsed.rows
                    )
                ) {

                    return parsed.rows;

                }

            }

        }
        catch (error) {

            console.error(
                "Material parser error:",
                error
            );

        }


        return [];

    }


    /* =====================================================
       MATERIAL NORMALIZATION
    ===================================================== */

    function normalizeMaterialRow(
        material,
        sourceRow
    ) {

        const row =
            material || {};


        const ticket =
            row.ticket ||
            row.Ticket ||
            row["TT Number"] ||
            row.ttNumber ||
            row.tt_number ||
            "";


        const materialName =
            row.material ||
            row.Material ||
            row.name ||
            row.materialName ||
            "";


        const quantity =
            row.quantity ??
            row.qty ??
            row.Qty ??
            row.Quantity ??
            "";


        const unit =
            row.unit ||
            row.Unit ||
            row.satuan ||
            row.Satuan ||
            "";


        const code =
            row.code ||
            row.kode ||
            row.Kode ||
            row.materialCode ||
            "";


        const score =
            row.score ??
            row.Score ??
            "";


        const error =
            row.error ||
            row.Error ||
            row.message ||
            "";


        return {

            ticket:
                ticket,

            material:
                materialName,

            quantity:
                quantity,

            unit:
                unit,

            code:
                code,

            score:
                score,

            error:
                error,

            sourceRow:
                sourceRow

        };

    }


    /* =====================================================
       MATERIAL ERROR DETECTION
    ===================================================== */

    function isMaterialError(
        row
    ) {

        if (!row) {
            return true;
        }


        if (
            row.error &&
            String(row.error).trim()
        ) {

            return true;

        }


        const ticket =
            String(
                row.ticket || ""
            ).trim();


        if (!ticket) {
            return true;
        }


        const material =
            String(
                row.material || ""
            ).trim();


        if (!material) {
            return true;
        }


        return false;

    }


    /* =====================================================
       PROCESS DATA
    ===================================================== */

    function processData() {

        if (
            !state.rows.length
        ) {

            throw new Error(
                "Worksheet tidak memiliki data."
            );

        }


        const columnCheck =
            validateColumns(
                state.rows
            );


        if (
            !columnCheck.valid
        ) {

            throw new Error(
                columnCheck.error
            );

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
            normalizedRows.slice(
                0,
                3
            )
        );


        const results =
            runValidator(
                normalizedRows
            );


        state.results =
            Array.isArray(results)
                ? results
                : [];


        const materialRows = [];

        const materialErrorRows = [];


        normalizedRows.forEach(
            function (row) {

                const parsed =
                    parseMaterial(
                        row
                    );


                if (
                    !Array.isArray(parsed) ||
                    !parsed.length
                ) {

                    return;

                }


                parsed.forEach(
                    function (
                        material
                    ) {

                        const normalized =
                            normalizeMaterialRow(
                                material,
                                row
                            );


                        if (
                            isMaterialError(
                                normalized
                            )
                        ) {

                            materialErrorRows.push(
                                normalized
                            );

                        } else {

                            materialRows.push(
                                normalized
                            );

                        }

                    }
                );

            }
        );


        state.materialRows =
            materialRows;


        state.materialErrorRows =
            materialErrorRows;


        state.combinedRows =
            buildCombinedRows(
                normalizedRows,
                state.results,
                materialRows
            );


        state.processed =
            true;


        return state.results;

    }


    /* =====================================================
       GET TICKET
    ===================================================== */

    function getResultTicket(
        result
    ) {

        if (!result) {
            return "";
        }


        return (
            result.ticket ||
            result.Ticket ||
            result["TT Number"] ||
            result.ttNumber ||
            ""
        );

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


        const sourceByTicket =
            new Map();


        sourceRows.forEach(
            function (row) {

                const ticket =
                    String(
                        row["TT Number"] || ""
                    ).trim();


                if (ticket) {

                    sourceByTicket.set(
                        ticket,
                        row
                    );

                }

            }
        );


        validationResults.forEach(
            function (validation) {

                const ticket =
                    getResultTicket(
                        validation
                    );


                const ticketKey =
                    String(
                        ticket
                    ).trim();


                const source =
                    sourceByTicket.get(
                        ticketKey
                    ) || {};


                const matching =
                    materialRows.filter(
                        function (material) {

                            return (
                                String(
                                    material.ticket ||
                                    ""
                                ).trim() ===
                                ticketKey
                            );

                        }
                    );


                if (matching.length) {

                    matching.forEach(
                        function (
                            material
                        ) {

                            output.push({

                                "TT Number":
                                    ticket,

                                "Datetime Receive":
                                    validation
                                        .receiveDateFormatted ||
                                    validation
                                        .receiveDate ||
                                    source[
                                        "Datetime Receive"
                                    ] ||
                                    "",

                                "TT Release":
                                    validation
                                        .releaseDateTime ||
                                    validation
                                        .releaseDate ||
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
                                    material.material,

                                "Quantity":
                                    material.quantity,

                                "Satuan":
                                    material.unit,

                                "Kode":
                                    material.code,

                                "Material Score":
                                    material.score,

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

                } else {

                    output.push({

                        "TT Number":
                            ticket,

                        "Datetime Receive":
                            validation
                                .receiveDateFormatted ||
                            validation
                                .receiveDate ||
                            source[
                                "Datetime Receive"
                            ] ||
                            "",

                        "TT Release":
                            validation
                                .releaseDateTime ||
                            validation
                                .releaseDate ||
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

                        "Kode":
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
        );


        return output;

    }


    /* =====================================================
       SUMMARY
    ===================================================== */

    function calculateSummary(
        results
    ) {

        const summary = {

            total:
                results.length,

            sesuai:
                0,

            tidakSesuai:
                0,

            invalid:
                0

        };


        results.forEach(
            function (result) {

                const status =
                    String(
                        result.status || ""
                    )
                        .trim()
                        .toUpperCase();


                if (
                    status === "SESUAI" ||
                    status === "VALID"
                ) {

                    summary.sesuai++;

                }
                else if (
                    status === "TIDAK SESUAI"
                ) {

                    summary.tidakSesuai++;

                }
                else {

                    summary.invalid++;

                }

            }
        );


        return summary;

    }


    function getSummary(
        results
    ) {

        if (
            window.ReportCheckerValidator &&
            typeof window.ReportCheckerValidator.summary ===
            "function"
        ) {

            try {

                return window.ReportCheckerValidator.summary(
                    results
                );

            }
            catch (error) {

                console.warn(
                    "Validator summary error:",
                    error
                );

            }

        }


        return calculateSummary(
            results
        );

    }


    /* =====================================================
       RENDER DASHBOARD
    ===================================================== */

    function renderDashboard() {

        const ui = getUI();


        const summary =
            getSummary(
                state.results
            );


        const validCount =
            Number(
                summary.sesuai ??
                summary.valid ??
                0
            );


        const invalidCount =
            Number(
                summary.tidakSesuai ??
                summary.invalid ??
                0
            );


        const total =
            Number(
                summary.total ??
                state.results.length
            );


        if (ui.totalCount) {
            ui.totalCount.textContent =
                total;
        }


        if (ui.validCount) {
            ui.validCount.textContent =
                validCount;
        }


        if (ui.invalidCount) {
            ui.invalidCount.textContent =
                invalidCount;
        }


        if (ui.materialCount) {
            ui.materialCount.textContent =
                state.materialRows.length;
        }


        if (ui.materialErrorCount) {
            ui.materialErrorCount.textContent =
                state.materialErrorRows.length;
        }


        if (ui.validTabCount) {
            ui.validTabCount.textContent =
                validCount;
        }


        if (ui.invalidTabCount) {
            ui.invalidTabCount.textContent =
                invalidCount;
        }


        if (ui.materialTabCount) {
            ui.materialTabCount.textContent =
                state.materialRows.length;
        }


        if (ui.materialErrorTabCount) {
            ui.materialErrorTabCount.textContent =
                state.materialErrorRows.length;
        }


        if (ui.resultSummary) {

            ui.resultSummary.textContent =
                `Total ${total} data • ${validCount} sesuai • ${invalidCount} tidak sesuai • ${state.materialRows.length} material`;

        }


        if (ui.dashboardSection) {

            ui.dashboardSection.classList.remove(
                "hidden"
            );

        }

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

    function statusClass(
        status
    ) {

        const value =
            String(
                status || ""
            )
                .trim()
                .toUpperCase();


        if (
            value === "SESUAI" ||
            value === "VALID"
        ) {

            return "sesuai";

        }


        if (
            value === "TIDAK SESUAI"
        ) {

            return "tidak-sesuai";

        }


        return "invalid";

    }


    /* =====================================================
       FILTER RESULTS
    ===================================================== */

    function getValidResults() {

        return state.results.filter(
            function (result) {

                const status =
                    String(
                        result.status || ""
                    )
                        .trim()
                        .toUpperCase();


                return (
                    status === "SESUAI" ||
                    status === "VALID"
                );

            }
        );

    }


    function getInvalidResults() {

        return state.results.filter(
            function (result) {

                const status =
                    String(
                        result.status || ""
                    )
                        .trim()
                        .toUpperCase();


                return !(
                    status === "SESUAI" ||
                    status === "VALID"
                );

            }
        );

    }


    /* =====================================================
       PAGINATION HELPER
    ===================================================== */

    function paginate(
        rows,
        page
    ) {

        const totalPages =
            Math.max(
                1,
                Math.ceil(
                    rows.length /
                    state.pageSize
                )
            );


        const safePage =
            Math.min(
                Math.max(
                    1,
                    page
                ),
                totalPages
            );


        const start =
            (
                safePage - 1
            ) *
            state.pageSize;


        return {

            rows:
                rows.slice(
                    start,
                    start +
                    state.pageSize
                ),

            page:
                safePage,

            totalPages:
                totalPages

        };

    }


    /* =====================================================
       UPDATE PAGINATION UI
    ===================================================== */

    function updatePaginationUI(
        type,
        page,
        totalPages
    ) {

        const ui = getUI();


        let prev;
        let next;
        let number;
        let total;


        if (type === "valid") {

            prev =
                ui.validPrevBtn;

            next =
                ui.validNextBtn;

            number =
                ui.validPageNumber;

            total =
                ui.validPageTotal;

        }


        if (type === "invalid") {

            prev =
                ui.invalidPrevBtn;

            next =
                ui.invalidNextBtn;

            number =
                ui.invalidPageNumber;

            total =
                ui.invalidPageTotal;

        }


        if (type === "material") {

            prev =
                ui.materialPrevBtn;

            next =
                ui.materialNextBtn;

            number =
                ui.materialPageNumber;

            total =
                ui.materialPageTotal;

        }


        if (type === "materialError") {

            prev =
                ui.materialErrorPrevBtn;

            next =
                ui.materialErrorNextBtn;

            number =
                ui.materialErrorPageNumber;

            total =
                ui.materialErrorPageTotal;

        }


        if (number) {
            number.textContent =
                page;
        }


        if (total) {
            total.textContent =
                totalPages;
        }


        if (prev) {
            prev.disabled =
                page <= 1;
        }


        if (next) {
            next.disabled =
                page >= totalPages;
        }

    }


    /* =====================================================
       RENDER VALID TABLE
    ===================================================== */

    function renderValidTable() {

        const ui = getUI();

        const rows =
            getValidResults();


        const pageData =
            paginate(
                rows,
                state.pagination.valid
            );


        state.pagination.valid =
            pageData.page;


        if (ui.validTableBody) {

            ui.validTableBody.innerHTML =
                "";


            pageData.rows.forEach(
                function (result) {

                    const tr =
                        document.createElement(
                            "tr"
                        );


                    tr.innerHTML = `

                        <td>
                            ${escapeHTML(
                                getResultTicket(
                                    result
                                )
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                result
                                    .receiveDateFormatted ||
                                result
                                    .receiveDate ||
                                ""
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                result
                                    .releaseDateTime ||
                                result
                                    .releaseDate ||
                                ""
                            )}
                        </td>

                        <td>
                            <span class="status-badge ${statusClass(
                                result.status
                            )}">
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


                    ui.validTableBody.appendChild(
                        tr
                    );

                }
            );

        }


        if (ui.validEmpty) {

            ui.validEmpty.style.display =
                rows.length
                    ? "none"
                    : "";

        }


        if (ui.validTable) {

            ui.validTable.style.display =
                rows.length
                    ? ""
                    : "none";

        }


        updatePaginationUI(
            "valid",
            pageData.page,
            pageData.totalPages
        );

    }


    /* =====================================================
       RENDER INVALID TABLE
    ===================================================== */

    function renderInvalidTable() {

        const ui = getUI();

        const rows =
            getInvalidResults();


        const pageData =
            paginate(
                rows,
                state.pagination.invalid
            );


        state.pagination.invalid =
            pageData.page;


        if (ui.invalidTableBody) {

            ui.invalidTableBody.innerHTML =
                "";


            pageData.rows.forEach(
                function (result) {

                    const tr =
                        document.createElement(
                            "tr"
                        );


                    tr.innerHTML = `

                        <td>
                            ${escapeHTML(
                                getResultTicket(
                                    result
                                )
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                result
                                    .receiveDateFormatted ||
                                result
                                    .receiveDate ||
                                ""
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                result
                                    .releaseDateTime ||
                                result
                                    .releaseDate ||
                                ""
                            )}
                        </td>

                        <td>
                            <span class="status-badge ${statusClass(
                                result.status
                            )}">
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


                    ui.invalidTableBody.appendChild(
                        tr
                    );

                }
            );

        }


        if (ui.invalidEmpty) {

            ui.invalidEmpty.style.display =
                rows.length
                    ? "none"
                    : "";

        }


        if (ui.invalidTable) {

            ui.invalidTable.style.display =
                rows.length
                    ? ""
                    : "none";

        }


        updatePaginationUI(
            "invalid",
            pageData.page,
            pageData.totalPages
        );

    }


    /* =====================================================
       RENDER MATERIAL TABLE
    ===================================================== */

    function renderMaterialTable() {

        const ui = getUI();

        const rows =
            state.materialRows;


        const pageData =
            paginate(
                rows,
                state.pagination.material
            );


        state.pagination.material =
            pageData.page;


        if (ui.materialTableBody) {

            ui.materialTableBody.innerHTML =
                "";


            pageData.rows.forEach(
                function (row) {

                    const tr =
                        document.createElement(
                            "tr"
                        );


                    tr.innerHTML = `

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
                                row.code
                            )}
                        </td>

                    `;


                    ui.materialTableBody.appendChild(
                        tr
                    );

                }
            );

        }


        if (ui.materialEmpty) {

            ui.materialEmpty.style.display =
                rows.length
                    ? "none"
                    : "";

        }


        if (ui.materialTable) {

            ui.materialTable.style.display =
                rows.length
                    ? ""
                    : "none";

        }


        updatePaginationUI(
            "material",
            pageData.page,
            pageData.totalPages
        );

    }


    /* =====================================================
       RENDER MATERIAL ERROR TABLE
    ===================================================== */

    function renderMaterialErrorTable() {

        const ui = getUI();

        const rows =
            state.materialErrorRows;


        const pageData =
            paginate(
                rows,
                state.pagination.materialError
            );


        state.pagination.materialError =
            pageData.page;


        if (ui.materialErrorTableBody) {

            ui.materialErrorTableBody.innerHTML =
                "";


            pageData.rows.forEach(
                function (row) {

                    const tr =
                        document.createElement(
                            "tr"
                        );


                    tr.innerHTML = `

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
                                row.code
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                row.error ||
                                "Material tidak valid"
                            )}
                        </td>

                    `;


                    ui.materialErrorTableBody.appendChild(
                        tr
                    );

                }
            );

        }


        if (ui.materialErrorEmpty) {

            ui.materialErrorEmpty.style.display =
                rows.length
                    ? "none"
                    : "";

        }


        if (ui.materialErrorTable) {

            ui.materialErrorTable.style.display =
                rows.length
                    ? ""
                    : "none";

        }


        updatePaginationUI(
            "materialError",
            pageData.page,
            pageData.totalPages
        );

    }


    /* =====================================================
       RENDER ALL
    ===================================================== */

    function renderAll() {

        state.pagination.valid =
            1;

        state.pagination.invalid =
            1;

        state.pagination.material =
            1;

        state.pagination.materialError =
            1;


        renderDashboard();

        renderValidTable();

        renderInvalidTable();

        renderMaterialTable();

        renderMaterialErrorTable();


        const ui = getUI();


        if (ui.downloadValidBtn) {

            ui.downloadValidBtn.disabled =
                getValidResults().length === 0;

        }


        if (ui.downloadInvalidBtn) {

            ui.downloadInvalidBtn.disabled =
                getInvalidResults().length === 0;

        }


        if (ui.downloadMaterialBtn) {

            ui.downloadMaterialBtn.disabled =
                state.materialRows.length === 0;

        }


        if (ui.downloadMaterialErrorBtn) {

            ui.downloadMaterialErrorBtn.disabled =
                state.materialErrorRows.length === 0;

        }

    }


    /* =====================================================
       RUN PROCESS
    ===================================================== */

    async function runProcess() {

        if (!checkDependencies()) {
            return;
        }


        if (!state.file) {

            alert(
                "Silakan pilih file Excel terlebih dahulu."
            );

            return;

        }


        if (!state.workbook) {

            await readAndPrepareFile(
                state.file
            );


            if (!state.workbook) {
                return;
            }

        }


        setProcessing(
            true,
            "Memvalidasi data Excel..."
        );


        setSystemStatus(
            "Memproses...",
            "online"
        );


        try {

            /*
             * Pastikan worksheet terbaru
             * digunakan.
             */

            if (
                state.sheetName
            ) {

                loadSheet(
                    state.sheetName
                );

            }


            const results =
                processData();


            renderAll();


            const summary =
                getSummary(
                    results
                );


            const sesuai =
                Number(
                    summary.sesuai ??
                    summary.valid ??
                    0
                );


            const tidakSesuai =
                Number(
                    summary.tidakSesuai ??
                    0
                );


            setProcessing(
                false
            );


            setSystemStatus(
                "Selesai",
                "online"
            );


            console.log(
                "Report Checker result:",
                {
                    total:
                        results.length,

                    sesuai:
                        sesuai,

                    tidakSesuai:
                        tidakSesuai,

                    material:
                        state.materialRows.length,

                    materialError:
                        state.materialErrorRows.length
                }
            );

        }
        catch (error) {

            console.error(
                "Process error:",
                error
            );


            setProcessing(
                false
            );


            setSystemStatus(
                "Error",
                "offline"
            );


            alert(
                error.message ||
                "Terjadi kesalahan saat memproses Excel."
            );

        }

    }


    /* =====================================================
       EXPORT HELPERS
    ===================================================== */

    function exportRows(
        rows,
        filename,
        sheetName
    ) {

        if (
            typeof XLSX === "undefined"
        ) {

            alert(
                "Library XLSX tidak tersedia."
            );

            return;

        }


        if (
            !Array.isArray(rows) ||
            !rows.length
        ) {

            alert(
                "Tidak ada data untuk didownload."
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
                sheetName ||
                "Report"
            );


            XLSX.writeFile(
                workbook,
                filename
            );

        }
        catch (error) {

            console.error(
                "Export error:",
                error
            );


            alert(
                "Gagal membuat file Excel."
            );

        }

    }


    /* =====================================================
       EXPORT VALID
    ===================================================== */

    function exportValid() {

        const rows =
            getValidResults();


        const output =
            rows.map(
                function (result) {

                    return {

                        "TT Number":
                            getResultTicket(
                                result
                            ),

                        "Datetime Receive":
                            result
                                .receiveDateFormatted ||
                            result
                                .receiveDate ||
                            "",

                        "TT Release":
                            result
                                .releaseDateTime ||
                            result
                                .releaseDate ||
                            "",

                        "Status":
                            result.status ||
                            "",

                        "Keterangan":
                            result.reason ||
                            "",

                        "Release Raw":
                            result.releaseRaw ||
                            ""

                    };

                }
            );


        exportRows(
            output,
            makeFilename(
                "Sesuai"
            ),
            "Sesuai"
        );

    }


    /* =====================================================
       EXPORT INVALID
    ===================================================== */

    function exportInvalid() {

        const rows =
            getInvalidResults();


        const output =
            rows.map(
                function (result) {

                    return {

                        "TT Number":
                            getResultTicket(
                                result
                            ),

                        "Datetime Receive":
                            result
                                .receiveDateFormatted ||
                            result
                                .receiveDate ||
                            "",

                        "TT Release":
                            result
                                .releaseDateTime ||
                            result
                                .releaseDate ||
                            "",

                        "Status":
                            result.status ||
                            "",

                        "Keterangan":
                            result.reason ||
                            "",

                        "Release Raw":
                            result.releaseRaw ||
                            ""

                    };

                }
            );


        exportRows(
            output,
            makeFilename(
                "Tidak-Sesuai"
            ),
            "Tidak Sesuai"
        );

    }


    /* =====================================================
       EXPORT MATERIAL
    ===================================================== */

    function exportMaterial() {

        const output =
            state.materialRows.map(
                function (row) {

                    return {

                        "TT Number":
                            row.ticket,

                        "Material":
                            row.material,

                        "Qty":
                            row.quantity,

                        "Satuan":
                            row.unit,

                        "Kode":
                            row.code,

                        "Score":
                            row.score

                    };

                }
            );


        exportRows(
            output,
            makeFilename(
                "Material"
            ),
            "Material"
        );

    }


    /* =====================================================
       EXPORT MATERIAL ERROR
    ===================================================== */

    function exportMaterialError() {

        const output =
            state.materialErrorRows.map(
                function (row) {

                    return {

                        "TT Number":
                            row.ticket,

                        "Material":
                            row.material,

                        "Qty":
                            row.quantity,

                        "Satuan":
                            row.unit,

                        "Kode":
                            row.code,

                        "Error":
                            row.error ||
                            "Material tidak valid"

                    };

                }
            );


        exportRows(
            output,
            makeFilename(
                "Material-Error"
            ),
            "Material Error"
        );

    }


    /* =====================================================
       EXPORT DETAIL
    ===================================================== */

    function exportDetail() {

        exportRows(
            state.combinedRows,
            makeFilename(
                "Detail"
            ),
            "Detail"
        );

    }


    /* =====================================================
       FILENAME
    ===================================================== */

    function makeFilename(
        suffix
    ) {

        let base =
            state.fileName ||
            "report-checker";


        base =
            base.replace(
                /\.[^.]+$/,
                ""
            );


        return (
            base +
            "-" +
            suffix +
            ".xlsx"
        );

    }


    /* =====================================================
       RESET
    ===================================================== */

    function resetApp() {

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

        state.materialErrorRows =
            [];

        state.combinedRows =
            [];

        state.headers =
            [];

        state.file =
            null;

        state.fileName =
            "";

        state.fileSize =
            0;

        state.sheetName =
            "";

        state.sheetNames =
            [];

        state.processed =
            false;


        state.pagination.valid =
            1;

        state.pagination.invalid =
            1;

        state.pagination.material =
            1;

        state.pagination.materialError =
            1;


        const ui =
            getUI();


        if (ui.fileInput) {

            ui.fileInput.value =
                "";

        }


        hideSelectedFile();


        if (ui.dashboardSection) {

            ui.dashboardSection.classList.add(
                "hidden"
            );

        }


        if (ui.validTableBody) {

            ui.validTableBody.innerHTML =
                "";

        }


        if (ui.invalidTableBody) {

            ui.invalidTableBody.innerHTML =
                "";

        }


        if (ui.materialTableBody) {

            ui.materialTableBody.innerHTML =
                "";

        }


        if (ui.materialErrorTableBody) {

            ui.materialErrorTableBody.innerHTML =
                "";

        }


        setProcessing(
            false
        );


        setSystemStatus(
            "Ready",
            "offline"
        );

    }


    /* =====================================================
       PAGINATION EVENTS
    ===================================================== */

    function changePage(
        type,
        direction
    ) {

        state.pagination[type] +=
            direction;


        if (
            state.pagination[type] < 1
        ) {

            state.pagination[type] =
                1;

        }


        if (type === "valid") {

            renderValidTable();

        }


        if (type === "invalid") {

            renderInvalidTable();

        }


        if (type === "material") {

            renderMaterialTable();

        }


        if (type === "materialError") {

            renderMaterialErrorTable();

        }

    }


    /* =====================================================
       TABS
    ===================================================== */

    function setupTabs() {

        const buttons =
            $$(
                ".tab-button"
            );


        const contents =
            $$(
                ".tab-content"
            );


        buttons.forEach(
            function (button) {

                button.addEventListener(
                    "click",
                    function () {

                        const tab =
                            button.dataset.tab;


                        buttons.forEach(
                            function (item) {

                                item.classList.remove(
                                    "active"
                                );

                            }
                        );


                        contents.forEach(
                            function (content) {

                                content.classList.remove(
                                    "active"
                                );

                            }
                        );


                        button.classList.add(
                            "active"
                        );


                        const target =
                            byId(
                                "tab-" +
                                tab
                            );


                        if (target) {

                            target.classList.add(
                                "active"
                            );

                        }

                    }
                );

            }
        );

    }


    /* =====================================================
       SETTINGS
    ===================================================== */

    function setupSettings() {

        const ui =
            getUI();


        if (
            ui.toggleSettingsBtn &&
            ui.settingsPanel
        ) {

            ui.toggleSettingsBtn.addEventListener(
                "click",
                function () {

                    ui.settingsPanel.classList.toggle(
                        "hidden"
                    );


                    const opened =
                        !ui.settingsPanel.classList.contains(
                            "hidden"
                        );


                    ui.toggleSettingsBtn.textContent =
                        opened
                            ? "Tutup Pengaturan"
                            : "Buka Pengaturan";

                }
            );

        }


        if (
            ui.saveSettingsBtn
        ) {

            ui.saveSettingsBtn.addEventListener(
                "click",
                function () {

                    try {

                        if (
                            window.ReportCheckerSettings &&
                            typeof window.ReportCheckerSettings.save ===
                            "function"
                        ) {

                            window.ReportCheckerSettings.save();

                        }


                        if (
                            ui.settingsSavedMessage
                        ) {

                            ui.settingsSavedMessage.classList.remove(
                                "hidden"
                            );


                            setTimeout(
                                function () {

                                    ui.settingsSavedMessage.classList.add(
                                        "hidden"
                                    );

                                },
                                2500
                            );

                        }

                    }
                    catch (error) {

                        console.error(
                            "Settings save error:",
                            error
                        );

                    }

                }
            );

        }


        if (
            ui.resetSettingsBtn
        ) {

            ui.resetSettingsBtn.addEventListener(
                "click",
                function () {

                    try {

                        if (
                            window.ReportCheckerSettings &&
                            typeof window.ReportCheckerSettings.reset ===
                            "function"
                        ) {

                            window.ReportCheckerSettings.reset();

                        }

                    }
                    catch (error) {

                        console.error(
                            "Settings reset error:",
                            error
                        );

                    }

                }
            );

        }

    }


    /* =====================================================
       DRAG & DROP
       
       INI BAGIAN PENTING UNTUK MASALAH DROP.
    ===================================================== */

    function setupDropZone() {

        const ui =
            getUI();


        if (!ui.dropZone) {

            console.error(
                "dropZone tidak ditemukan."
            );

            return;

        }


        console.log(
            "Drop zone initialized."
        );


        /*
         * Klik drop zone
         */

        ui.dropZone.addEventListener(
            "click",
            function (event) {

                /*
                 * Jangan trigger kalau yang diklik
                 * adalah input file itu sendiri.
                 */

                if (
                    event.target ===
                    ui.fileInput
                ) {

                    return;

                }


                if (ui.fileInput) {

                    ui.fileInput.click();

                }

            }
        );


        /*
         * Keyboard accessibility
         */

        ui.dropZone.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key === "Enter" ||
                    event.key === " "
                ) {

                    event.preventDefault();


                    if (ui.fileInput) {

                        ui.fileInput.click();

                    }

                }

            }
        );


        /*
         * Drag enter
         */

        ui.dropZone.addEventListener(
            "dragenter",
            function (event) {

                event.preventDefault();

                event.stopPropagation();


                ui.dropZone.classList.add(
                    "drag-over"
                );

            }
        );


        /*
         * Drag over
         */

        ui.dropZone.addEventListener(
            "dragover",
            function (event) {

                event.preventDefault();

                event.stopPropagation();


                if (
                    event.dataTransfer
                ) {

                    event.dataTransfer.dropEffect =
                        "copy";

                }


                ui.dropZone.classList.add(
                    "drag-over"
                );

            }
        );


        /*
         * Drag leave
         */

        ui.dropZone.addEventListener(
            "dragleave",
            function (event) {

                event.preventDefault();

                event.stopPropagation();


                /*
                 * Jangan langsung hapus class
                 * kalau pindah ke child element.
                 */

                if (
                    event.relatedTarget &&
                    ui.dropZone.contains(
                        event.relatedTarget
                    )
                ) {

                    return;

                }


                ui.dropZone.classList.remove(
                    "drag-over"
                );

            }
        );


        /*
         * DROP
         */

        ui.dropZone.addEventListener(
            "drop",
            function (event) {

                event.preventDefault();

                event.stopPropagation();


                ui.dropZone.classList.remove(
                    "drag-over"
                );


                const files =
                    event.dataTransfer &&
                    event.dataTransfer.files;


                if (
                    !files ||
                    !files.length
                ) {

                    return;

                }


                const file =
                    files[0];


                console.log(
                    "Dropped file:",
                    file.name,
                    file.type,
                    file.size
                );


                handleFile(
                    file
                );

            }
        );

    }


    /* =====================================================
       FILE INPUT
    ===================================================== */

    function setupFileInput() {

        const ui =
            getUI();


        if (!ui.fileInput) {

            console.error(
                "#excelFile tidak ditemukan."
            );

            return;

        }


        ui.fileInput.addEventListener(
            "change",
            function (event) {

                const file =
                    event.target.files &&
                    event.target.files[0];


                if (file) {

                    handleFile(
                        file
                    );

                }

            }
        );

    }


    /* =====================================================
       BUTTON EVENTS
    ===================================================== */

    function setupButtons() {

        const ui =
            getUI();


        /*
         * Proses
         */

        if (ui.processBtn) {

            ui.processBtn.addEventListener(
                "click",
                runProcess
            );

        }


        /*
         * Hapus file
         */

        if (ui.removeFileBtn) {

            ui.removeFileBtn.addEventListener(
                "click",
                function () {

                    resetApp();

                }
            );

        }


        /*
         * Reset
         */

        if (ui.resetBtn) {

            ui.resetBtn.addEventListener(
                "click",
                resetApp
            );

        }


        /*
         * Download sesuai
         */

        if (ui.downloadValidBtn) {

            ui.downloadValidBtn.addEventListener(
                "click",
                exportValid
            );

        }


        /*
         * Download tidak sesuai
         */

        if (ui.downloadInvalidBtn) {

            ui.downloadInvalidBtn.addEventListener(
                "click",
                exportInvalid
            );

        }


        /*
         * Download material
         */

        if (ui.downloadMaterialBtn) {

            ui.downloadMaterialBtn.addEventListener(
                "click",
                exportMaterial
            );

        }


        /*
         * Download material error
         */

        if (ui.downloadMaterialErrorBtn) {

            ui.downloadMaterialErrorBtn.addEventListener(
                "click",
                exportMaterialError
            );

        }

    }


    /* =====================================================
       PAGINATION BUTTON EVENTS
    ===================================================== */

    function setupPagination() {

        const ui =
            getUI();


        if (ui.validPrevBtn) {

            ui.validPrevBtn.addEventListener(
                "click",
                function () {

                    changePage(
                        "valid",
                        -1
                    );

                }
            );

        }


        if (ui.validNextBtn) {

            ui.validNextBtn.addEventListener(
                "click",
                function () {

                    changePage(
                        "valid",
                        1
                    );

                }
            );

        }


        if (ui.invalidPrevBtn) {

            ui.invalidPrevBtn.addEventListener(
                "click",
                function () {

                    changePage(
                        "invalid",
                        -1
                    );

                }
            );

        }


        if (ui.invalidNextBtn) {

            ui.invalidNextBtn.addEventListener(
                "click",
                function () {

                    changePage(
                        "invalid",
                        1
                    );

                }
            );

        }


        if (ui.materialPrevBtn) {

            ui.materialPrevBtn.addEventListener(
                "click",
                function () {

                    changePage(
                        "material",
                        -1
                    );

                }
            );

        }


        if (ui.materialNextBtn) {

            ui.materialNextBtn.addEventListener(
                "click",
                function () {

                    changePage(
                        "material",
                        1
                    );

                }
            );

        }


        if (ui.materialErrorPrevBtn) {

            ui.materialErrorPrevBtn.addEventListener(
                "click",
                function () {

                    changePage(
                        "materialError",
                        -1
                    );

                }
            );

        }


        if (ui.materialErrorNextBtn) {

            ui.materialErrorNextBtn.addEventListener(
                "click",
                function () {

                    changePage(
                        "materialError",
                        1
                    );

                }
            );

        }

    }


    /* =====================================================
       GLOBAL DRAG PREVENT
       
       Supaya browser tidak membuka file saat
       drop terjadi di luar drop zone.
    ===================================================== */

    function setupGlobalDragProtection() {

        document.addEventListener(
            "dragover",
            function (event) {

                event.preventDefault();

            }
        );


        document.addEventListener(
            "drop",
            function (event) {

                /*
                 * Hanya cegah default.
                 * Drop zone sendiri sudah punya handler.
                 */

                event.preventDefault();

            }
        );

    }


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


        console.log(
            "ReportChecker initializing..."
        );


        checkDependencies();


        setupDropZone();

        setupFileInput();

        setupButtons();

        setupPagination();

        setupTabs();

        setupSettings();

        setupGlobalDragProtection();


        setSystemStatus(
            "Ready",
            "offline"
        );


        console.log(
            "ReportChecker app.js loaded. exporter.js dependency removed."
        );

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
            runProcess,

        reset:
            resetApp,

        exportValid:
            exportValid,

        exportInvalid:
            exportInvalid,

        exportMaterial:
            exportMaterial,

        exportMaterialError:
            exportMaterialError,

        exportDetail:
            exportDetail,

        render:
            renderAll,

        debug:
            function () {

                console.log(
                    "ReportChecker state:",
                    state
                );


                return state;

            }

    };


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


})();
