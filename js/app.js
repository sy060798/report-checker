/* =========================================================
   REPORT CHECKER
   APP.JS
   TAHAP 1
   ---------------------------------------------------------
   Fungsi:
   - Inisialisasi aplikasi
   - Upload Excel
   - Drag & Drop
   - Pilih file
   - Hapus file
   - Status file
   - Tombol proses
   - Reset aplikasi
========================================================= */

(function () {

    "use strict";


    /* =====================================================
       APPLICATION STATE
    ===================================================== */

    const AppState = {

        selectedFile: null,

        workbook: null,

        rawRows: [],

        processed: false,

        processing: false,

        results: {

            valid: [],

            invalid: [],

            material: [],

            materialError: []

        },

        pagination: {

            valid: 1,

            invalid: 1,

            material: 1,

            materialError: 1

        }

    };


    /* =====================================================
       DOM ELEMENTS
    ===================================================== */

    const DOM = {};


    function cacheDom() {

        DOM.systemStatus =
            document.getElementById("systemStatus");

        DOM.dropZone =
            document.getElementById("dropZone");

        DOM.excelFile =
            document.getElementById("excelFile");

        DOM.selectedFile =
            document.getElementById("selectedFile");

        DOM.fileName =
            document.getElementById("fileName");

        DOM.fileSize =
            document.getElementById("fileSize");

        DOM.removeFileBtn =
            document.getElementById("removeFileBtn");

        DOM.processBtn =
            document.getElementById("processBtn");

        DOM.processingStatus =
            document.getElementById("processingStatus");

        DOM.processingText =
            document.getElementById("processingText");

        DOM.dashboardSection =
            document.getElementById("dashboardSection");

        DOM.resetBtn =
            document.getElementById("resetBtn");

        DOM.settingsPanel =
            document.getElementById("settingsPanel");

        DOM.toggleSettingsBtn =
            document.getElementById("toggleSettingsBtn");

        DOM.saveSettingsBtn =
            document.getElementById("saveSettingsBtn");

        DOM.resetSettingsBtn =
            document.getElementById("resetSettingsBtn");

        DOM.settingsSavedMessage =
            document.getElementById("settingsSavedMessage");

    }


    /* =====================================================
       UTILITY
    ===================================================== */

    function formatFileSize(bytes) {

        if (!Number.isFinite(bytes) || bytes <= 0) {
            return "0 KB";
        }

        const units = [
            "Bytes",
            "KB",
            "MB",
            "GB"
        ];

        const index =
            Math.floor(
                Math.log(bytes) /
                Math.log(1024)
            );

        const safeIndex =
            Math.min(index, units.length - 1);

        const size =
            bytes /
            Math.pow(1024, safeIndex);

        return (
            size.toFixed(
                safeIndex === 0 ? 0 : 2
            ) +
            " " +
            units[safeIndex]
        );

    }


    function setSystemStatus(
        text,
        type = "offline"
    ) {

        if (!DOM.systemStatus) {
            return;
        }

        DOM.systemStatus.textContent = text;

        DOM.systemStatus.className =
            "status-badge " + type;

    }


    function setProcessing(
        active,
        message = "Membaca data Excel..."
    ) {

        AppState.processing = active;

        if (DOM.processingStatus) {

            DOM.processingStatus.classList.toggle(
                "hidden",
                !active
            );

        }

        if (DOM.processingText) {

            DOM.processingText.textContent =
                message;

        }

        if (DOM.processBtn) {

            DOM.processBtn.disabled =
                active ||
                !AppState.selectedFile;

        }

        if (DOM.removeFileBtn) {

            DOM.removeFileBtn.disabled =
                active;

        }

    }


    function resetPagination() {

        AppState.pagination = {

            valid: 1,

            invalid: 1,

            material: 1,

            materialError: 1

        };

    }


    function resetResults() {

        AppState.workbook = null;

        AppState.rawRows = [];

        AppState.processed = false;

        AppState.results = {

            valid: [],

            invalid: [],

            material: [],

            materialError: []

        };

        resetPagination();

    }


    /* =====================================================
       FILE VALIDATION
    ===================================================== */

    function isExcelFile(file) {

        if (!file) {
            return false;
        }

        const fileName =
            String(file.name || "")
                .toLowerCase();

        return (
            fileName.endsWith(".xlsx") ||
            fileName.endsWith(".xls") ||
            fileName.endsWith(".xlsm")
        );

    }


    function validateFile(file) {

        if (!file) {

            throw new Error(
                "File Excel tidak ditemukan."
            );

        }

        if (!isExcelFile(file)) {

            throw new Error(
                "Format file tidak didukung. " +
                "Gunakan .xlsx, .xls, atau .xlsm."
            );

        }

        return true;

    }


    /* =====================================================
       SELECT FILE
    ===================================================== */

    function selectFile(file) {

        try {

            validateFile(file);

        } catch (error) {

            showError(error.message);

            return;

        }

        AppState.selectedFile = file;

        resetResults();

        updateSelectedFile();

        setSystemStatus(
            "File siap",
            "online"
        );

    }


    function updateSelectedFile() {

        if (!DOM.selectedFile) {
            return;
        }

        if (!AppState.selectedFile) {

            DOM.selectedFile.classList.add(
                "hidden"
            );

            if (DOM.fileName) {
                DOM.fileName.textContent = "-";
            }

            if (DOM.fileSize) {
                DOM.fileSize.textContent = "-";
            }

            if (DOM.processBtn) {
                DOM.processBtn.disabled = true;
            }

            return;

        }

        DOM.selectedFile.classList.remove(
            "hidden"
        );

        if (DOM.fileName) {

            DOM.fileName.textContent =
                AppState.selectedFile.name;

        }

        if (DOM.fileSize) {

            DOM.fileSize.textContent =
                formatFileSize(
                    AppState.selectedFile.size
                );

        }

        if (DOM.processBtn) {

            DOM.processBtn.disabled = false;

        }

    }


    /* =====================================================
       REMOVE FILE
    ===================================================== */

    function removeFile() {

        if (AppState.processing) {
            return;
        }

        AppState.selectedFile = null;

        resetResults();

        if (DOM.excelFile) {

            DOM.excelFile.value = "";

        }

        updateSelectedFile();

        hideDashboard();

        setSystemStatus(
            "Ready",
            "offline"
        );

    }


    /* =====================================================
       DRAG & DROP
    ===================================================== */

    function preventDefaults(event) {

        event.preventDefault();

        event.stopPropagation();

    }


    function handleDragEnter(event) {

        preventDefaults(event);

        if (!DOM.dropZone) {
            return;
        }

        DOM.dropZone.classList.add(
            "dragover"
        );

    }


    function handleDragLeave(event) {

        preventDefaults(event);

        if (!DOM.dropZone) {
            return;
        }

        DOM.dropZone.classList.remove(
            "dragover"
        );

    }


    function handleDrop(event) {

        preventDefaults(event);

        if (!DOM.dropZone) {
            return;
        }

        DOM.dropZone.classList.remove(
            "dragover"
        );

        if (
            !event.dataTransfer ||
            !event.dataTransfer.files ||
            !event.dataTransfer.files.length
        ) {
            return;
        }

        const file =
            event.dataTransfer.files[0];

        selectFile(file);

    }


    /* =====================================================
       FILE INPUT
    ===================================================== */

    function handleFileInput(event) {

        const files =
            event.target &&
            event.target.files;

        if (!files || !files.length) {
            return;
        }

        selectFile(files[0]);

    }


    function openFilePicker() {

        if (AppState.processing) {
            return;
        }

        if (!DOM.excelFile) {
            return;
        }

        DOM.excelFile.click();

    }


    /* =====================================================
       KEYBOARD SUPPORT
    ===================================================== */

    function handleDropZoneKeydown(event) {

        if (!DOM.dropZone) {
            return;
        }

        if (
            event.key === "Enter" ||
            event.key === " "
        ) {

            event.preventDefault();

            openFilePicker();

        }

    }


    /* =====================================================
       DASHBOARD
    ===================================================== */

    function showDashboard() {

        if (!DOM.dashboardSection) {
            return;
        }

        DOM.dashboardSection.classList.remove(
            "hidden"
        );

    }


    function hideDashboard() {

        if (!DOM.dashboardSection) {
            return;
        }

        DOM.dashboardSection.classList.add(
            "hidden"
        );

    }


    /* =====================================================
       ERROR HANDLER
    ===================================================== */

    function showError(message) {

        const text =
            message ||
            "Terjadi kesalahan.";

        console.error(
            "ReportChecker:",
            text
        );

        setSystemStatus(
            "Error",
            "offline"
        );

        if (DOM.processingStatus) {

            DOM.processingStatus.classList.remove(
                "hidden"
            );

        }

        if (DOM.processingText) {

            DOM.processingText.textContent =
                text;

        }

    }


    /* =====================================================
       LOAD EXCEL
       -----------------------------------------------------
       Bagian ini hanya membaca workbook.
       Parsing detail dilanjutkan pada TAHAP 2.
    ===================================================== */

    async function readExcelFile(file) {

        if (typeof XLSX === "undefined") {

            throw new Error(
                "Library SheetJS belum tersedia. " +
                "Pastikan xlsx.full.min.js berhasil dimuat."
            );

        }

        validateFile(file);

        const arrayBuffer =
            await file.arrayBuffer();

        if (!arrayBuffer || !arrayBuffer.byteLength) {

            throw new Error(
                "File Excel kosong atau tidak dapat dibaca."
            );

        }

        const workbook =
            XLSX.read(
                arrayBuffer,
                {
                    type: "array",
                    cellDates: true,
                    cellNF: true,
                    cellText: true
                }
            );

        if (
            !workbook ||
            !workbook.SheetNames ||
            !workbook.SheetNames.length
        ) {

            throw new Error(
                "Workbook Excel tidak memiliki sheet."
            );

        }

        AppState.workbook = workbook;

        return workbook;

    }


    /* =====================================================
       CONVERT SHEET TO JSON
    ===================================================== */

    function sheetToRows(sheet) {

        if (!sheet) {
            return [];
        }

        return XLSX.utils.sheet_to_json(
            sheet,
            {
                header: 1,
                defval: "",
                raw: false,
                blankrows: false
            }
        );

    }


    /* =====================================================
       BASIC EXCEL PROCESS
       -----------------------------------------------------
       Untuk sementara membaca sheet pertama.
       Parser/validator/export akan dilanjutkan di tahap 2.
    ===================================================== */

    async function processExcel() {

        if (AppState.processing) {
            return;
        }

        if (!AppState.selectedFile) {

            showError(
                "Silakan pilih file Excel terlebih dahulu."
            );

            return;

        }

        setProcessing(
            true,
            "Membaca data Excel..."
        );

        setSystemStatus(
            "Processing",
            "online"
        );

        hideDashboard();

        try {

            const workbook =
                await readExcelFile(
                    AppState.selectedFile
                );

            setProcessing(
                true,
                "Membaca sheet Excel..."
            );

            const firstSheetName =
                workbook.SheetNames[0];

            const firstSheet =
                workbook.Sheets[firstSheetName];

            const rows =
                sheetToRows(firstSheet);

            AppState.rawRows = rows;

            if (!rows.length) {

                throw new Error(
                    "Sheet Excel tidak memiliki data."
                );

            }

            console.log(
                "ReportChecker Excel loaded:",
                {
                    file:
                        AppState.selectedFile.name,

                    sheet:
                        firstSheetName,

                    rows:
                        rows.length,

                    sheets:
                        workbook.SheetNames
                }
            );

            setProcessing(
                false
            );

            AppState.processed = true;

            setSystemStatus(
                "Excel terbaca",
                "online"
            );

            /*
             * TAHAP 2 akan melanjutkan:
             *
             * - parsing Ticket
             * - parsing TT Release
             * - validasi tanggal
             * - parsing Material
             * - Material Error
             * - render tabel
             * - pagination
             * - download Excel
             */

            showDashboard();

            updateBasicDashboard();

        } catch (error) {

            console.error(
                "Gagal memproses Excel:",
                error
            );

            setProcessing(
                false
            );

            showError(
                error &&
                error.message
                    ? error.message
                    : "Gagal membaca file Excel."
            );

        }

    }


    /* =====================================================
       BASIC DASHBOARD UPDATE
    ===================================================== */

    function updateBasicDashboard() {

        const totalCount =
            document.getElementById(
                "totalCount"
            );

        const validCount =
            document.getElementById(
                "validCount"
            );

        const invalidCount =
            document.getElementById(
                "invalidCount"
            );

        const materialCount =
            document.getElementById(
                "materialCount"
            );

        const materialErrorCount =
            document.getElementById(
                "materialErrorCount"
            );

        const validTabCount =
            document.getElementById(
                "validTabCount"
            );

        const invalidTabCount =
            document.getElementById(
                "invalidTabCount"
            );

        const materialTabCount =
            document.getElementById(
                "materialTabCount"
            );

        const materialErrorTabCount =
            document.getElementById(
                "materialErrorTabCount"
            );

        /*
         * Jangan menganggap semua row sebagai
         * hasil validasi final.
         *
         * Tahap 2 akan mengganti angka ini
         * berdasarkan hasil parser.
         */

        const total =
            Math.max(
                0,
                AppState.rawRows.length - 1
            );

        if (totalCount) {
            totalCount.textContent = total;
        }

        if (validCount) {
            validCount.textContent =
                AppState.results.valid.length;
        }

        if (invalidCount) {
            invalidCount.textContent =
                AppState.results.invalid.length;
        }

        if (materialCount) {
            materialCount.textContent =
                AppState.results.material.length;
        }

        if (materialErrorCount) {
            materialErrorCount.textContent =
                AppState.results.materialError.length;
        }

        if (validTabCount) {
            validTabCount.textContent =
                AppState.results.valid.length;
        }

        if (invalidTabCount) {
            invalidTabCount.textContent =
                AppState.results.invalid.length;
        }

        if (materialTabCount) {
            materialTabCount.textContent =
                AppState.results.material.length;
        }

        if (materialErrorTabCount) {
            materialErrorTabCount.textContent =
                AppState.results.materialError.length;
        }

    }


    /* =====================================================
       RESET APPLICATION
    ===================================================== */

    function resetApplication() {

        if (AppState.processing) {
            return;
        }

        AppState.selectedFile = null;

        resetResults();

        if (DOM.excelFile) {

            DOM.excelFile.value = "";

        }

        updateSelectedFile();

        hideDashboard();

        setProcessing(
            false
        );

        setSystemStatus(
            "Ready",
            "offline"
        );

        if (DOM.processingText) {

            DOM.processingText.textContent =
                "Membaca data Excel...";

        }

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    }


    /* =====================================================
       SETTINGS TOGGLE
    ===================================================== */

    function toggleSettings() {

        if (!DOM.settingsPanel) {
            return;
        }

        const isHidden =
            DOM.settingsPanel.classList.contains(
                "hidden"
            );

        DOM.settingsPanel.classList.toggle(
            "hidden",
            !isHidden
        );

        if (DOM.toggleSettingsBtn) {

            DOM.toggleSettingsBtn.textContent =
                isHidden
                    ? "Tutup Pengaturan"
                    : "Buka Pengaturan";

        }

    }


    /* =====================================================
       SETTINGS
       -----------------------------------------------------
       Jika settings.js menyediakan fungsi sendiri,
       bagian ini tidak mengambil alih.
    ===================================================== */

    function saveSettings() {

        if (
            typeof window.ReportCheckerSettings !==
            "undefined"
        ) {

            if (
                typeof window.ReportCheckerSettings.save ===
                "function"
            ) {

                try {

                    window.ReportCheckerSettings.save();

                    showSettingsSaved();

                    return;

                } catch (error) {

                    console.error(
                        "Settings save error:",
                        error
                    );

                }

            }

        }

        /*
         * Fallback sederhana.
         */

        const settings = {

            materialStartPhrases:
                getInputValue(
                    "materialStartPhrases"
                ),

            materialEndPhrases:
                getInputValue(
                    "materialEndPhrases"
                ),

            releasePhrases:
                getInputValue(
                    "releasePhrases"
                ),

            notFoundPhrases:
                getInputValue(
                    "notFoundPhrases"
                ),

            validationType:
                getInputValue(
                    "validationType"
                ),

            maxReleaseMinutes:
                getInputValue(
                    "maxReleaseMinutes"
                )

        };

        try {

            localStorage.setItem(
                "reportCheckerSettings",
                JSON.stringify(settings)
            );

            showSettingsSaved();

        } catch (error) {

            console.error(
                "Tidak dapat menyimpan settings:",
                error
            );

        }

    }


    function getInputValue(id) {

        const element =
            document.getElementById(id);

        return element
            ? element.value
            : "";

    }


    function showSettingsSaved() {

        if (!DOM.settingsSavedMessage) {
            return;
        }

        DOM.settingsSavedMessage.classList.remove(
            "hidden"
        );

        window.clearTimeout(
            showSettingsSaved.timer
        );

        showSettingsSaved.timer =
            window.setTimeout(
                function () {

                    DOM.settingsSavedMessage.classList.add(
                        "hidden"
                    );

                },
                2500
            );

    }


    function resetSettings() {

        if (
            typeof window.ReportCheckerSettings !==
            "undefined"
        ) {

            if (
                typeof window.ReportCheckerSettings.reset ===
                "function"
            ) {

                try {

                    window.ReportCheckerSettings.reset();

                    return;

                } catch (error) {

                    console.error(
                        "Settings reset error:",
                        error
                    );

                }

            }

        }

        try {

            localStorage.removeItem(
                "reportCheckerSettings"
            );

        } catch (error) {

            console.error(
                "Settings reset error:",
                error
            );

        }

        window.location.reload();

    }


    /* =====================================================
       EVENT BINDING
    ===================================================== */

    function bindEvents() {

        /*
         * Drop Zone
         */

        if (DOM.dropZone) {

            DOM.dropZone.addEventListener(
                "click",
                openFilePicker
            );

            DOM.dropZone.addEventListener(
                "keydown",
                handleDropZoneKeydown
            );

            DOM.dropZone.addEventListener(
                "dragenter",
                handleDragEnter
            );

            DOM.dropZone.addEventListener(
                "dragover",
                handleDragEnter
            );

            DOM.dropZone.addEventListener(
                "dragleave",
                handleDragLeave
            );

            DOM.dropZone.addEventListener(
                "drop",
                handleDrop
            );

        }


        /*
         * File Input
         */

        if (DOM.excelFile) {

            DOM.excelFile.addEventListener(
                "change",
                handleFileInput
            );

        }


        /*
         * Remove File
         */

        if (DOM.removeFileBtn) {

            DOM.removeFileBtn.addEventListener(
                "click",
                removeFile
            );

        }


        /*
         * Process Excel
         */

        if (DOM.processBtn) {

            DOM.processBtn.addEventListener(
                "click",
                processExcel
            );

        }


        /*
         * Reset
         */

        if (DOM.resetBtn) {

            DOM.resetBtn.addEventListener(
                "click",
                resetApplication
            );

        }


        /*
         * Settings
         */

        if (DOM.toggleSettingsBtn) {

            DOM.toggleSettingsBtn.addEventListener(
                "click",
                toggleSettings
            );

        }

        if (DOM.saveSettingsBtn) {

            DOM.saveSettingsBtn.addEventListener(
                "click",
                saveSettings
            );

        }

        if (DOM.resetSettingsBtn) {

            DOM.resetSettingsBtn.addEventListener(
                "click",
                resetSettings
            );

        }

    }


    /* =====================================================
       INITIALIZATION
    ===================================================== */

    function init() {

        cacheDom();

        bindEvents();

        setProcessing(
            false
        );

        updateSelectedFile();

        setSystemStatus(
            "Ready",
            "offline"
        );

        console.log(
            "ReportChecker App tahap 1 loaded."
        );

    }


    /* =====================================================
       PUBLIC API
       -----------------------------------------------------
       Dipasang ke window supaya tahap 2 bisa
       melanjutkan fungsi tanpa membuat listener
       upload baru.
    ===================================================== */

    window.ReportCheckerApp = {

        state: AppState,

        dom: DOM,

        selectFile: selectFile,

        removeFile: removeFile,

        processExcel: processExcel,

        reset: resetApplication,

        readExcelFile: readExcelFile,

        updateDashboard: updateBasicDashboard

    };


    /* =====================================================
       START
    ===================================================== */

    if (
        document.readyState === "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            init
        );

    } else {

        init();

    }


})();


/* =========================================================
   REPORT CHECKER
   app.js - TAHAP 2
   Dashboard, Pagination, Tabs, Export & Reset
========================================================= */

(function () {
    "use strict";

    /* =====================================================
       STATE
    ====================================================== */

    const state = {
        currentTab: "valid",

        pageSize: 50,

        pages: {
            valid: 1,
            invalid: 1,
            material: 1,
            materialError: 1
        },

        data: {
            valid: [],
            invalid: [],
            material: [],
            materialError: []
        },

        originalRows: [],
        processed: false
    };


    /* =====================================================
       DOM HELPER
    ====================================================== */

    function $(id) {
        return document.getElementById(id);
    }


    function safeArray(value) {
        return Array.isArray(value) ? value : [];
    }


    function escapeHtml(value) {
        if (value === null || value === undefined) {
            return "";
        }

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    function formatValue(value) {
        if (value === null || value === undefined) {
            return "-";
        }

        if (value instanceof Date) {
            return value.toLocaleString("id-ID");
        }

        return String(value);
    }


    /* =====================================================
       STATUS
    ====================================================== */

    function setSystemStatus(text, type) {
        const el = $("systemStatus");

        if (!el) {
            return;
        }

        el.textContent = text;

        el.classList.remove(
            "offline",
            "online",
            "error",
            "processing"
        );

        if (type) {
            el.classList.add(type);
        }
    }


    function setProcessing(show, text) {
        const status = $("processingStatus");
        const processingText = $("processingText");

        if (!status) {
            return;
        }

        if (show) {
            status.classList.remove("hidden");

            if (processingText && text) {
                processingText.textContent = text;
            }
        } else {
            status.classList.add("hidden");
        }
    }


    /* =====================================================
       FILE INFORMATION
    ====================================================== */

    function showSelectedFile(file) {
        const selectedFile = $("selectedFile");
        const fileName = $("fileName");
        const fileSize = $("fileSize");

        if (!selectedFile || !fileName || !fileSize) {
            return;
        }

        fileName.textContent = file.name;

        fileSize.textContent = formatFileSize(file.size);

        selectedFile.classList.remove("hidden");
    }


    function hideSelectedFile() {
        const selectedFile = $("selectedFile");
        const fileName = $("fileName");
        const fileSize = $("fileSize");

        if (selectedFile) {
            selectedFile.classList.add("hidden");
        }

        if (fileName) {
            fileName.textContent = "-";
        }

        if (fileSize) {
            fileSize.textContent = "-";
        }
    }


    function formatFileSize(bytes) {
        if (!Number.isFinite(bytes) || bytes <= 0) {
            return "0 KB";
        }

        if (bytes < 1024 * 1024) {
            return `${Math.round(bytes / 1024)} KB`;
        }

        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }


    /* =====================================================
       TABLE PAGINATION
    ====================================================== */

    function getPageItems(items, page) {
        const list = safeArray(items);

        const start =
            (page - 1) * state.pageSize;

        const end =
            start + state.pageSize;

        return list.slice(start, end);
    }


    function getTotalPages(items) {
        const list = safeArray(items);

        if (list.length === 0) {
            return 1;
        }

        return Math.max(
            1,
            Math.ceil(list.length / state.pageSize)
        );
    }


    function updatePagination(type) {
        const items = safeArray(state.data[type]);

        const totalPages =
            getTotalPages(items);

        let currentPage =
            Number(state.pages[type]) || 1;

        if (currentPage > totalPages) {
            currentPage = totalPages;
        }

        if (currentPage < 1) {
            currentPage = 1;
        }

        state.pages[type] = currentPage;

        const pageNumber =
            $(`${type}PageNumber`);

        const pageTotal =
            $(`${type}PageTotal`);

        const prevBtn =
            $(`${type}PrevBtn`);

        const nextBtn =
            $(`${type}NextBtn`);

        if (pageNumber) {
            pageNumber.textContent = currentPage;
        }

        if (pageTotal) {
            pageTotal.textContent = totalPages;
        }

        if (prevBtn) {
            prevBtn.disabled =
                currentPage <= 1 ||
                items.length === 0;
        }

        if (nextBtn) {
            nextBtn.disabled =
                currentPage >= totalPages ||
                items.length === 0;
        }
    }


    function goToPage(type, direction) {
        const totalPages =
            getTotalPages(state.data[type]);

        let page =
            Number(state.pages[type]) || 1;

        page += direction;

        page = Math.max(
            1,
            Math.min(page, totalPages)
        );

        state.pages[type] = page;

        renderTable(type);
    }


    /* =====================================================
       NORMALIZE RESULT
    ====================================================== */

    function normalizeResultItem(item) {
        if (!item || typeof item !== "object") {
            return {
                ticket: "",
                datetimeReceive: "",
                ttRelease: "",
                status: "",
                keterangan: ""
            };
        }

        return {
            ticket:
                item.ticket ??
                item.Ticket ??
                item["Ticket"] ??
                "",

            datetimeReceive:
                item.datetimeReceive ??
                item.datetime_receive ??
                item.receive ??
                item["Datetime Receive"] ??
                "",

            ttRelease:
                item.ttRelease ??
                item.tt_release ??
                item.release ??
                item["TT Release"] ??
                "",

            status:
                item.status ??
                item.Status ??
                "",

            keterangan:
                item.keterangan ??
                item.keteranganValidasi ??
                item.message ??
                item.error ??
                item["Keterangan"] ??
                ""
        };
    }


    function normalizeMaterialItem(item) {
        if (!item || typeof item !== "object") {
            return {
                ticket: "",
                material: "",
                qty: "",
                satuan: "",
                kode: "",
                error: ""
            };
        }

        return {
            ticket:
                item.ticket ??
                item.Ticket ??
                "",

            material:
                item.material ??
                item.Material ??
                item.namaMaterial ??
                "",

            qty:
                item.qty ??
                item.Qty ??
                item.quantity ??
                "",

            satuan:
                item.satuan ??
                item.Satuan ??
                item.unit ??
                "",

            kode:
                item.kode ??
                item.Kode ??
                item.code ??
                "",

            error:
                item.error ??
                item.Error ??
                item.message ??
                ""
        };
    }


    /* =====================================================
       RENDER VALID / INVALID
    ====================================================== */

    function renderValidationTable(type) {
        const body =
            $(`${type}TableBody`);

        const empty =
            $(`${type}Empty`);

        if (!body) {
            return;
        }

        const items =
            safeArray(state.data[type]);

        const pageItems =
            getPageItems(
                items,
                state.pages[type]
            );

        body.innerHTML = "";

        if (items.length === 0) {
            if (empty) {
                empty.classList.remove("hidden");
            }

            updatePagination(type);
            return;
        }

        if (empty) {
            empty.classList.add("hidden");
        }

        pageItems.forEach((rawItem) => {
            const item =
                normalizeResultItem(rawItem);

            const row =
                document.createElement("tr");

            let statusClass = "info";

            const statusText =
                String(item.status || "").toLowerCase();

            if (
                statusText.includes("valid") ||
                statusText.includes("sesuai") ||
                statusText.includes("ok")
            ) {
                statusClass = "success";
            }

            if (
                statusText.includes("invalid") ||
                statusText.includes("tidak") ||
                statusText.includes("error")
            ) {
                statusClass = "danger";
            }

            row.innerHTML = `
                <td class="ticket-cell">
                    ${escapeHtml(formatValue(item.ticket))}
                </td>

                <td>
                    ${escapeHtml(formatValue(item.datetimeReceive))}
                </td>

                <td>
                    ${escapeHtml(formatValue(item.ttRelease))}
                </td>

                <td>
                    <span class="status-label ${statusClass}">
                        ${escapeHtml(formatValue(item.status))}
                    </span>
                </td>

                <td>
                    ${escapeHtml(formatValue(item.keterangan))}
                </td>
            `;

            body.appendChild(row);
        });

        updatePagination(type);
    }


    /* =====================================================
       RENDER MATERIAL
    ====================================================== */

    function renderMaterialTable(type) {
        const body =
            $(`${type}TableBody`);

        const empty =
            $(`${type}Empty`);

        if (!body) {
            return;
        }

        const items =
            safeArray(state.data[type]);

        const pageItems =
            getPageItems(
                items,
                state.pages[type]
            );

        body.innerHTML = "";

        if (items.length === 0) {
            if (empty) {
                empty.classList.remove("hidden");
            }

            updatePagination(type);
            return;
        }

        if (empty) {
            empty.classList.add("hidden");
        }

        pageItems.forEach((rawItem) => {
            const item =
                normalizeMaterialItem(rawItem);

            const row =
                document.createElement("tr");

            if (type === "materialError") {
                row.innerHTML = `
                    <td class="ticket-cell">
                        ${escapeHtml(formatValue(item.ticket))}
                    </td>

                    <td class="material-cell">
                        ${escapeHtml(formatValue(item.material))}
                    </td>

                    <td>
                        ${escapeHtml(formatValue(item.qty))}
                    </td>

                    <td>
                        ${escapeHtml(formatValue(item.satuan))}
                    </td>

                    <td>
                        ${escapeHtml(formatValue(item.kode))}
                    </td>

                    <td>
                        <span class="status-label danger">
                            ${escapeHtml(formatValue(item.error))}
                        </span>
                    </td>
                `;
            } else {
                row.innerHTML = `
                    <td class="ticket-cell">
                        ${escapeHtml(formatValue(item.ticket))}
                    </td>

                    <td class="material-cell">
                        ${escapeHtml(formatValue(item.material))}
                    </td>

                    <td>
                        ${escapeHtml(formatValue(item.qty))}
                    </td>

                    <td>
                        ${escapeHtml(formatValue(item.satuan))}
                    </td>

                    <td>
                        ${escapeHtml(formatValue(item.kode))}
                    </td>
                `;
            }

            body.appendChild(row);
        });

        updatePagination(type);
    }


    function renderTable(type) {
        if (
            type === "valid" ||
            type === "invalid"
        ) {
            renderValidationTable(type);
            return;
        }

        if (
            type === "material" ||
            type === "materialError"
        ) {
            renderMaterialTable(type);
        }
    }


    /* =====================================================
       DASHBOARD COUNTS
    ====================================================== */

    function updateDashboardCounts() {
        const valid =
            safeArray(state.data.valid);

        const invalid =
            safeArray(state.data.invalid);

        const material =
            safeArray(state.data.material);

        const materialError =
            safeArray(state.data.materialError);

        const total =
            valid.length + invalid.length;

        const values = {
            totalCount: total,
            validCount: valid.length,
            invalidCount: invalid.length,
            materialCount: material.length,
            materialErrorCount: materialError.length,

            validTabCount: valid.length,
            invalidTabCount: invalid.length,
            materialTabCount: material.length,
            materialErrorTabCount: materialError.length
        };

        Object.keys(values).forEach((id) => {
            const el = $(id);

            if (el) {
                el.textContent =
                    values[id].toLocaleString("id-ID");
            }
        });
    }


    /* =====================================================
       DOWNLOAD BUTTONS
    ====================================================== */

    function updateDownloadButtons() {
        const mapping = {
            downloadValidBtn: "valid",
            downloadInvalidBtn: "invalid",
            downloadMaterialBtn: "material",
            downloadMaterialErrorBtn: "materialError"
        };

        Object.entries(mapping).forEach(
            ([buttonId, type]) => {
                const button = $(buttonId);

                if (!button) {
                    return;
                }

                button.disabled =
                    safeArray(state.data[type]).length === 0;
            }
        );
    }


    /* =====================================================
       TABS
    ====================================================== */

    function switchTab(tabName) {
        const allowed = [
            "valid",
            "invalid",
            "material",
            "material-error"
        ];

        if (!allowed.includes(tabName)) {
            tabName = "valid";
        }

        state.currentTab = tabName;

        document
            .querySelectorAll(".tab-button")
            .forEach((button) => {
                button.classList.toggle(
                    "active",
                    button.dataset.tab === tabName
                );
            });

        document
            .querySelectorAll(".tab-content")
            .forEach((content) => {
                content.classList.remove("active");
            });

        const target =
            $(`tab-${tabName}`);

        if (target) {
            target.classList.add("active");
        }

        const type =
            tabName === "material-error"
                ? "materialError"
                : tabName;

        renderTable(type);
    }


    /* =====================================================
       RESET PAGINATION
    ====================================================== */

    function resetPagination() {
        state.pages.valid = 1;
        state.pages.invalid = 1;
        state.pages.material = 1;
        state.pages.materialError = 1;
    }


    /* =====================================================
       RESULT SUMMARY
    ====================================================== */

    function updateSummary() {
        const summary =
            $("resultSummary");

        if (!summary) {
            return;
        }

        const total =
            state.data.valid.length +
            state.data.invalid.length;

        const valid =
            state.data.valid.length;

        const invalid =
            state.data.invalid.length;

        summary.textContent =
            `${total.toLocaleString("id-ID")} data diperiksa • ` +
            `${valid.toLocaleString("id-ID")} sesuai • ` +
            `${invalid.toLocaleString("id-ID")} tidak sesuai`;
    }


    /* =====================================================
       RENDER ALL
    ====================================================== */

    function renderAll() {
        resetPagination();

        updateDashboardCounts();

        updateDownloadButtons();

        updateSummary();

        renderTable("valid");
        renderTable("invalid");
        renderTable("material");
        renderTable("materialError");

        switchTab(state.currentTab);

        const dashboard =
            $("dashboardSection");

        if (dashboard) {
            dashboard.classList.remove("hidden");
        }
    }


    /* =====================================================
       EXPORT HELPER
    ====================================================== */

    function exportData(type) {
        const data =
            safeArray(state.data[type]);

        if (data.length === 0) {
            alert("Tidak ada data untuk di-download.");
            return;
        }

        /*
         * Prioritas menggunakan fungsi exporter.js
         * apabila tersedia.
         */

        const possibleFunctions = [
            "exportReport",
            "exportToExcel",
            "downloadExcel",
            "exportExcel",
            "downloadData"
        ];

        for (const functionName of possibleFunctions) {
            if (
                typeof window[functionName] === "function"
            ) {
                try {
                    window[functionName](
                        data,
                        type
                    );

                    return;
                } catch (error) {
                    console.warn(
                        `Exporter ${functionName} gagal:`,
                        error
                    );
                }
            }
        }

        /*
         * Fallback langsung menggunakan SheetJS.
         */

        if (
            typeof XLSX === "undefined"
        ) {
            alert(
                "Library Excel belum tersedia. " +
                "Pastikan SheetJS berhasil dimuat."
            );

            return;
        }

        const rows =
            data.map((item) => {
                if (
                    type === "material" ||
                    type === "materialError"
                ) {
                    const material =
                        normalizeMaterialItem(item);

                    const result = {
                        Ticket: material.ticket,
                        Material: material.material,
                        Qty: material.qty,
                        Satuan: material.satuan,
                        Kode: material.kode
                    };

                    if (
                        type === "materialError"
                    ) {
                        result.Error =
                            material.error;
                    }

                    return result;
                }

                const validation =
                    normalizeResultItem(item);

                return {
                    Ticket: validation.ticket,
                    "Datetime Receive":
                        validation.datetimeReceive,
                    "TT Release":
                        validation.ttRelease,
                    Status: validation.status,
                    Keterangan:
                        validation.keterangan
                };
            });

        const worksheet =
            XLSX.utils.json_to_sheet(rows);

        const workbook =
            XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            "Data"
        );

        const fileNames = {
            valid: "Sesuai.xlsx",
            invalid: "Tidak Sesuai.xlsx",
            material: "Material.xlsx",
            materialError: "Material Error.xlsx"
        };

        XLSX.writeFile(
            workbook,
            fileNames[type] ||
            "Report Checker.xlsx"
        );
    }


    /* =====================================================
       RESET APP
    ====================================================== */

    function resetApp() {
        state.currentTab = "valid";

        state.data.valid = [];
        state.data.invalid = [];
        state.data.material = [];
        state.data.materialError = [];

        state.originalRows = [];

        state.processed = false;

        resetPagination();

        const dashboard =
            $("dashboardSection");

        if (dashboard) {
            dashboard.classList.add("hidden");
        }

        const fileInput =
            $("excelFile");

        if (fileInput) {
            fileInput.value = "";
        }

        hideSelectedFile();

        const processBtn =
            $("processBtn");

        if (processBtn) {
            processBtn.disabled = true;
        }

        setProcessing(false);

        setSystemStatus(
            "Ready",
            "offline"
        );

        updateDashboardCounts();

        updateDownloadButtons();

        updateSummary();

        [
            "validTableBody",
            "invalidTableBody",
            "materialTableBody",
            "materialErrorTableBody"
        ].forEach((id) => {
            const body = $(id);

            if (body) {
                body.innerHTML = "";
            }
        });

        switchTab("valid");

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }


    /* =====================================================
       SET RESULT FROM PROCESSOR
    ====================================================== */

    function applyProcessingResult(result) {
        if (!result) {
            throw new Error(
                "Hasil proses Excel kosong."
            );
        }

        /*
         * Mendukung beberapa nama property
         * agar kompatibel dengan parser/validator
         * tahap sebelumnya.
         */

        state.data.valid =
            safeArray(
                result.valid ??
                result.validData ??
                result.sesuai
            );

        state.data.invalid =
            safeArray(
                result.invalid ??
                result.invalidData ??
                result.tidakSesuai
            );

        state.data.material =
            safeArray(
                result.material ??
                result.materials
            );

        state.data.materialError =
            safeArray(
                result.materialError ??
                result.materialErrors ??
                result.material_error
            );

        state.processed = true;

        renderAll();

        setSystemStatus(
            "Selesai",
            "online"
        );

        setProcessing(
            false
        );
    }


    /* =====================================================
       TRY PROCESS EXCEL
    ====================================================== */

    async function processExcelFile(file) {
        if (!file) {
            alert(
                "Silakan pilih file Excel terlebih dahulu."
            );

            return;
        }

        if (
            typeof XLSX === "undefined"
        ) {
            alert(
                "SheetJS belum berhasil dimuat. " +
                "Periksa koneksi internet atau library XLSX."
            );

            return;
        }

        setProcessing(
            true,
            "Membaca data Excel..."
        );

        setSystemStatus(
            "Processing",
            "processing"
        );

        try {
            const arrayBuffer =
                await file.arrayBuffer();

            setProcessing(
                true,
                "Membuka workbook Excel..."
            );

            const workbook =
                XLSX.read(
                    arrayBuffer,
                    {
                        type: "array",
                        cellDates: true,
                        cellNF: true,
                        cellText: true
                    }
                );

            if (
                !workbook.SheetNames ||
                workbook.SheetNames.length === 0
            ) {
                throw new Error(
                    "File Excel tidak memiliki sheet."
                );
            }

            const sheetName =
                workbook.SheetNames[0];

            const worksheet =
                workbook.Sheets[sheetName];

            if (!worksheet) {
                throw new Error(
                    "Worksheet Excel tidak ditemukan."
                );
            }

            setProcessing(
                true,
                "Mengambil data worksheet..."
            );

            const rows =
                XLSX.utils.sheet_to_json(
                    worksheet,
                    {
                        header: 1,
                        defval: "",
                        raw: false
                    }
                );

            state.originalRows = rows;

            if (
                !Array.isArray(rows) ||
                rows.length === 0
            ) {
                throw new Error(
                    "Worksheet tidak memiliki data."
                );
            }

            setProcessing(
                true,
                `Menemukan ${rows.length.toLocaleString("id-ID")} baris. Memproses...`
            );

            /*
             * Cari fungsi processor dari file lain.
             */

            const processorNames = [
                "processExcel",
                "processWorkbook",
                "processRows",
                "runReportChecker",
                "runChecker",
                "checkExcel",
                "validateExcel",
                "processReport"
            ];

            let processor = null;

            for (
                const functionName of processorNames
            ) {
                if (
                    typeof window[functionName] === "function"
                ) {
                    processor =
                        window[functionName];

                    break;
                }
            }

            /*
             * Jika fungsi utama tersedia,
             * gunakan fungsi tersebut.
             */

            if (processor) {
                let result;

                try {
                    result =
                        await processor(
                            rows,
                            file,
                            workbook
                        );
                } catch (firstError) {
                    /*
                     * Coba format argument sederhana
                     * untuk kompatibilitas parser lama.
                     */

                    try {
                        result =
                            await processor(
                                rows
                            );
                    } catch (secondError) {
                        throw firstError;
                    }
                }

                applyProcessingResult(
                    result
                );

                return;
            }

            /*
             * Jika excel.js memiliki fungsi parser,
             * coba fungsi global umum.
             */

            const parserNames = [
                "parseExcelData",
                "parseExcel",
                "parseRows",
                "analyzeRows",
                "validateRows"
            ];

            for (
                const functionName of parserNames
            ) {
                if (
                    typeof window[functionName] === "function"
                ) {
                    const result =
                        await window[functionName](
                            rows
                        );

                    if (result) {
                        applyProcessingResult(
                            result
                        );

                        return;
                    }
                }
            }

            /*
             * Tidak ada processor yang cocok.
             */

            throw new Error(
                "Fungsi pemrosesan Excel tidak ditemukan. " +
                "Pastikan excel.js, validator.js, cir-parser.js " +
                "dan material-parser.js berhasil dimuat."
            );

        } catch (error) {
            console.error(
                "Report Checker processing error:",
                error
            );

            setProcessing(
                false
            );

            setSystemStatus(
                "Error",
                "error"
            );

            alert(
                "Gagal memproses Excel.\n\n" +
                (error && error.message
                    ? error.message
                    : String(error))
            );
        }
    }


    /* =====================================================
       FILE INPUT
    ====================================================== */

    function handleFileSelected(file) {
        if (!file) {
            return;
        }

        const fileName =
            String(file.name || "")
                .toLowerCase();

        const allowed =
            fileName.endsWith(".xlsx") ||
            fileName.endsWith(".xls") ||
            fileName.endsWith(".xlsm");

        if (!allowed) {
            alert(
                "Format file tidak didukung.\n" +
                "Gunakan .xlsx, .xls, atau .xlsm."
            );

            return;
        }

        showSelectedFile(file);

        const processBtn =
            $("processBtn");

        if (processBtn) {
            processBtn.disabled = false;
        }

        window.__reportCheckerFile =
            file;

        setSystemStatus(
            "File Ready",
            "online"
        );
    }


    /* =====================================================
       EVENT: FILE INPUT
    ====================================================== */

    function bindFileEvents() {
        const input =
            $("excelFile");

        const dropZone =
            $("dropZone");

        const processBtn =
            $("processBtn");

        const removeBtn =
            $("removeFileBtn");

        if (input) {
            input.addEventListener(
                "change",
                (event) => {
                    const file =
                        event.target.files &&
                        event.target.files[0];

                    handleFileSelected(file);
                }
            );
        }

        if (dropZone) {
            dropZone.addEventListener(
                "click",
                () => {
                    if (input) {
                        input.click();
                    }
                }
            );

            dropZone.addEventListener(
                "keydown",
                (event) => {
                    if (
                        event.key === "Enter" ||
                        event.key === " "
                    ) {
                        event.preventDefault();

                        if (input) {
                            input.click();
                        }
                    }
                }
            );

            [
                "dragenter",
                "dragover"
            ].forEach((eventName) => {
                dropZone.addEventListener(
                    eventName,
                    (event) => {
                        event.preventDefault();
                        event.stopPropagation();

                        dropZone.classList.add(
                            "dragover"
                        );
                    }
                );
            });

            [
                "dragleave",
                "drop"
            ].forEach((eventName) => {
                dropZone.addEventListener(
                    eventName,
                    (event) => {
                        event.preventDefault();
                        event.stopPropagation();

                        dropZone.classList.remove(
                            "dragover"
                        );
                    }
                );
            });

            dropZone.addEventListener(
                "drop",
                (event) => {
                    const files =
                        event.dataTransfer &&
                        event.dataTransfer.files;

                    if (
                        files &&
                        files.length > 0
                    ) {
                        handleFileSelected(
                            files[0]
                        );
                    }
                }
            );
        }

        if (processBtn) {
            processBtn.addEventListener(
                "click",
                async () => {
                    const file =
                        window.__reportCheckerFile;

                    if (!file) {
                        alert(
                            "Silakan pilih file Excel."
                        );

                        return;
                    }

                    await processExcelFile(
                        file
                    );
                }
            );
        }

        if (removeBtn) {
            removeBtn.addEventListener(
                "click",
                () => {
                    window.__reportCheckerFile =
                        null;

                    hideSelectedFile();

                    if (input) {
                        input.value = "";
                    }

                    if (processBtn) {
                        processBtn.disabled = true;
                    }

                    setSystemStatus(
                        "Ready",
                        "offline"
                    );
                }
            );
        }
    }


    /* =====================================================
       EVENT: TABS
    ====================================================== */

    function bindTabEvents() {
        document
            .querySelectorAll(".tab-button")
            .forEach((button) => {
                button.addEventListener(
                    "click",
                    () => {
                        switchTab(
                            button.dataset.tab
                        );
                    }
                );
            });
    }


    /* =====================================================
       EVENT: PAGINATION
    ====================================================== */

    function bindPaginationEvents() {
        const types = [
            "valid",
            "invalid",
            "material",
            "materialError"
        ];

        types.forEach((type) => {
            const prev =
                $(`${type}PrevBtn`);

            const next =
                $(`${type}NextBtn`);

            if (prev) {
                prev.addEventListener(
                    "click",
                    () => {
                        goToPage(
                            type,
                            -1
                        );
                    }
                );
            }

            if (next) {
                next.addEventListener(
                    "click",
                    () => {
                        goToPage(
                            type,
                            1
                        );
                    }
                );
            }
        });
    }


    /* =====================================================
       EVENT: DOWNLOAD
    ====================================================== */

    function bindDownloadEvents() {
        const mapping = {
            downloadValidBtn: "valid",
            downloadInvalidBtn: "invalid",
            downloadMaterialBtn: "material",
            downloadMaterialErrorBtn:
                "materialError"
        };

        Object.entries(mapping)
            .forEach(([buttonId, type]) => {
                const button =
                    $(buttonId);

                if (!button) {
                    return;
                }

                button.addEventListener(
                    "click",
                    () => {
                        exportData(type);
                    }
                );
            });
    }


    /* =====================================================
       EVENT: RESET
    ====================================================== */

    function bindResetEvent() {
        const resetBtn =
            $("resetBtn");

        if (!resetBtn) {
            return;
        }

        resetBtn.addEventListener(
            "click",
            () => {
                resetApp();
            }
        );
    }


    /* =====================================================
       INITIALIZATION
    ====================================================== */

    function init() {
        console.log(
            "ReportChecker app.js tahap 2 loaded."
        );

        bindFileEvents();
        bindTabEvents();
        bindPaginationEvents();
        bindDownloadEvents();
        bindResetEvent();

        updateDashboardCounts();

        updateDownloadButtons();

        updateSummary();

        switchTab("valid");

        setSystemStatus(
            "Ready",
            "offline"
        );
    }


    /* =====================================================
       PUBLIC API
    ====================================================== */

    window.ReportChecker = {
        state,

        init,

        processExcelFile,

        applyProcessingResult,

        renderAll,

        renderTable,

        switchTab,

        resetApp,

        exportData,

        setSystemStatus
    };


    /* =====================================================
       START
    ====================================================== */

    if (
        document.readyState === "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            init
        );
    } else {
        init();
    }

})();
