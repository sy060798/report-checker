/* =========================================================
   REPORT CHECKER
   app.js - FULL UPDATE

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
   - Multi Worksheet
   - Validasi TT Number
   - Datetime Receive
   - CIR
   - LOCK SISTEM CIR
   - TANGGAL CIR = TANGGAL PERTAMA DI BAWAH CIR
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

        /* =================================================
           CIR LOCK
        ================================================= */

        cirLocked: true,

        cirDateRequired: true,

        cirDateField: "CIR Date",

        cirSource: "FIRST_DATE_BELOW_CIR",

        cirErrors: [],

        cirWarnings: [],

        cirParsedRows: [],

        cirDateMap: new Map(),

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


    /* =====================================================
       UI
    ===================================================== */

    function getUI() {

        return {

            dropZone: byId("dropZone"),
            fileInput: byId("excelFile"),

            selectedFile: byId("selectedFile"),
            fileName: byId("fileName"),
            fileSize: byId("fileSize"),
            removeFileBtn: byId("removeFileBtn"),

            processBtn: byId("processBtn"),

            processingStatus: byId("processingStatus"),
            processingText: byId("processingText"),
            processingProgress: byId("processingProgress"),

            systemStatus: byId("systemStatus"),

            dashboardSection: byId("dashboardSection"),
            resultSummary: byId("resultSummary"),

            resetBtn: byId("resetBtn"),

            totalCount: byId("totalCount"),
            validCount: byId("validCount"),
            invalidCount: byId("invalidCount"),
            materialCount: byId("materialCount"),
            materialErrorCount: byId("materialErrorCount"),

            validTabCount: byId("validTabCount"),
            invalidTabCount: byId("invalidTabCount"),
            materialTabCount: byId("materialTabCount"),
            materialErrorTabCount: byId("materialErrorTabCount"),

            validTable: byId("validTable"),
            validTableBody: byId("validTableBody"),
            validEmpty: byId("validEmpty"),

            invalidTable: byId("invalidTable"),
            invalidTableBody: byId("invalidTableBody"),
            invalidEmpty: byId("invalidEmpty"),

            materialTable: byId("materialTable"),
            materialTableBody: byId("materialTableBody"),
            materialEmpty: byId("materialEmpty"),

            materialErrorTable: byId("materialErrorTable"),
            materialErrorTableBody: byId("materialErrorTableBody"),
            materialErrorEmpty: byId("materialErrorEmpty"),

            validPagination: byId("validPagination"),
            invalidPagination: byId("invalidPagination"),
            materialPagination: byId("materialPagination"),
            materialErrorPagination:
                byId("materialErrorPagination"),

            validPrevBtn: byId("validPrevBtn"),
            validNextBtn: byId("validNextBtn"),
            validPageNumber: byId("validPageNumber"),
            validPageTotal: byId("validPageTotal"),

            invalidPrevBtn: byId("invalidPrevBtn"),
            invalidNextBtn: byId("invalidNextBtn"),
            invalidPageNumber: byId("invalidPageNumber"),
            invalidPageTotal: byId("invalidPageTotal"),

            materialPrevBtn: byId("materialPrevBtn"),
            materialNextBtn: byId("materialNextBtn"),
            materialPageNumber: byId("materialPageNumber"),
            materialPageTotal: byId("materialPageTotal"),

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

    function setSystemStatus(text, type) {

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


    function setProcessing(active, text) {

        const ui = getUI();

        if (!ui.processingStatus) {
            return;
        }

        if (active) {

            ui.processingStatus.classList.remove(
                "hidden"
            );

            if (ui.processingText && text) {

                ui.processingText.textContent =
                    text;

            }

        } else {

            ui.processingStatus.classList.add(
                "hidden"
            );

        }

    }


    /* =====================================================
       PROGRESS
    ===================================================== */

    function updateProgress(percent, text) {

        const ui = getUI();

        if (ui.processingProgress) {

            ui.processingProgress.textContent =
                `${percent}%`;

        }

        if (ui.processingText && text) {

            ui.processingText.textContent =
                text;

        }

    }


    /* =====================================================
       DEPENDENCY CHECK
    ===================================================== */

    function checkDependencies() {

        if (typeof XLSX === "undefined") {

            console.error(
                "SheetJS XLSX tidak ditemukan."
            );

            setSystemStatus(
                "XLSX Error",
                "offline"
            );

            return false;

        }

        if (!window.ReportCheckerValidator) {

            console.warn(
                "validator.js belum tersedia."
            );

        }

        if (!window.ReportCheckerMaterial) {

            console.warn(
                "material-parser.js belum tersedia."
            );

        }

        if (!window.ReportCheckerCIR) {

            console.warn(
                "cir-parser.js belum tersedia. " +
                "Fallback CIR parser akan digunakan."
            );

        }

        return true;

    }


    /* =====================================================
       FILE SIZE
    ===================================================== */

    function formatFileSize(bytes) {

        if (!bytes) {
            return "0 KB";
        }

        if (bytes < 1024) {
            return `${bytes} B`;
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

    function isExcelFile(file) {

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
       NORMALIZE
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


    function normalizeText(value) {

        if (
            value === null ||
            value === undefined
        ) {
            return "";
        }

        return String(value)
            .replace(/\u00A0/g, " ")
            .replace(/\r/g, "")
            .trim();

    }


    function findHeader(headers, names) {

        if (!Array.isArray(headers)) {
            return null;
        }

        const wanted =
            names.map(normalizeHeader);

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
            Object.keys(rows[0] || {});

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
                        "Ticket Number"
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
       NORMALIZE INPUT
    ===================================================== */

    function normalizeInputRow(row, columns) {

        const result = {

            "TT Number": "",
            "Datetime Receive": "",
            "CIR": "",

            "CIR Date": "",

            originalRow: row

        };

        if (!row) {
            return result;
        }

        if (columns.ttNumber) {

            result["TT Number"] =
                row[columns.ttNumber];

        }

        if (columns.datetimeReceive) {

            result["Datetime Receive"] =
                row[columns.datetimeReceive];

        }

        if (columns.cir) {

            result["CIR"] =
                row[columns.cir];

        }

        return result;

    }


    /* =====================================================
       EXCEL DATE
    ===================================================== */

    function excelSerialToDate(value) {

        if (
            typeof value !== "number" ||
            !Number.isFinite(value)
        ) {
            return null;
        }

        if (value < 1) {
            return null;
        }

        const excelEpoch =
            Date.UTC(1899, 11, 30);

        const milliseconds =
            value * 86400000;

        const date =
            new Date(
                excelEpoch + milliseconds
            );

        return isNaN(date.getTime())
            ? null
            : date;

    }


    function dateToISO(date) {

        if (!(date instanceof Date)) {
            return "";
        }

        if (isNaN(date.getTime())) {
            return "";
        }

        const y =
            date.getFullYear();

        const m =
            String(
                date.getMonth() + 1
            ).padStart(2, "0");

        const d =
            String(
                date.getDate()
            ).padStart(2, "0");

        return `${y}-${m}-${d}`;

    }


    function formatDateDisplay(value) {

        if (!value) {
            return "";
        }

        let date = null;

        if (value instanceof Date) {

            date = value;

        }
        else if (
            typeof value === "number"
        ) {

            date =
                excelSerialToDate(
                    value
                );

        }
        else {

            const text =
                normalizeText(value);

            const match =
                text.match(
                    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/
                );

            if (match) {

                const d =
                    Number(match[1]);

                const m =
                    Number(match[2]) - 1;

                const y =
                    Number(match[3]);

                date =
                    new Date(
                        y,
                        m,
                        d
                    );

            }
            else {

                const parsed =
                    new Date(text);

                if (
                    !isNaN(
                        parsed.getTime()
                    )
                ) {
                    date = parsed;
                }

            }

        }

        if (!date) {
            return "";
        }

        const d =
            String(
                date.getDate()
            ).padStart(2, "0");

        const m =
            String(
                date.getMonth() + 1
            ).padStart(2, "0");

        const y =
            date.getFullYear();

        return `${d}/${m}/${y}`;

    }


    /* =====================================================
       DATE DETECTION
       
       LOCK RULE:
       HANYA tanggal pertama yang ditemukan
       pada baris pertama setelah CIR/header CIR.
    ===================================================== */

    function isDateValue(value) {

        if (
            value instanceof Date &&
            !isNaN(value.getTime())
        ) {

            return true;

        }

        if (
            typeof value === "number"
        ) {

            return !!excelSerialToDate(value);

        }

        const text =
            normalizeText(value);

        if (!text) {
            return false;
        }

        const patterns = [

            /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/,

            /^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/,

            /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}\s+\d{1,2}:\d{2}/,

            /^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}\s+\d{1,2}:\d{2}/

        ];

        return patterns.some(
            pattern =>
                pattern.test(text)
        );

    }


    function extractDateFromValue(value) {

        if (!isDateValue(value)) {
            return "";
        }

        return formatDateDisplay(
            value
        );

    }


    /* =====================================================
       STRICT CIR DATE PARSER
    ===================================================== */

    function getFirstDateBelowCIR(
        cirValue
    ) {

        const text =
            normalizeText(cirValue);

        if (!text) {

            return {

                date: "",
                error:
                    "CIR kosong"

            };

        }

        /*
         * Pecah CIR menjadi baris.
         */

        const lines =
            text
                .split("\n")
                .map(
                    line =>
                        normalizeText(line)
                );

        /*
         * Buang baris kosong di awal.
         */

        while (
            lines.length &&
            !lines[0]
        ) {
            lines.shift();
        }

        /*
         * Cari posisi header/label CIR.
         */

        let cirIndex = -1;

        for (
            let i = 0;
            i < lines.length;
            i++
        ) {

            const normalized =
                normalizeHeader(
                    lines[i]
                );

            if (
                normalized === "cir" ||
                normalized.startsWith("cir ")
            ) {

                cirIndex = i;
                break;

            }

        }

        /*
         * Jika CIR sendiri tidak memiliki
         * header terpisah, mulai dari baris pertama.
         */

        const startIndex =
            cirIndex >= 0
                ? cirIndex + 1
                : 0;

        /*
         * LOCK:
         * hanya BARIS PERTAMA setelah CIR
         * yang boleh menjadi tanggal.
         */

        if (
            startIndex >= lines.length
        ) {

            return {

                date: "",
                error:
                    "Tanggal pertama di bawah CIR tidak ditemukan"

            };

        }

        const firstLine =
            lines[startIndex];

        /*
         * Jika baris pertama kosong,
         * jangan lompat ke tanggal berikutnya.
         *
         * Ini sengaja dibuat STRICT.
         */

        if (!firstLine) {

            return {

                date: "",
                error:
                    "Baris pertama di bawah CIR kosong"

            };

        }

        /*
         * Tanggal harus berada pada baris pertama.
         */

        const match =
            firstLine.match(
                /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/
            );

        if (!match) {

            return {

                date: "",
                error:
                    "Tanggal pertama di bawah CIR tidak valid"

            };

        }

        const formatted =
            formatDateDisplay(
                match[1]
            );

        if (!formatted) {

            return {

                date: "",
                error:
                    "Tanggal pertama di bawah CIR gagal diparse"

            };

        }

        return {

            date: formatted,
            error: ""

        };

    }


    /* =====================================================
       CIR PARSER INTEGRATION
       
       Kalau cir-parser.js mempunyai API sendiri,
       kita gunakan API tersebut terlebih dahulu.
       Tetapi tanggal tetap dikunci.
    ===================================================== */

    function parseCIR(row) {

        const cir =
            row
                ? row.CIR
                : "";

        /*
         * Coba API parser terbaru.
         */

        if (
            window.ReportCheckerCIR
        ) {

            const parser =
                window.ReportCheckerCIR;

            try {

                if (
                    typeof parser.parseRow ===
                    "function"
                ) {

                    const parsed =
                        parser.parseRow(
                            row
                        );

                    if (
                        parsed &&
                        typeof parsed ===
                        "object"
                    ) {

                        return applyCIRDateLock(
                            row,
                            parsed
                        );

                    }

                }

                if (
                    typeof parser.parse ===
                    "function"
                ) {

                    const parsed =
                        parser.parse(
                            cir,
                            row
                        );

                    if (
                        parsed &&
                        typeof parsed ===
                        "object"
                    ) {

                        return applyCIRDateLock(
                            row,
                            parsed
                        );

                    }

                }

            }
            catch (error) {

                console.warn(
                    "CIR parser error. " +
                    "Fallback digunakan:",
                    error
                );

            }

        }

        /*
         * Fallback.
         */

        return applyCIRDateLock(
            row,
            {}
        );

    }


    function applyCIRDateLock(
        sourceRow,
        parsed
    ) {

        const result =
            parsed || {};

        /*
         * Jangan mempercayai tanggal hasil parser
         * apabila bukan tanggal pertama di bawah CIR.
         */

        const locked =
            getFirstDateBelowCIR(
                sourceRow.CIR
            );

        result["CIR Date"] =
            locked.date;

        result.cirDate =
            locked.date;

        result.cirDateFormatted =
            locked.date;

        result.cirDateSource =
            "FIRST_DATE_BELOW_CIR";

        result.cirDateLocked =
            true;

        result.cirDateError =
            locked.error || "";

        return result;

    }


    /* =====================================================
       APPLY CIR TO ROWS
    ===================================================== */

    function processCIRRows(
        normalizedRows
    ) {

        const output = [];

        state.cirErrors = [];
        state.cirWarnings = [];
        state.cirParsedRows = [];
        state.cirDateMap =
            new Map();

        normalizedRows.forEach(
            function (row, index) {

                const parsed =
                    parseCIR(row);

                const cirDate =
                    parsed["CIR Date"] ||
                    parsed.cirDate ||
                    "";

                const ticket =
                    normalizeText(
                        row["TT Number"]
                    );

                const cirResult = {

                    index: index,

                    ticket: ticket,

                    date: cirDate,

                    error:
                        parsed.cirDateError ||
                        "",

                    parsed: parsed

                };

                state.cirParsedRows.push(
                    cirResult
                );

                if (
                    cirResult.error
                ) {

                    state.cirErrors.push(
                        {
                            ticket: ticket,
                            error:
                                cirResult.error
                        }
                    );

                }

                if (ticket) {

                    state.cirDateMap.set(
                        ticket,
                        cirDate
                    );

                }

                output.push({

                    ...row,

                    "CIR Date":
                        cirDate,

                    cirDate:
                        cirDate,

                    cirDateError:
                        cirResult.error,

                    cirLocked:
                        true

                });

            }
        );

        return output;

    }


    /* =====================================================
       EXCEL READ
    ===================================================== */

    function readExcelFile(file) {

        return new Promise(
            function (resolve, reject) {

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

                reader.readAsArrayBuffer(
                    file
                );

            }
        );

    }


    /* =====================================================
       WORKSHEET JSON
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
       SHEET SELECTOR
    ===================================================== */

    function getOrCreateSheetSelector() {

        let select =
            byId("sheetSelect");

        if (select) {
            return select;
        }

        const ui =
            getUI();

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

        select.innerHTML = "";

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

        if (!state.workbook) {
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

        state.processed =
            false;

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
       SHOW FILE
    ===================================================== */

    function showSelectedFile(file) {

        const ui =
            getUI();

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


    function hideSelectedFile() {

        const ui =
            getUI();

        if (ui.selectedFile) {

            ui.selectedFile.classList.add(
                "hidden"
            );

        }

        if (ui.fileName) {
            ui.fileName.textContent = "-";
        }

        if (ui.fileSize) {
            ui.fileSize.textContent = "-";
        }

        if (ui.processBtn) {
            ui.processBtn.disabled = true;
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

    function setFile(file) {

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

        state.cirErrors = [];
        state.cirWarnings = [];

        showSelectedFile(file);

        setSystemStatus(
            "File dipilih",
            "online"
        );

        return true;

    }


    async function handleFile(file) {

        if (!setFile(file)) {
            return;
        }

        await readAndPrepareFile(
            file
        );

    }


    /* =====================================================
       READ PREPARE
    ===================================================== */

    async function readAndPrepareFile(file) {

        setProcessing(
            true,
            "Membaca file Excel..."
        );

        updateProgress(
            5,
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

            updateProgress(
                10,
                "File Excel siap."
            );

            setSystemStatus(
                "File siap",
                "online"
            );

            setProcessing(
                false
            );

        }
        catch (error) {

            console.error(
                "Excel read error:",
                error
            );

            setProcessing(false);

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

    function validateColumns(rows) {

        const columns =
            detectColumns(rows);

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

    function parseMaterial(row) {

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

                return (
                    parser.buildRows(
                        row,
                        "CIR"
                    ) || []
                );

            }

            if (
                typeof parser.parseRow ===
                "function"
            ) {

                const parsed =
                    parser.parseRow(
                        row
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

            if (
                typeof parser.parse ===
                "function"
            ) {

                const parsed =
                    parser.parse(
                        row.CIR,
                        row
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
            sourceRow["TT Number"] ||
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

            ticket,
            material: materialName,
            quantity,
            unit,
            code,
            score,
            error,

            cir:
                sourceRow.CIR || "",

            cirDate:
                sourceRow["CIR Date"] || "",

            sourceRow

        };

    }


    /* =====================================================
       MATERIAL ERROR
    ===================================================== */

    function isMaterialError(row) {

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

        if (!state.rows.length) {

            throw new Error(
                "Worksheet tidak memiliki data."
            );

        }

        const columnCheck =
            validateColumns(
                state.rows
            );

        if (!columnCheck.valid) {

            throw new Error(
                columnCheck.error
            );

        }

        /*
         * Normalize.
         */

        const normalizedRows =
            state.rows.map(
                function (row) {

                    return normalizeInputRow(
                        row,
                        columnCheck.columns
                    );

                }
            );

        /*
         * =================================================
         * CIR LOCK
         * =================================================
         */

        const cirRows =
            processCIRRows(
                normalizedRows
            );

        /*
         * Tanggal CIR WAJIB.
         *
         * Jika tanggal pertama di bawah CIR
         * tidak ditemukan, row tetap diteruskan
         * tetapi validator akan menerima CIR Date
         * kosong + error.
         */

        cirRows.forEach(
            function (row) {

                if (
                    !row["CIR Date"] &&
                    state.cirDateRequired
                ) {

                    row.cirDateRequired =
                        true;

                    row.cirLockedError =
                        row.cirDateError ||
                        "Tanggal CIR wajib diisi.";

                }

            }
        );

        /*
         * =================================================
         * VALIDATOR
         * =================================================
         */

        const results =
            runValidator(
                cirRows
            );

        state.results =
            Array.isArray(results)
                ? results
                : [];

        /*
         * Pastikan hasil validator membawa
         * CIR Date yang sudah dikunci.
         */

        state.results =
            state.results.map(
                function (
                    result,
                    index
                ) {

                    const ticket =
                        getResultTicket(
                            result
                        );

                    const cirDate =
                        state.cirDateMap.get(
                            String(
                                ticket
                            ).trim()
                        ) || "";

                    const cirError =
                        state.cirParsedRows[
                            index
                        ]
                            ? state.cirParsedRows[
                                index
                            ].error
                            : "";

                    return {

                        ...result,

                        "CIR Date":
                            cirDate ||
                            result["CIR Date"] ||
                            result.cirDate ||
                            "",

                        cirDate:
                            cirDate ||
                            result.cirDate ||
                            "",

                        cirLocked:
                            true,

                        cirDateError:
                            cirError ||
                            result.cirDateError ||
                            ""

                    };

                }
            );

        /*
         * =================================================
         * MATERIAL
         * =================================================
         */

        const materialRows = [];
        const materialErrorRows = [];

        cirRows.forEach(
            function (row) {

                const parsed =
                    parseMaterial(
                        row
                    );

                if (
                    !Array.isArray(parsed) ||
                    !parsed.length
                ) {

                    /*
                     * Jangan otomatis dianggap
                     * material error.
                     *
                     * CIR tanpa material bisa saja
                     * merupakan valid condition.
                     */

                    return;

                }

                parsed.forEach(
                    function (material) {

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

                        }
                        else {

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

        /*
         * =================================================
         * COMBINED
         * =================================================
         */

        state.combinedRows =
            buildCombinedRows(
                cirRows,
                state.results,
                materialRows
            );

        state.processed =
            true;

        return state.results;

    }


    /* =====================================================
       RESULT TICKET
    ===================================================== */

    function getResultTicket(result) {

        if (!result) {
            return "";
        }

        return (
            result.ticket ||
            result.Ticket ||
            result["TT Number"] ||
            result.ttNumber ||
            result.tt_number ||
            ""
        );

    }


    /* =====================================================
       COMBINED
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

        const materialsByTicket =
            new Map();

        materialRows.forEach(
            function (material) {

                const ticket =
                    String(
                        material.ticket || ""
                    ).trim();

                if (!materialsByTicket.has(ticket)) {

                    materialsByTicket.set(
                        ticket,
                        []
                    );

                }

                materialsByTicket
                    .get(ticket)
                    .push(material);

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
                    materialsByTicket.get(
                        ticketKey
                    ) || [];

                const cirDate =
                    source["CIR Date"] ||
                    validation["CIR Date"] ||
                    validation.cirDate ||
                    "";

                const base = {

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

                    "CIR Date":
                        cirDate,

                    "TT Release":
                        validation
                            .releaseDateTime ||
                        validation
                            .releaseDate ||
                        "",

                    "Status":
                        validation.status ||
                        "",

                    "Keterangan":
                        validation.reason ||
                        "",

                    "CIR":
                        source.CIR ||
                        "",

                    "Release Raw":
                        validation.releaseRaw ||
                        ""

                };

                if (matching.length) {

                    matching.forEach(
                        function (
                            material
                        ) {

                            output.push({

                                ...base,

                                "Material":
                                    material.material,

                                "Quantity":
                                    material.quantity,

                                "Satuan":
                                    material.unit,

                                "Kode":
                                    material.code,

                                "Material Score":
                                    material.score

                            });

                        }
                    );

                }
                else {

                    output.push({

                        ...base,

                        "Material": "",
                        "Quantity": "",
                        "Satuan": "",
                        "Kode": "",
                        "Material Score": ""

                    });

                }

            }
        );

        return output;

    }


    /* =====================================================
       SUMMARY
    ===================================================== */

    function calculateSummary(results) {

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


    function getSummary(results) {

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
       DASHBOARD
    ===================================================== */

    function renderDashboard() {

        const ui =
            getUI();

        const summary =
            getSummary(
                state.results
            );

        const valid =
            Number(
                summary.sesuai ??
                summary.valid ??
                0
            );

        const invalid =
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
                valid;
        }

        if (ui.invalidCount) {
            ui.invalidCount.textContent =
                invalid;
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
                valid;
        }

        if (ui.invalidTabCount) {
            ui.invalidTabCount.textContent =
                invalid;
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
                `Total ${total} data • ` +
                `${valid} sesuai • ` +
                `${invalid} tidak sesuai • ` +
                `${state.materialRows.length} material`;

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

    function escapeHTML(value) {

        if (
            value === null ||
            value === undefined
        ) {
            return "";
        }

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    }


    /* =====================================================
       STATUS CLASS
    ===================================================== */

    function statusClass(status) {

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
       FILTER
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
       PAGINATION
    ===================================================== */

    function paginate(rows, page) {

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
       PAGINATION UI
    ===================================================== */

    function updatePaginationUI(
        type,
        page,
        totalPages
    ) {

        const ui =
            getUI();

        let prev;
        let next;
        let number;
        let total;

        if (type === "valid") {

            prev = ui.validPrevBtn;
            next = ui.validNextBtn;
            number = ui.validPageNumber;
            total = ui.validPageTotal;

        }

        else if (type === "invalid") {

            prev = ui.invalidPrevBtn;
            next = ui.invalidNextBtn;
            number = ui.invalidPageNumber;
            total = ui.invalidPageTotal;

        }

        else if (type === "material") {

            prev = ui.materialPrevBtn;
            next = ui.materialNextBtn;
            number = ui.materialPageNumber;
            total = ui.materialPageTotal;

        }

        else if (type === "materialError") {

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
       RENDER VALID
    ===================================================== */

    function renderValidTable() {

        const ui =
            getUI();

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
                                    ["CIR Date"] ||
                                result.cirDate ||
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
       RENDER INVALID
    ===================================================== */

    function renderInvalidTable() {

        const ui =
            getUI();

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
                                    ["CIR Date"] ||
                                result.cirDate ||
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
       RENDER MATERIAL
    ===================================================== */

    function renderMaterialTable() {

        const ui =
            getUI();

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
       RENDER MATERIAL ERROR
    ===================================================== */

    function renderMaterialErrorTable() {

        const ui =
            getUI();

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

        state.pagination.valid = 1;
        state.pagination.invalid = 1;
        state.pagination.material = 1;
        state.pagination.materialError = 1;

        renderDashboard();

        renderValidTable();
        renderInvalidTable();
        renderMaterialTable();
        renderMaterialErrorTable();

        const ui =
            getUI();

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

            updateProgress(
                10,
                "Membaca file Excel..."
            );

            await readAndPrepareFile(
                state.file
            );

            if (!state.workbook) {
                return;
            }

        }

        setProcessing(
            true,
            "Sedang memproses..."
        );

        updateProgress(
            20,
            "Mempersiapkan data..."
        );

        setSystemStatus(
            "Memproses...",
            "online"
        );

        try {

            if (state.sheetName) {

                loadSheet(
                    state.sheetName
                );

            }

            updateProgress(
                30,
                "Mendeteksi kolom..."
            );

            await delay(20);

            updateProgress(
                40,
                "Mengunci tanggal CIR..."
            );

            await delay(20);

            updateProgress(
                55,
                "Memvalidasi TT Number..."
            );

            const results =
                processData();

            updateProgress(
                75,
                "Memproses material..."
            );

            await delay(20);

            updateProgress(
                90,
                "Menampilkan hasil..."
            );

            renderAll();

            updateProgress(
                100,
                "Selesai memproses data"
            );

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
                    summary.invalid ??
                    0
                );

            setSystemStatus(
                state.cirErrors.length
                    ? "Selesai dengan warning CIR"
                    : "Selesai",
                state.cirErrors.length
                    ? "warning"
                    : "online"
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
                        state.materialErrorRows.length,

                    cirErrors:
                        state.cirErrors,

                    cirLocked:
                        state.cirLocked,

                    cirDateSource:
                        state.cirSource

                }
            );

            setTimeout(
                function () {

                    setProcessing(
                        false
                    );

                },
                500
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


    function delay(ms) {

        return new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    ms
                )
        );

    }


    /* =====================================================
       EXPORT
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

        const output =
            getValidResults()
                .map(
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

                            "CIR Date":
                                result
                                    ["CIR Date"] ||
                                result.cirDate ||
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

        const output =
            getInvalidResults()
                .map(
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

                            "CIR Date":
                                result
                                    ["CIR Date"] ||
                                result.cirDate ||
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

                        "CIR Date":
                            row.cirDate,

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

                        "CIR Date":
                            row.cirDate,

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

    function makeFilename(suffix) {

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

        state.workbook = null;
        state.worksheet = null;

        state.rows = [];
        state.results = [];

        state.materialRows = [];
        state.materialErrorRows = [];
        state.combinedRows = [];

        state.headers = [];

        state.file = null;
        state.fileName = "";
        state.fileSize = 0;

        state.sheetName = "";
        state.sheetNames = [];

        state.processed = false;

        state.cirErrors = [];
        state.cirWarnings = [];
        state.cirParsedRows = [];
        state.cirDateMap = new Map();

        state.pagination.valid = 1;
        state.pagination.invalid = 1;
        state.pagination.material = 1;
        state.pagination.materialError = 1;

        const ui =
            getUI();

        if (ui.fileInput) {
            ui.fileInput.value = "";
        }

        hideSelectedFile();

        if (ui.dashboardSection) {

            ui.dashboardSection.classList.add(
                "hidden"
            );

        }

        if (ui.validTableBody) {
            ui.validTableBody.innerHTML = "";
        }

        if (ui.invalidTableBody) {
            ui.invalidTableBody.innerHTML = "";
        }

        if (ui.materialTableBody) {
            ui.materialTableBody.innerHTML = "";
        }

        if (ui.materialErrorTableBody) {
            ui.materialErrorTableBody.innerHTML = "";
        }

        const sheetSelect =
            byId("sheetSelect");

        if (sheetSelect) {

            sheetSelect.innerHTML = "";

            sheetSelect.disabled =
                true;

        }

        setProcessing(false);

        updateProgress(
            0,
            ""
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

            state.pagination[type] = 1;

        }

        if (type === "valid") {
            renderValidTable();
        }

        else if (type === "invalid") {
            renderInvalidTable();
        }

        else if (type === "material") {
            renderMaterialTable();
        }

        else if (
            type === "materialError"
        ) {
            renderMaterialErrorTable();
        }

    }


    /* =====================================================
       TABS
    ===================================================== */

    function setupTabs() {

        const buttons =
            $$(".tab-button");

        const contents =
            $$(".tab-content");

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
       DROP ZONE
    ===================================================== */

    function setupDropZone() {

        const ui =
            getUI();

        if (!ui.dropZone) {

            console.error(
                "#dropZone tidak ditemukan."
            );

            return;

        }

        ui.dropZone.addEventListener(
            "click",
            function (event) {

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

        ui.dropZone.addEventListener(
            "dragleave",
            function (event) {

                event.preventDefault();
                event.stopPropagation();

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

                handleFile(
                    files[0]
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
                    handleFile(file);
                }

            }
        );

    }


    /* =====================================================
       BUTTONS
    ===================================================== */

    function setupButtons() {

        const ui =
            getUI();

        if (ui.processBtn) {

            ui.processBtn.addEventListener(
                "click",
                runProcess
            );

        }

        if (ui.removeFileBtn) {

            ui.removeFileBtn.addEventListener(
                "click",
                resetApp
            );

        }

        if (ui.resetBtn) {

            ui.resetBtn.addEventListener(
                "click",
                resetApp
            );

        }

        if (ui.downloadValidBtn) {

            ui.downloadValidBtn.addEventListener(
                "click",
                exportValid
            );

        }

        if (ui.downloadInvalidBtn) {

            ui.downloadInvalidBtn.addEventListener(
                "click",
                exportInvalid
            );

        }

        if (ui.downloadMaterialBtn) {

            ui.downloadMaterialBtn.addEventListener(
                "click",
                exportMaterial
            );

        }

        if (ui.downloadMaterialErrorBtn) {

            ui.downloadMaterialErrorBtn.addEventListener(
                "click",
                exportMaterialError
            );

        }

    }


    /* =====================================================
       PAGINATION BUTTONS
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
       GLOBAL DRAG PROTECTION
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
                 * Jangan stopPropagation di sini.
                 * Handler dropZone harus tetap menerima drop.
                 */

                event.preventDefault();

            }
        );

    }


    /* =====================================================
       INIT
    ===================================================== */

    function init() {

        if (state.initialized) {
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

        updateProgress(
            0,
            ""
        );

        console.log(
            "ReportChecker app.js loaded."
        );

        console.log(
            "CIR LOCK:",
            state.cirLocked
        );

        console.log(
            "CIR DATE SOURCE:",
            state.cirSource
        );

    }


    /* =====================================================
       PUBLIC API
    ===================================================== */

    window.ReportCheckerApp = {

        state: state,

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

        render:
            renderAll,

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

        parseCIR:
            parseCIR,

        getFirstDateBelowCIR:
            getFirstDateBelowCIR,

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
