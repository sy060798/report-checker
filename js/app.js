/* =========================================================
   REPORT CHECKER
   app.js

   FULL UPDATE
   ---------------------------------------------------------
   - Compatible dengan index.html terbaru
   - Compatible dengan excel.js
   - TT Number = kolom D
   - CIR = kolom AF
   - Validasi Ticket Release
   - Parsing Material
   - Material Error
   - 4 Tab
   - Pagination
   - Progress processing
   - Export Excel
   - Reset
   - Settings Material
   - Drag & Drop
   - Keyboard shortcut
   - Error handling
   ========================================================= */

(function () {

    "use strict";


    /* =====================================================
       CONFIG
    ===================================================== */

    const CONFIG = {

        pageSize: 25,

        maxFileSizeMB: 100,

        allowedExtensions: [
            ".xlsx",
            ".xls",
            ".xlsm"
        ],

        processingChunkSize: 250

    };


    /* =====================================================
       DOM
    ===================================================== */

    const el = {};


    function cacheDOM() {

        const ids = [

            "systemStatus",

            "dropZone",
            "excelFile",

            "selectedFile",
            "fileName",
            "fileSize",
            "removeFileBtn",

            "processBtn",

            "processingStatus",
            "processingTitle",
            "processingText",
            "processingProgress",

            "dashboardSection",
            "resultSummary",

            "resetBtn",

            "totalCount",
            "validCount",
            "invalidCount",
            "materialCount",
            "materialErrorCount",

            "validTabCount",
            "invalidTabCount",
            "materialTabCount",
            "materialErrorTabCount",

            "validTable",
            "validTableBody",
            "validEmpty",

            "invalidTable",
            "invalidTableBody",
            "invalidEmpty",

            "materialTable",
            "materialTableBody",
            "materialEmpty",

            "materialErrorTable",
            "materialErrorTableBody",
            "materialErrorEmpty",

            "validPagination",
            "validPrevBtn",
            "validPageNumber",
            "validPageTotal",
            "validNextBtn",

            "invalidPagination",
            "invalidPrevBtn",
            "invalidPageNumber",
            "invalidPageTotal",
            "invalidNextBtn",

            "materialPagination",
            "materialPrevBtn",
            "materialPageNumber",
            "materialPageTotal",
            "materialNextBtn",

            "materialErrorPagination",
            "materialErrorPrevBtn",
            "materialErrorPageNumber",
            "materialErrorPageTotal",
            "materialErrorNextBtn",

            "downloadValidBtn",
            "downloadInvalidBtn",
            "downloadMaterialBtn",
            "downloadMaterialErrorBtn",

            "materialList",
            "saveSettingsBtn",
            "resetSettingsBtn",
            "settingsSavedMessage"

        ];


        ids.forEach(function (id) {

            el[id] =
                document.getElementById(id);

        });


        el.tabButtons =
            Array.from(
                document.querySelectorAll(
                    ".tab-button"
                )
            );


        el.tabContents =
            Array.from(
                document.querySelectorAll(
                    ".tab-content"
                )
            );

    }


    /* =====================================================
       STATE
    ===================================================== */

    const state = {

        file: null,

        result: null,

        processing: false,

        currentTab: "valid",

        pages: {

            valid: 1,

            invalid: 1,

            material: 1,

            "material-error": 1

        },

        pageSize:
            CONFIG.pageSize

    };


    /* =====================================================
       UTILITY
    ===================================================== */

    function clean(value) {

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


    function escapeHTML(value) {

        return clean(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    }


    function formatNumber(value) {

        const number =
            Number(value);


        if (
            !Number.isFinite(number)
        ) {

            return clean(value);

        }


        return number.toLocaleString(
            "id-ID"
        );

    }


    function formatFileSize(bytes) {

        if (!bytes) {

            return "0 B";

        }


        const units = [
            "B",
            "KB",
            "MB",
            "GB"
        ];


        let size = bytes;

        let index = 0;


        while (
            size >= 1024 &&
            index < units.length - 1
        ) {

            size /= 1024;

            index++;

        }


        return (
            size.toFixed(
                size >= 10 || index === 0
                    ? 0
                    : 1
            ) +
            " " +
            units[index]
        );

    }


    function getExtension(fileName) {

        const name =
            clean(fileName)
                .toLowerCase();


        const index =
            name.lastIndexOf(".");


        if (index === -1) {

            return "";

        }


        return name.substring(index);

    }


    function nextFrame() {

        return new Promise(
            function (resolve) {

                if (
                    typeof requestAnimationFrame ===
                    "function"
                ) {

                    requestAnimationFrame(
                        function () {

                            resolve();

                        }
                    );

                }

                else {

                    setTimeout(
                        resolve,
                        0
                    );

                }

            }
        );

    }


    /* =====================================================
       NOTIFICATION
    ===================================================== */

    function showMessage(
        message,
        type
    ) {

        const old =
            document.querySelector(
                ".app-toast"
            );


        if (old) {

            old.remove();

        }


        const toast =
            document.createElement(
                "div"
            );


        toast.className =
            "app-toast " +
            (
                type ||
                "info"
            );


        toast.textContent =
            clean(message);


        Object.assign(
            toast.style,
            {

                position: "fixed",

                right: "20px",

                bottom: "20px",

                zIndex: "99999",

                maxWidth: "420px",

                padding: "12px 16px",

                borderRadius: "10px",

                color: "#fff",

                background:
                    type === "error"
                        ? "#dc2626"
                        : type === "success"
                            ? "#16a34a"
                            : "#2563eb",

                boxShadow:
                    "0 8px 25px rgba(0,0,0,.18)",

                fontSize: "14px",

                lineHeight: "1.5"

            }
        );


        document.body.appendChild(
            toast
        );


        setTimeout(
            function () {

                if (
                    toast &&
                    toast.parentNode
                ) {

                    toast.remove();

                }

            },
            4000
        );

    }


    /* =====================================================
       SYSTEM STATUS
    ===================================================== */

    function setSystemStatus(
        text,
        status
    ) {

        if (!el.systemStatus) {

            return;

        }


        el.systemStatus.textContent =
            text;


        el.systemStatus.classList.remove(
            "offline",
            "online",
            "processing",
            "error"
        );


        el.systemStatus.classList.add(
            status || "offline"
        );

    }


    /* =====================================================
       PROCESSING UI
    ===================================================== */

    function showProcessing(
        title,
        text,
        progress
    ) {

        if (
            el.processingStatus
        ) {

            el.processingStatus
                .classList
                .remove("hidden");

        }


        if (
            el.processingTitle
        ) {

            el.processingTitle.textContent =
                title ||
                "Sedang memproses...";

        }


        if (
            el.processingText
        ) {

            el.processingText.textContent =
                text ||
                "Membaca data Excel...";

        }


        updateProgress(
            progress || 0
        );

    }


    function hideProcessing() {

        if (
            el.processingStatus
        ) {

            el.processingStatus
                .classList
                .add("hidden");

        }

    }


    function updateProgress(percent) {

        let value =
            Number(percent);


        if (
            !Number.isFinite(value)
        ) {

            value = 0;

        }


        value =
            Math.max(
                0,
                Math.min(
                    100,
                    Math.round(value)
                )
            );


        if (
            el.processingProgress
        ) {

            el.processingProgress.textContent =
                value + "%";

        }

    }


    /* =====================================================
       FILE VALIDATION
    ===================================================== */

    function validateFile(file) {

        if (!file) {

            return {

                valid: false,

                message:
                    "File belum dipilih."

            };

        }


        const extension =
            getExtension(
                file.name
            );


        if (
            !CONFIG.allowedExtensions
                .includes(extension)
        ) {

            return {

                valid: false,

                message:
                    "Format file tidak didukung. " +
                    "Gunakan .xlsx, .xls, atau .xlsm."

            };

        }


        const maxBytes =
            CONFIG.maxFileSizeMB *
            1024 *
            1024;


        if (
            file.size > maxBytes
        ) {

            return {

                valid: false,

                message:
                    "Ukuran file terlalu besar. " +
                    "Maksimal " +
                    CONFIG.maxFileSizeMB +
                    " MB."

            };

        }


        return {

            valid: true,

            message: ""

        };

    }


    /* =====================================================
       SELECT FILE
    ===================================================== */

    function selectFile(file) {

        const validation =
            validateFile(
                file
            );


        if (
            !validation.valid
        ) {

            clearFile();

            showMessage(
                validation.message,
                "error"
            );

            setSystemStatus(
                "Error",
                "error"
            );

            return;

        }


        state.file =
            file;


        state.result =
            null;


        if (el.fileName) {

            el.fileName.textContent =
                file.name;

        }


        if (el.fileSize) {

            el.fileSize.textContent =
                formatFileSize(
                    file.size
                );

        }


        if (el.selectedFile) {

            el.selectedFile
                .classList
                .remove("hidden");

        }


        if (el.processBtn) {

            el.processBtn.disabled =
                false;

        }


        setSystemStatus(
            "File siap",
            "online"
        );

    }


    function clearFile() {

        if (state.processing) {

            return;

        }


        state.file =
            null;


        if (el.excelFile) {

            el.excelFile.value =
                "";

        }


        if (el.selectedFile) {

            el.selectedFile
                .classList
                .add("hidden");

        }


        if (el.fileName) {

            el.fileName.textContent =
                "-";

        }


        if (el.fileSize) {

            el.fileSize.textContent =
                "-";

        }


        if (el.processBtn) {

            el.processBtn.disabled =
                true;

        }


        setSystemStatus(
            "Ready",
            "offline"
        );

    }


    /* =====================================================
       DATA ACCESS
    ===================================================== */

    function getArray(type) {

        if (!state.result) {

            return [];

        }


        const map = {

            valid:
                state.result.sesuai,

            invalid:
                state.result.tidakSesuai,

            material:
                state.result.materials,

            "material-error":
                state.result.materialError

        };


        const data =
            map[type];


        return Array.isArray(data)
            ? data
            : [];

    }


    /* =====================================================
       PAGINATION
    ===================================================== */

    function getTotalPages(type) {

        const data =
            getArray(type);


        if (!data.length) {

            return 1;

        }


        return Math.max(
            1,
            Math.ceil(
                data.length /
                state.pageSize
            )
        );

    }


    function getPageRows(type) {

        const data =
            getArray(type);


        const totalPages =
            getTotalPages(type);


        let page =
            Number(
                state.pages[type]
            );


        if (
            !Number.isFinite(page)
        ) {

            page = 1;

        }


        page =
            Math.max(
                1,
                Math.min(
                    page,
                    totalPages
                )
            );


        state.pages[type] =
            page;


        const start =
            (
                page - 1
            ) *
            state.pageSize;


        return data.slice(
            start,
            start +
            state.pageSize
        );

    }


    function updatePagination(type) {

        const totalPages =
            getTotalPages(type);


        const page =
            state.pages[type] || 1;


        const config = {

            valid: {

                wrapper:
                    el.validPagination,

                prev:
                    el.validPrevBtn,

                next:
                    el.validNextBtn,

                number:
                    el.validPageNumber,

                total:
                    el.validPageTotal

            },

            invalid: {

                wrapper:
                    el.invalidPagination,

                prev:
                    el.invalidPrevBtn,

                next:
                    el.invalidNextBtn,

                number:
                    el.invalidPageNumber,

                total:
                    el.invalidPageTotal

            },

            material: {

                wrapper:
                    el.materialPagination,

                prev:
                    el.materialPrevBtn,

                next:
                    el.materialNextBtn,

                number:
                    el.materialPageNumber,

                total:
                    el.materialPageTotal

            },

            "material-error": {

                wrapper:
                    el.materialErrorPagination,

                prev:
                    el.materialErrorPrevBtn,

                next:
                    el.materialErrorNextBtn,

                number:
                    el.materialErrorPageNumber,

                total:
                    el.materialErrorPageTotal

            }

        };


        const item =
            config[type];


        if (!item) {

            return;

        }


        if (item.number) {

            item.number.textContent =
                page;

        }


        if (item.total) {

            item.total.textContent =
                totalPages;

        }


        if (item.prev) {

            item.prev.disabled =
                page <= 1;

        }


        if (item.next) {

            item.next.disabled =
                page >= totalPages;

        }


        if (item.wrapper) {

            item.wrapper.style.display =
                totalPages > 1
                    ? "flex"
                    : "none";

        }

    }


    function changePage(
        type,
        direction
    ) {

        const totalPages =
            getTotalPages(type);


        let page =
            Number(
                state.pages[type]
            ) || 1;


        page +=
            Number(direction) || 0;


        page =
            Math.max(
                1,
                Math.min(
                    page,
                    totalPages
                )
            );


        state.pages[type] =
            page;


        renderTab(
            type
        );

    }


    /* =====================================================
       VALIDATION TABLE
    ===================================================== */

    function renderValidationRows(rows) {

        if (!Array.isArray(rows)) {

            return "";

        }


        return rows.map(
            function (item) {

                item =
                    item || {};


                const originalRow =
                    item.originalRow ||
                    {};


                const ticket =
                    clean(
                        item.ttNumber ||
                        item.ticket ||
                        item.tt ||
                        originalRow["TT Number"]
                    );


                const receive =
                    clean(
                        originalRow[
                            "Datetime Receive"
                        ] ||
                        item.datetimeReceive ||
                        item.receiveDateTime ||
                        item.receive
                    );


                const release =
                    clean(
                        item.releaseDateTime ||
                        item.ttRelease ||
                        item.ticketRelease ||
                        originalRow[
                            "TT Release"
                        ]
                    );


                const status =
                    clean(
                        item.status
                    );


                const reason =
                    clean(
                        item.reason ||
                        item.note ||
                        item.message ||
                        item.keterangan
                    );


                const statusUpper =
                    status.toUpperCase();


                let statusClass =
                    "status-neutral";


                if (
                    statusUpper.includes(
                        "SESUAI"
                    ) ||
                    statusUpper.includes(
                        "VALID"
                    ) ||
                    statusUpper === "OK"
                ) {

                    statusClass =
                        "status-success";

                }


                if (
                    statusUpper.includes(
                        "TIDAK"
                    ) ||
                    statusUpper.includes(
                        "INVALID"
                    ) ||
                    statusUpper.includes(
                        "ERROR"
                    )
                ) {

                    statusClass =
                        "status-danger";

                }


                return (

                    "<tr>" +

                    "<td>" +
                    escapeHTML(
                        ticket || "-"
                    ) +
                    "</td>" +

                    "<td>" +
                    escapeHTML(
                        receive || "-"
                    ) +
                    "</td>" +

                    "<td>" +
                    escapeHTML(
                        release || "-"
                    ) +
                    "</td>" +

                    "<td>" +

                    "<span class=\"status-cell " +
                    statusClass +
                    "\">" +

                    escapeHTML(
                        status || "-"
                    ) +

                    "</span>" +

                    "</td>" +

                    "<td>" +
                    escapeHTML(
                        reason || "-"
                    ) +
                    "</td>" +

                    "</tr>"

                );

            }
        ).join("");

    }


    /* =====================================================
       MATERIAL TABLE
    ===================================================== */

    function renderMaterialRows(rows) {

        if (!Array.isArray(rows)) {

            return "";

        }


        return rows.map(
            function (item) {

                item =
                    item || {};


                const ticket =
                    clean(
                        item.ticket ||
                        item.ttNumber ||
                        item.tt
                    );


                const material =
                    clean(
                        item.material ||
                        item.materialName ||
                        item.namaMaterial
                    );


                const quantity =
                    item.quantity ??
                    item.qty ??
                    item.jumlah ??
                    "";


                const unit =
                    clean(
                        item.unit ||
                        item.satuan
                    );


                const code =
                    clean(
                        item.code ||
                        item.kode ||
                        item.materialCode
                    );


                return (

                    "<tr>" +

                    "<td>" +
                    escapeHTML(
                        ticket || "-"
                    ) +
                    "</td>" +

                    "<td>" +
                    escapeHTML(
                        material || "-"
                    ) +
                    "</td>" +

                    "<td>" +
                    escapeHTML(
                        quantity
                    ) +
                    "</td>" +

                    "<td>" +
                    escapeHTML(
                        unit || "-"
                    ) +
                    "</td>" +

                    "<td>" +
                    escapeHTML(
                        code || "-"
                    ) +
                    "</td>" +

                    "</tr>"

                );

            }
        ).join("");

    }


    /* =====================================================
       MATERIAL ERROR TABLE
    ===================================================== */

    function renderMaterialErrorRows(rows) {

        if (!Array.isArray(rows)) {

            return "";

        }


        return rows.map(
            function (item) {

                item =
                    item || {};


                const ticket =
                    clean(
                        item.ticket ||
                        item.ttNumber ||
                        item.tt
                    );


                const material =
                    clean(
                        item.material ||
                        item.materialName ||
                        item.namaMaterial
                    );


                const quantity =
                    item.quantity ??
                    item.qty ??
                    item.jumlah ??
                    "";


                const unit =
                    clean(
                        item.unit ||
                        item.satuan
                    );


                const code =
                    clean(
                        item.code ||
                        item.kode ||
                        item.materialCode
                    );


                const reason =
                    clean(
                        item.reason ||
                        item.error ||
                        item.message ||
                        item.keterangan ||
                        "Material tidak ditemukan."
                    );


                return (

                    "<tr>" +

                    "<td>" +
                    escapeHTML(
                        ticket || "-"
                    ) +
                    "</td>" +

                    "<td>" +
                    escapeHTML(
                        material || "-"
                    ) +
                    "</td>" +

                    "<td>" +
                    escapeHTML(
                        quantity
                    ) +
                    "</td>" +

                    "<td>" +
                    escapeHTML(
                        unit || "-"
                    ) +
                    "</td>" +

                    "<td>" +
                    escapeHTML(
                        code || "-"
                    ) +
                    "</td>" +

                    "<td>" +
                    escapeHTML(
                        reason
                    ) +
                    "</td>" +

                    "</tr>"

                );

            }
        ).join("");

    }


    /* =====================================================
       EMPTY STATE
    ===================================================== */

    function updateEmptyState(
        type,
        count
    ) {

        const emptyMap = {

            valid:
                el.validEmpty,

            invalid:
                el.invalidEmpty,

            material:
                el.materialEmpty,

            "material-error":
                el.materialErrorEmpty

        };


        const tableMap = {

            valid:
                el.validTable,

            invalid:
                el.invalidTable,

            material:
                el.materialTable,

            "material-error":
                el.materialErrorTable

        };


        const empty =
            emptyMap[type];


        const table =
            tableMap[type];


        if (empty) {

            empty.style.display =
                count === 0
                    ? "block"
                    : "none";

        }


        if (table) {

            table.style.display =
                count === 0
                    ? "none"
                    : "table";

        }

    }


    /* =====================================================
       RENDER TAB
    ===================================================== */

    function renderTab(type) {

        const rows =
            getPageRows(type);


        const total =
            getArray(type).length;


        if (
            type === "valid" &&
            el.validTableBody
        ) {

            el.validTableBody.innerHTML =
                renderValidationRows(
                    rows
                );

        }


        if (
            type === "invalid" &&
            el.invalidTableBody
        ) {

            el.invalidTableBody.innerHTML =
                renderValidationRows(
                    rows
                );

        }


        if (
            type === "material" &&
            el.materialTableBody
        ) {

            el.materialTableBody.innerHTML =
                renderMaterialRows(
                    rows
                );

        }


        if (
            type === "material-error" &&
            el.materialErrorTableBody
        ) {

            el.materialErrorTableBody.innerHTML =
                renderMaterialErrorRows(
                    rows
                );

        }


        updateEmptyState(
            type,
            total
        );


        updatePagination(
            type
        );

    }


    /* =====================================================
       RENDER ALL
    ===================================================== */

    function renderAllTabs() {

        renderTab(
            "valid"
        );

        renderTab(
            "invalid"
        );

        renderTab(
            "material"
        );

        renderTab(
            "material-error"
        );

    }


    /* =====================================================
       TAB SWITCH
    ===================================================== */

    function activateTab(type) {

        const allowed = [

            "valid",
            "invalid",
            "material",
            "material-error"

        ];


        if (
            !allowed.includes(type)
        ) {

            type = "valid";

        }


        state.currentTab =
            type;


        el.tabButtons.forEach(
            function (button) {

                const active =
                    button.dataset.tab ===
                    type;


                button.classList.toggle(
                    "active",
                    active
                );

            }
        );


        el.tabContents.forEach(
            function (content) {

                const active =
                    content.id ===
                    "tab-" +
                    type;


                content.classList.toggle(
                    "active",
                    active
                );

            }
        );


        renderTab(
            type
        );

    }


    /* =====================================================
       UPDATE COUNTERS
    ===================================================== */

    function updateCounters() {

        const result =
            state.result;


        if (!result) {

            return;

        }


        const summary =
            result.summary ||
            {};


        const valid =
            Array.isArray(
                result.sesuai
            )
                ? result.sesuai.length
                : 0;


        const invalid =
            Array.isArray(
                result.tidakSesuai
            )
                ? result.tidakSesuai.length
                : 0;


        const material =
            Array.isArray(
                result.materials
            )
                ? result.materials.length
                : 0;


        const materialError =
            Array.isArray(
                result.materialError
            )
                ? result.materialError.length
                : 0;


        const totalFromSummary =
            Number(
                summary.total
            );


        const total =
            Number.isFinite(
                totalFromSummary
            )
                ? totalFromSummary
                : (
                    valid +
                    invalid
                );


        if (el.totalCount) {

            el.totalCount.textContent =
                formatNumber(
                    total
                );

        }


        if (el.validCount) {

            el.validCount.textContent =
                formatNumber(
                    valid
                );

        }


        if (el.invalidCount) {

            el.invalidCount.textContent =
                formatNumber(
                    invalid
                );

        }


        if (el.materialCount) {

            el.materialCount.textContent =
                formatNumber(
                    material
                );

        }


        if (el.materialErrorCount) {

            el.materialErrorCount.textContent =
                formatNumber(
                    materialError
                );

        }


        if (el.validTabCount) {

            el.validTabCount.textContent =
                formatNumber(
                    valid
                );

        }


        if (el.invalidTabCount) {

            el.invalidTabCount.textContent =
                formatNumber(
                    invalid
                );

        }


        if (el.materialTabCount) {

            el.materialTabCount.textContent =
                formatNumber(
                    material
                );

        }


        if (
            el.materialErrorTabCount
        ) {

            el.materialErrorTabCount
                .textContent =
                formatNumber(
                    materialError
                );

        }


        if (el.resultSummary) {

            el.resultSummary.textContent =
                (
                    "Total " +
                    formatNumber(total) +
                    " data • " +
                    formatNumber(valid) +
                    " sesuai • " +
                    formatNumber(invalid) +
                    " tidak sesuai • " +
                    formatNumber(material) +
                    " material • " +
                    formatNumber(materialError) +
                    " material error"
                );

        }

    }


    /* =====================================================
       DOWNLOAD BUTTONS
    ===================================================== */

    function updateDownloadButtons() {

        const result =
            state.result;


        if (!result) {

            if (el.downloadValidBtn) {

                el.downloadValidBtn.disabled =
                    true;

            }


            if (el.downloadInvalidBtn) {

                el.downloadInvalidBtn.disabled =
                    true;

            }


            if (el.downloadMaterialBtn) {

                el.downloadMaterialBtn.disabled =
                    true;

            }


            if (
                el.downloadMaterialErrorBtn
            ) {

                el.downloadMaterialErrorBtn.disabled =
                    true;

            }


            return;

        }


        const valid =
            getArray("valid").length;


        const invalid =
            getArray("invalid").length;


        const material =
            getArray("material").length;


        const materialError =
            getArray(
                "material-error"
            ).length;


        if (el.downloadValidBtn) {

            el.downloadValidBtn.disabled =
                valid === 0;

        }


        if (el.downloadInvalidBtn) {

            el.downloadInvalidBtn.disabled =
                invalid === 0;

        }


        if (el.downloadMaterialBtn) {

            el.downloadMaterialBtn.disabled =
                material === 0;

        }


        if (
            el.downloadMaterialErrorBtn
        ) {

            el.downloadMaterialErrorBtn.disabled =
                materialError === 0;

        }

    }


    /* =====================================================
       SHOW DASHBOARD
    ===================================================== */

    function showDashboard() {

        if (
            el.dashboardSection
        ) {

            el.dashboardSection
                .classList
                .remove("hidden");

        }


        updateCounters();

        updateDownloadButtons();

        renderAllTabs();

        activateTab(
            "valid"
        );


        if (
            el.dashboardSection
        ) {

            setTimeout(
                function () {

                    try {

                        el.dashboardSection
                            .scrollIntoView({
                                behavior: "smooth",
                                block: "start"
                            });

                    }

                    catch (error) {

                        console.warn(
                            "Scroll dashboard gagal:",
                            error
                        );

                    }

                },
                50
            );

        }

    }


    /* =====================================================
       HIDE DASHBOARD
    ===================================================== */

    function hideDashboard() {

        if (
            el.dashboardSection
        ) {

            el.dashboardSection
                .classList
                .add("hidden");

        }

    }


    /* =====================================================
       PROCESS EXCEL
    ===================================================== */

    async function processExcel() {

        if (state.processing) {

            return;

        }


        if (!state.file) {

            showMessage(
                "Pilih file Excel terlebih dahulu.",
                "error"
            );

            return;

        }


        const validation =
            validateFile(
                state.file
            );


        if (
            !validation.valid
        ) {

            showMessage(
                validation.message,
                "error"
            );

            return;

        }


        if (
            !window.ReportCheckerExcel ||
            typeof window
                .ReportCheckerExcel
                .load !==
                "function"
        ) {

            showMessage(
                "excel.js belum berhasil dimuat.",
                "error"
            );

            return;

        }


        state.processing =
            true;


        if (el.processBtn) {

            el.processBtn.disabled =
                true;

        }


        if (el.removeFileBtn) {

            el.removeFileBtn.disabled =
                true;

        }


        setSystemStatus(
            "Processing",
            "processing"
        );


        hideDashboard();


        showProcessing(
            "Sedang memproses...",
            "Membaca file Excel...",
            5
        );


        try {

            await nextFrame();


            showProcessing(
                "Membaca Excel",
                "Membaca workbook dan header...",
                15
            );


            await nextFrame();


            const result =
                await window
                    .ReportCheckerExcel
                    .load(
                        state.file
                    );


            if (
                !result ||
                typeof result !== "object"
            ) {

                throw new Error(
                    "Excel berhasil dibaca tetapi hasil parsing tidak valid."
                );

            }


            showProcessing(
                "Memeriksa data",
                "Validasi Ticket Release dan CIR...",
                60
            );


            await nextFrame();


            showProcessing(
                "Menyelesaikan hasil",
                "Menyiapkan Material dan Material Error...",
                85
            );


            await nextFrame();


            state.result =
                result;


            state.pages = {

                valid: 1,

                invalid: 1,

                material: 1,

                "material-error": 1

            };


            showProcessing(
                "Selesai",
                "Menyiapkan dashboard...",
                100
            );


            await nextFrame();


            hideProcessing();


            showDashboard();


            setSystemStatus(
                "Selesai",
                "online"
            );


            showMessage(
                "Excel berhasil diproses.",
                "success"
            );

        }

        catch (error) {

            console.error(
                "Report Checker error:",
                error
            );


            hideProcessing();

            hideDashboard();


            state.result =
                null;


            setSystemStatus(
                "Error",
                "error"
            );


            const message =
                clean(
                    error?.message
                ) ||
                "Gagal memproses Excel.";


            showMessage(
                message,
                "error"
            );

        }

        finally {

            state.processing =
                false;


            if (el.processBtn) {

                el.processBtn.disabled =
                    !state.file;

            }


            if (el.removeFileBtn) {

                el.removeFileBtn.disabled =
                    false;

            }

        }

    }


    /* =====================================================
       DOWNLOAD RESULT
    ===================================================== */

    function downloadResult(type) {

        if (!state.result) {

            showMessage(
                "Belum ada hasil untuk didownload.",
                "error"
            );

            return;

        }


        if (
            !window.ReportCheckerExcel ||
            typeof window
                .ReportCheckerExcel
                .exportResult !==
                "function"
        ) {

            showMessage(
                "Fungsi export Excel tidak tersedia.",
                "error"
            );

            return;

        }


        try {

            setSystemStatus(
                "Export",
                "processing"
            );


            window
                .ReportCheckerExcel
                .exportResult(
                    type
                );


            setSystemStatus(
                "Selesai",
                "online"
            );


            showMessage(
                "File berhasil dibuat.",
                "success"
            );

        }

        catch (error) {

            console.error(
                "Export error:",
                error
            );


            setSystemStatus(
                "Error",
                "error"
            );


            showMessage(
                clean(
                    error?.message
                ) ||
                "Gagal membuat file Excel.",
                "error"
            );

        }

    }


    /* =====================================================
       RESET APPLICATION
    ===================================================== */

    function resetApplication() {

        if (state.processing) {

            return;

        }


        state.file =
            null;


        state.result =
            null;


        state.currentTab =
            "valid";


        state.pages = {

            valid: 1,

            invalid: 1,

            material: 1,

            "material-error": 1

        };


        if (
            window.ReportCheckerExcel &&
            typeof window
                .ReportCheckerExcel
                .reset ===
                "function"
        ) {

            try {

                window
                    .ReportCheckerExcel
                    .reset();

            }

            catch (error) {

                console.warn(
                    "Reset excel state gagal:",
                    error
                );

            }

        }


        /*
         * Jangan menggunakan clearFile()
         * sebelum state.processing false.
         */

        clearFile();

        hideDashboard();

        hideProcessing();


        if (el.validTableBody) {

            el.validTableBody.innerHTML =
                "";

        }


        if (el.invalidTableBody) {

            el.invalidTableBody.innerHTML =
                "";

        }


        if (el.materialTableBody) {

            el.materialTableBody.innerHTML =
                "";

        }


        if (
            el.materialErrorTableBody
        ) {

            el.materialErrorTableBody.innerHTML =
                "";

        }


        const numberElements = [

            el.totalCount,

            el.validCount,

            el.invalidCount,

            el.materialCount,

            el.materialErrorCount,

            el.validTabCount,

            el.invalidTabCount,

            el.materialTabCount,

            el.materialErrorTabCount

        ];


        numberElements.forEach(
            function (element) {

                if (element) {

                    element.textContent =
                        "0";

                }

            }
        );


        if (el.resultSummary) {

            el.resultSummary.textContent =
                "-";

        }


        [
            "valid",
            "invalid",
            "material",
            "material-error"
        ].forEach(
            function (type) {

                state.pages[type] =
                    1;

                updatePagination(
                    type
                );

            }
        );


        updateDownloadButtons();


        activateTab(
            "valid"
        );


        setSystemStatus(
            "Ready",
            "offline"
        );


        updateProgress(
            0
        );

    }


    /* =====================================================
       SETTINGS
    ===================================================== */

    function loadSettings() {

        try {

            const settings =
                window.ReportCheckerSettings;


            if (
                settings &&
                typeof settings.getMaterials ===
                "function"
            ) {

                const materials =
                    settings.getMaterials();


                if (
                    Array.isArray(materials) &&
                    el.materialList
                ) {

                    el.materialList.value =
                        materials.join(
                            "\n"
                        );

                    return;

                }

            }


            /*
             * Fallback localStorage.
             */

            if (el.materialList) {

                const saved =
                    localStorage.getItem(
                        "report_checker_materials"
                    );


                if (saved) {

                    try {

                        const values =
                            JSON.parse(
                                saved
                            );


                        if (
                            Array.isArray(values)
                        ) {

                            el.materialList.value =
                                values.join(
                                    "\n"
                                );

                        }

                    }

                    catch (error) {

                        console.warn(
                            "Data material localStorage tidak valid:",
                            error
                        );

                    }

                }

            }

        }

        catch (error) {

            console.warn(
                "Gagal membaca settings:",
                error
            );

        }

    }


    function saveSettings() {

        if (!el.materialList) {

            return;

        }


        const values =
            el.materialList.value
                .split(/\r?\n/)
                .map(
                    function (item) {

                        return clean(
                            item
                        );

                    }
                )
                .filter(
                    Boolean
                );


        if (!values.length) {

            showMessage(
                "Daftar material tidak boleh kosong.",
                "error"
            );

            return;

        }


        try {

            const settings =
                window.ReportCheckerSettings;


            if (
                settings &&
                typeof settings.saveMaterials ===
                "function"
            ) {

                settings.saveMaterials(
                    values
                );

            }

            else if (
                settings &&
                typeof settings.save ===
                "function"
            ) {

                settings.save(
                    values
                );

            }

            else {

                localStorage.setItem(
                    "report_checker_materials",
                    JSON.stringify(
                        values
                    )
                );

            }


            if (
                el.settingsSavedMessage
            ) {

                el.settingsSavedMessage
                    .classList
                    .remove("hidden");


                setTimeout(
                    function () {

                        if (
                            el.settingsSavedMessage
                        ) {

                            el.settingsSavedMessage
                                .classList
                                .add("hidden");

                        }

                    },
                    2500
                );

            }


            showMessage(
                "Pengaturan material berhasil disimpan.",
                "success"
            );

        }

        catch (error) {

            console.error(
                "Save settings error:",
                error
            );


            showMessage(
                "Gagal menyimpan pengaturan.",
                "error"
            );

        }

    }


    function resetSettings() {

        try {

            const settings =
                window.ReportCheckerSettings;


            if (
                settings &&
                typeof settings.reset ===
                "function"
            ) {

                settings.reset();

            }


            loadSettings();


            showMessage(
                "Pengaturan dikembalikan ke default.",
                "success"
            );

        }

        catch (error) {

            console.error(
                "Reset settings error:",
                error
            );


            showMessage(
                "Gagal mereset pengaturan.",
                "error"
            );

        }

    }


    /* =====================================================
       EVENT: FILE INPUT
    ===================================================== */

    function bindFileInput() {

        if (!el.excelFile) {

            return;

        }


        el.excelFile.addEventListener(
            "change",
            function (event) {

                const file =
                    event.target
                        .files?.[0];


                if (file) {

                    selectFile(
                        file
                    );

                }

            }
        );

    }


    /* =====================================================
       EVENT: DROP ZONE
    ===================================================== */

    function bindDropZone() {

        if (!el.dropZone) {

            return;

        }


        el.dropZone.addEventListener(
            "click",
            function () {

                if (
                    state.processing
                ) {

                    return;

                }


                if (
                    el.excelFile
                ) {

                    el.excelFile.click();

                }

            }
        );


        el.dropZone.addEventListener(
            "keydown",
            function (event) {

                if (
                    state.processing
                ) {

                    return;

                }


                if (
                    event.key === "Enter" ||
                    event.key === " "
                ) {

                    event.preventDefault();


                    if (
                        el.excelFile
                    ) {

                        el.excelFile.click();

                    }

                }

            }
        );


        [
            "dragenter",
            "dragover"
        ].forEach(
            function (eventName) {

                el.dropZone.addEventListener(
                    eventName,
                    function (event) {

                        event.preventDefault();

                        event.stopPropagation();


                        if (
                            state.processing
                        ) {

                            return;

                        }


                        el.dropZone.classList.add(
                            "drag-over"
                        );

                    }
                );

            }
        );


        [
            "dragleave",
            "drop"
        ].forEach(
            function (eventName) {

                el.dropZone.addEventListener(
                    eventName,
                    function (event) {

                        event.preventDefault();

                        event.stopPropagation();


                        el.dropZone.classList.remove(
                            "drag-over"
                        );

                    }
                );

            }
        );


        el.dropZone.addEventListener(
            "drop",
            function (event) {

                if (
                    state.processing
                ) {

                    return;

                }


                const file =
                    event.dataTransfer
                        ?.files?.[0];


                if (file) {

                    selectFile(
                        file
                    );

                }

            }
        );

    }


    /* =====================================================
       EVENT: BUTTONS
    ===================================================== */

    function bindButtons() {

        if (el.processBtn) {

            el.processBtn.addEventListener(
                "click",
                processExcel
            );

        }


        if (el.removeFileBtn) {

            el.removeFileBtn.addEventListener(
                "click",
                clearFile
            );

        }


        if (el.resetBtn) {

            el.resetBtn.addEventListener(
                "click",
                resetApplication
            );

        }


        if (el.downloadValidBtn) {

            el.downloadValidBtn.addEventListener(
                "click",
                function () {

                    downloadResult(
                        "valid"
                    );

                }
            );

        }


        if (el.downloadInvalidBtn) {

            el.downloadInvalidBtn.addEventListener(
                "click",
                function () {

                    downloadResult(
                        "invalid"
                    );

                }
            );

        }


        if (el.downloadMaterialBtn) {

            el.downloadMaterialBtn.addEventListener(
                "click",
                function () {

                    downloadResult(
                        "material"
                    );

                }
            );

        }


        if (
            el.downloadMaterialErrorBtn
        ) {

            el.downloadMaterialErrorBtn
                .addEventListener(
                    "click",
                    function () {

                        downloadResult(
                            "material-error"
                        );

                    }
                );

        }


        /*
         * Pagination valid.
         */

        if (el.validPrevBtn) {

            el.validPrevBtn.addEventListener(
                "click",
                function () {

                    changePage(
                        "valid",
                        -1
                    );

                }
            );

        }


        if (el.validNextBtn) {

            el.validNextBtn.addEventListener(
                "click",
                function () {

                    changePage(
                        "valid",
                        1
                    );

                }
            );

        }


        /*
         * Pagination invalid.
         */

        if (el.invalidPrevBtn) {

            el.invalidPrevBtn.addEventListener(
                "click",
                function () {

                    changePage(
                        "invalid",
                        -1
                    );

                }
            );

        }


        if (el.invalidNextBtn) {

            el.invalidNextBtn.addEventListener(
                "click",
                function () {

                    changePage(
                        "invalid",
                        1
                    );

                }
            );

        }


        /*
         * Pagination material.
         */

        if (el.materialPrevBtn) {

            el.materialPrevBtn.addEventListener(
                "click",
                function () {

                    changePage(
                        "material",
                        -1
                    );

                }
            );

        }


        if (el.materialNextBtn) {

            el.materialNextBtn.addEventListener(
                "click",
                function () {

                    changePage(
                        "material",
                        1
                    );

                }
            );

        }


        /*
         * Pagination material error.
         */

        if (
            el.materialErrorPrevBtn
        ) {

            el.materialErrorPrevBtn
                .addEventListener(
                    "click",
                    function () {

                        changePage(
                            "material-error",
                            -1
                        );

                    }
                );

        }


        if (
            el.materialErrorNextBtn
        ) {

            el.materialErrorNextBtn
                .addEventListener(
                    "click",
                    function () {

                        changePage(
                            "material-error",
                            1
                        );

                    }
                );

        }


        /*
         * Settings.
         */

        if (el.saveSettingsBtn) {

            el.saveSettingsBtn.addEventListener(
                "click",
                saveSettings
            );

        }


        if (el.resetSettingsBtn) {

            el.resetSettingsBtn.addEventListener(
                "click",
                resetSettings
            );

        }

    }


    /* =====================================================
       EVENT: TABS
    ===================================================== */

    function bindTabs() {

        el.tabButtons.forEach(
            function (button) {

                button.addEventListener(
                    "click",
                    function () {

                        if (
                            state.processing
                        ) {

                            return;

                        }


                        activateTab(
                            button.dataset.tab
                        );

                    }
                );

            }
        );

    }


    /* =====================================================
       GLOBAL DRAG PROTECTION
    ===================================================== */

    function bindGlobalDragProtection() {

        [
            "dragover",
            "drop"
        ].forEach(
            function (eventName) {

                document.addEventListener(
                    eventName,
                    function (event) {

                        if (
                            !el.dropZone ||
                            !el.dropZone.contains(
                                event.target
                            )
                        ) {

                            event.preventDefault();

                        }

                    }
                );

            }
        );

    }


    /* =====================================================
       KEYBOARD SHORTCUT
    ===================================================== */

    function bindKeyboard() {

        document.addEventListener(
            "keydown",
            function (event) {

                /*
                 * Ctrl + Enter
                 * = proses Excel
                 */

                if (
                    event.ctrlKey &&
                    event.key === "Enter"
                ) {

                    event.preventDefault();


                    if (
                        state.file &&
                        !state.processing
                    ) {

                        processExcel();

                    }

                }


                /*
                 * Escape
                 * = kembali ke tab valid
                 */

                if (
                    event.key === "Escape" &&
                    state.result &&
                    !state.processing
                ) {

                    activateTab(
                        "valid"
                    );

                }

            }
        );

    }


    /* =====================================================
       INITIALIZE
    ===================================================== */

    function init() {

        cacheDOM();


        bindFileInput();

        bindDropZone();

        bindButtons();

        bindTabs();

        bindGlobalDragProtection();

        bindKeyboard();


        loadSettings();


        hideDashboard();

        hideProcessing();


        setSystemStatus(
            "Ready",
            "offline"
        );


        updateProgress(
            0
        );


        updateDownloadButtons();


        console.log(
            "Report Checker initialized."
        );

    }


    /* =====================================================
       START
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
       PUBLIC API
    ===================================================== */

    window.ReportCheckerApp = {

        process:
            processExcel,

        reset:
            resetApplication,

        selectFile:
            selectFile,

        clearFile:
            clearFile,

        activateTab:
            activateTab,

        getState:
            function () {

                return {

                    file:
                        state.file,

                    result:
                        state.result,

                    processing:
                        state.processing,

                    currentTab:
                        state.currentTab,

                    pages:
                        {
                            ...state.pages
                        }

                };

            }

    };


})();
