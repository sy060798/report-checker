/* =========================================================
   REPORT CHECKER - APP.JS
   Controller utama UI
   Cocok dengan index.html versi terbaru

   UPDATE:
   - Ticket menggunakan TT Number
   - Customer Ticket / Ref Ticket bukan prioritas
   - Fallback TT Number tetap tersedia
   - Material tidak dihapus / tidak difilter oleh app.js
   - Menambahkan proteksi double processing
   - Status processing lebih jelas
   - Error handling load Excel diperbaiki
   - UI tidak dibuat menunggu proses tambahan
========================================================= */

(function () {

    "use strict";


    /* =====================================================
       STATE
    ===================================================== */

    const state = {

        activeTab: "valid",

        search: "",

        page: 1,

        pageSize: 25,

        initialized: false,

        processing: false

    };


    /* =====================================================
       HELPER
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


    function escapeHtml(value) {

        return String(
            value ?? ""
        )
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


    function number(value) {

        return new Intl.NumberFormat(
            "id-ID"
        ).format(
            Number(value) || 0
        );

    }


    function setText(
        selector,
        value
    ) {

        const element =
            $(selector);

        if (element) {

            element.textContent =
                value ?? "";

        }

    }


    function show(
        element,
        visible
    ) {

        if (!element) return;

        element.classList.toggle(
            "hidden",
            !visible
        );

    }


    /* =====================================================
       APPLICATION DATA
    ===================================================== */

    function getData() {

        if (
            window.ReportCheckerExcel &&
            typeof window
                .ReportCheckerExcel
                .getState === "function"
        ) {

            return (
                window
                    .ReportCheckerExcel
                    .getState() ||
                {}
            );

        }


        return {

            rows: [],

            validationResults: [],

            sesuai: [],

            tidakSesuai: [],

            invalid: [],

            materials: [],

            materialError: [],

            materialNotFound: [],

            summary: {

                total: 0,

                sesuai: 0,

                tidakSesuai: 0,

                invalid: 0,

                material: 0,

                materialError: 0

            }

        };

    }


    /* =====================================================
       SYSTEM STATUS
    ===================================================== */

    function setSystemStatus(
        text,
        type = "ready"
    ) {

        const element =
            $("#systemStatus");

        if (!element) return;

        element.textContent =
            text;

        element.className =
            "status-badge " +
            type;

    }


    /* =====================================================
       PROCESSING STATUS
    ===================================================== */

    function processing(
        visible,
        text = "Membaca data Excel..."
    ) {

        const box =
            $("#processingStatus");

        const message =
            $("#processingText");

        if (box) {

            box.classList.toggle(
                "hidden",
                !visible
            );

        }

        if (message) {

            message.textContent =
                text;

        }

    }


    /* =====================================================
       FILE INPUT
    ===================================================== */

    function setupFileInput() {

        const input =
            $("#excelFile");

        if (!input) return;


        input.addEventListener(
            "change",
            function () {

                const file =
                    input.files &&
                    input.files[0];


                if (!file) {

                    clearSelectedFile();

                    return;

                }


                if (
                    !isExcelFile(file)
                ) {

                    alert(
                        "File harus Excel (.xlsx, .xls, atau .xlsm)."
                    );

                    clearSelectedFile();

                    return;

                }


                setSelectedFile(
                    file
                );

            }
        );

    }


    function setSelectedFile(
        file
    ) {

        const selected =
            $("#selectedFile");

        const fileName =
            $("#fileName");

        const fileSize =
            $("#fileSize");

        const processBtn =
            $("#processBtn");


        if (fileName) {

            fileName.textContent =
                file.name;

        }


        if (fileSize) {

            fileSize.textContent =
                formatFileSize(
                    file.size
                );

        }


        if (selected) {

            selected.classList.remove(
                "hidden"
            );

        }


        if (processBtn) {

            processBtn.disabled =
                state.processing;

        }

    }


    function clearSelectedFile() {

        const selected =
            $("#selectedFile");

        const fileName =
            $("#fileName");

        const fileSize =
            $("#fileSize");

        const processBtn =
            $("#processBtn");

        const input =
            $("#excelFile");


        if (input) {

            input.value =
                "";

        }


        if (fileName) {

            fileName.textContent =
                "-";

        }


        if (fileSize) {

            fileSize.textContent =
                "-";

        }


        if (selected) {

            selected.classList.add(
                "hidden"
            );

        }


        if (processBtn) {

            processBtn.disabled =
                true;

        }

    }


    function formatFileSize(
        bytes
    ) {

        if (!bytes) {

            return "0 KB";

        }


        const units = [

            "B",
            "KB",
            "MB",
            "GB"

        ];


        let size =
            bytes;

        let index =
            0;


        while (
            size >= 1024 &&
            index <
                units.length - 1
        ) {

            size /=
                1024;

            index++;

        }


        return (

            size.toFixed(
                index === 0
                    ? 0
                    : 2
            ) +

            " " +

            units[index]

        );

    }


    /* =====================================================
       REMOVE FILE
    ===================================================== */

    function setupRemoveFile() {

        const button =
            $("#removeFileBtn");

        if (!button) return;


        button.addEventListener(
            "click",
            function () {

                if (
                    state.processing
                ) {

                    return;

                }


                clearSelectedFile();

                resetApplicationData();


                show(
                    $("#dashboardSection"),
                    false
                );


                setSystemStatus(
                    "Ready",
                    "offline"
                );

            }
        );

    }


    /* =====================================================
       DROP ZONE
    ===================================================== */

    function setupDropZone() {

        const zone =
            $("#dropZone");

        const input =
            $("#excelFile");


        if (
            !zone ||
            !input
        ) {

            return;

        }


        zone.addEventListener(
            "dragover",
            function (event) {

                event.preventDefault();

                zone.classList.add(
                    "dragging"
                );

            }
        );


        zone.addEventListener(
            "dragleave",
            function () {

                zone.classList.remove(
                    "dragging"
                );

            }
        );


        zone.addEventListener(
            "drop",
            function (event) {

                event.preventDefault();

                zone.classList.remove(
                    "dragging"
                );


                if (
                    state.processing
                ) {

                    return;

                }


                const file =
                    event
                        .dataTransfer
                        ?.files?.[0];


                if (!file) {

                    return;

                }


                if (
                    !isExcelFile(file)
                ) {

                    alert(
                        "File harus Excel (.xlsx, .xls, atau .xlsm)."
                    );

                    return;

                }


                try {

                    const dataTransfer =
                        new DataTransfer();


                    dataTransfer.items.add(
                        file
                    );


                    input.files =
                        dataTransfer.files;

                } catch (error) {

                    console.warn(
                        "DataTransfer tidak tersedia.",
                        error
                    );

                }


                setSelectedFile(
                    file
                );

            }
        );


        zone.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key === "Enter" ||
                    event.key === " "
                ) {

                    event.preventDefault();

                    input.click();

                }

            }
        );

    }


    function isExcelFile(
        file
    ) {

        const name =
            String(
                file?.name || ""
            ).toLowerCase();


        return (

            name.endsWith(
                ".xlsx"
            ) ||

            name.endsWith(
                ".xls"
            ) ||

            name.endsWith(
                ".xlsm"
            )

        );

    }


    /* =====================================================
       PROCESS EXCEL
    ===================================================== */

    function setupProcessButton() {

        const button =
            $("#processBtn");

        const input =
            $("#excelFile");


        if (
            !button ||
            !input
        ) {

            return;

        }


        button.addEventListener(
            "click",
            async function () {

                if (
                    state.processing
                ) {

                    return;

                }


                const file =
                    input.files?.[0];


                if (!file) {

                    alert(
                        "Silakan pilih file Excel terlebih dahulu."
                    );

                    return;

                }


                await processExcel(
                    file
                );

            }
        );

    }


    /* =====================================================
       PROCESS EXCEL
    ===================================================== */

    async function processExcel(
        file
    ) {

        const button =
            $("#processBtn");


        /*
         * Proteksi agar user tidak bisa
         * menjalankan parser berkali-kali.
         */

        if (
            state.processing
        ) {

            return;

        }


        state.processing =
            true;


        try {

            if (button) {

                button.disabled =
                    true;

            }


            processing(
                true,
                "Membaca workbook Excel..."
            );


            setSystemStatus(
                "Processing",
                "processing"
            );


            /*
             * Pastikan excel.js sudah tersedia.
             */

            if (
                !window.ReportCheckerExcel
            ) {

                throw new Error(
                    "excel.js belum berhasil dimuat. Periksa path <script> pada index.html."
                );

            }


            if (
                typeof window
                    .ReportCheckerExcel
                    .load !== "function"
            ) {

                throw new Error(
                    "Fungsi load() belum tersedia di excel.js."
                );

            }


            /*
             * Validasi file sebelum dikirim
             * ke parser.
             */

            if (
                !isExcelFile(file)
            ) {

                throw new Error(
                    "Format file tidak didukung."
                );

            }


            processing(
                true,
                "Memproses data Excel..."
            );


            /*
             * Penting:
             *
             * Jangan menggunakan setInterval /
             * polling / loop tambahan di app.js.
             *
             * Parser excel.js yang mengerjakan
             * pembacaan workbook.
             */

            const result =
                await window
                    .ReportCheckerExcel
                    .load(
                        file
                    );


            /*
             * Setelah load selesai,
             * langsung update dashboard.
             */

            state.page =
                1;

            state.search =
                "";


            show(
                $("#dashboardSection"),
                true
            );


            updateDashboard();


            setSystemStatus(
                "Ready",
                "online"
            );


            processing(
                false
            );


            setText(
                "#resultSummary",
                buildSummaryText(
                    result
                )
            );


        } catch (error) {

            console.error(
                "Report Checker Error:",
                error
            );


            processing(
                false
            );


            setSystemStatus(
                "Error",
                "offline"
            );


            /*
             * Jangan menyembunyikan error asli.
             * Ini penting untuk mengetahui apakah
             * masalah berasal dari excel.js,
             * XLSX library, atau parser material.
             */

            const message =
                error?.message ||
                "Gagal memproses file Excel.";


            alert(
                "Gagal memproses file Excel.\n\n" +
                message
            );


        } finally {

            state.processing =
                false;


            if (button) {

                const input =
                    $("#excelFile");

                button.disabled =
                    !input?.files?.[0];

            }

        }

    }


    /* =====================================================
       SUMMARY
    ===================================================== */

    function buildSummaryText(
        result
    ) {

        const summary =
            result?.summary ||
            getData().summary ||
            {};


        return (

            "Total " +
            number(
                summary.total || 0
            ) +

            " data • " +

            "Sesuai " +
            number(
                summary.sesuai || 0
            ) +

            " • " +

            "Tidak Sesuai " +
            number(
                summary.tidakSesuai || 0
            ) +

            " • " +

            "Material " +
            number(
                summary.material || 0
            )

        );

    }


    /* =====================================================
       DASHBOARD
    ===================================================== */

    function updateDashboard() {

        const data =
            getData();


        const summary =
            data.summary || {};


        const total =
            summary.total ??
            data.validationResults?.length ??
            data.rows?.length ??
            0;


        const sesuai =
            summary.sesuai ??
            data.sesuai?.length ??
            0;


        const tidakSesuai =
            summary.tidakSesuai ??
            data.tidakSesuai?.length ??
            0;


        const material =
            summary.material ??
            data.materials?.length ??
            0;


        const materialError =
            summary.materialError ??
            data.materialError?.length ??
            data.materialNotFound?.length ??
            0;


        setText(
            "#totalCount",
            number(total)
        );


        setText(
            "#validCount",
            number(sesuai)
        );


        setText(
            "#invalidCount",
            number(tidakSesuai)
        );


        setText(
            "#materialCount",
            number(material)
        );


        setText(
            "#materialErrorCount",
            number(materialError)
        );


        setText(
            "#validTabCount",
            number(sesuai)
        );


        setText(
            "#invalidTabCount",
            number(tidakSesuai)
        );


        setText(
            "#materialTabCount",
            number(material)
        );


        setText(
            "#materialErrorTabCount",
            number(materialError)
        );


        renderValidTable();

        renderInvalidTable();

        renderMaterialTable();

        renderMaterialErrorTable();

        updateDownloadButtons();

    }


    /* =====================================================
       DATA NORMALIZATION
    ===================================================== */

    function getValidRows() {

        const data =
            getData();


        return (

            data.sesuai ||

            data.valid ||

            []

        );

    }


    function getInvalidRows() {

        const data =
            getData();


        return (

            data.tidakSesuai ||

            data.invalid ||

            []

        );

    }


    function getMaterialRows() {

        const data =
            getData();


        /*
         * Jangan melakukan filter material
         * di app.js.
         *
         * Semua material hasil parser
         * tetap ditampilkan.
         */

        return (

            data.materials ||

            data.material ||

            []

        );

    }


    function getMaterialErrorRows() {

        const data =
            getData();


        return (

            data.materialError ||

            data.materialNotFound ||

            []

        );

    }


    function getValue(
        row,
        keys
    ) {

        for (
            const key of keys
        ) {

            if (

                row &&

                row[key] !==
                    undefined &&

                row[key] !==
                    null &&

                String(
                    row[key]
                ).trim() !== ""

            ) {

                return row[key];

            }

        }


        return "";

    }


    /* =====================================================
       GET TT NUMBER
       
       PRIORITAS:
       1. ttNumber
       2. TT Number
       3. tt_number
       4. TTNumber
       5. ticketNumber
       6. originalRow/source

       Customer Ticket dan Ref Ticket
       tidak digunakan sebagai prioritas.
    ===================================================== */

    function getTicketNumber(
        row
    ) {

        const original =
            row?.originalRow ||
            row?.source ||
            {};


        /*
         * TT Number dari hasil parser.
         */

        const direct =
            getValue(
                row,
                [

                    "ttNumber",

                    "TT Number",

                    "TT number",

                    "tt_number",

                    "TTNumber",

                    "ticketNumber",

                    "Ticket Number"

                ]
            );


        if (
            direct
        ) {

            return String(
                direct
            ).trim();

        }


        /*
         * TT Number dari original row.
         */

        const originalTicket =
            getValue(
                original,
                [

                    "TT Number",

                    "TT number",

                    "ttNumber",

                    "tt_number",

                    "TTNumber",

                    "ticketNumber",

                    "Ticket Number"

                ]
            );


        if (
            originalTicket
        ) {

            return String(
                originalTicket
            ).trim();

        }


        return "-";

    }


    /* =====================================================
       TABLE VALID
    ===================================================== */

    function renderValidTable() {

        const tbody =
            $("#validTableBody");

        const empty =
            $("#validEmpty");


        if (!tbody) return;


        const rows =
            filterRows(
                getValidRows()
            );


        tbody.innerHTML =
            "";


        if (!rows.length) {

            show(
                empty,
                true
            );

            return;

        }


        show(
            empty,
            false
        );


        rows.forEach(
            function (row) {

                const ticket =
                    getTicketNumber(
                        row
                    );


                const original =
                    row.originalRow ||
                    row.source ||
                    {};


                const receive =
                    getValue(
                        row,
                        [

                            "receiveDateFormatted",

                            "receiveDate",

                            "datetimeReceive"

                        ]
                    ) ||

                    getValue(
                        original,
                        [

                            "Datetime Receive"

                        ]
                    );


                const release =
                    getValue(
                        row,
                        [

                            "releaseDateTime",

                            "release",

                            "ttRelease"

                        ]
                    );


                const reason =
                    getValue(
                        row,
                        [

                            "reason",

                            "message",

                            "keterangan"

                        ]
                    ) ||

                    "Tanggal Release sesuai.";


                tbody.insertAdjacentHTML(
                    "beforeend",
                    `
                    <tr>
                        <td>${escapeHtml(ticket)}</td>
                        <td>${escapeHtml(receive || "-")}</td>
                        <td>${escapeHtml(release || "-")}</td>
                        <td>
                            <span class="badge badge-success">
                                SESUAI
                            </span>
                        </td>
                        <td>${escapeHtml(reason)}</td>
                    </tr>
                    `
                );

            }
        );

    }


    /* =====================================================
       TABLE INVALID
    ===================================================== */

    function renderInvalidTable() {

        const tbody =
            $("#invalidTableBody");

        const empty =
            $("#invalidEmpty");


        if (!tbody) return;


        const rows =
            filterRows(
                getInvalidRows()
            );


        tbody.innerHTML =
            "";


        if (!rows.length) {

            show(
                empty,
                true
            );

            return;

        }


        show(
            empty,
            false
        );


        rows.forEach(
            function (row) {

                const ticket =
                    getTicketNumber(
                        row
                    );


                const original =
                    row.originalRow ||
                    row.source ||
                    {};


                const receive =
                    getValue(
                        row,
                        [

                            "receiveDateFormatted",

                            "receiveDate",

                            "datetimeReceive"

                        ]
                    ) ||

                    getValue(
                        original,
                        [

                            "Datetime Receive"

                        ]
                    );


                const release =
                    getValue(
                        row,
                        [

                            "releaseDateTime",

                            "release",

                            "ttRelease"

                        ]
                    );


                const reason =
                    getValue(
                        row,
                        [

                            "reason",

                            "message",

                            "keterangan"

                        ]
                    ) ||

                    "Tanggal Release tidak sesuai.";


                tbody.insertAdjacentHTML(
                    "beforeend",
                    `
                    <tr>
                        <td>${escapeHtml(ticket)}</td>
                        <td>${escapeHtml(receive || "-")}</td>
                        <td>${escapeHtml(release || "-")}</td>
                        <td>
                            <span class="badge badge-danger">
                                TIDAK SESUAI
                            </span>
                        </td>
                        <td>${escapeHtml(reason)}</td>
                    </tr>
                    `
                );

            }
        );

    }


    /* =====================================================
       TABLE MATERIAL
    ===================================================== */

    function renderMaterialTable() {

        const tbody =
            $("#materialTableBody");

        const empty =
            $("#materialEmpty");


        if (!tbody) return;


        /*
         * Ambil SEMUA material dari excel.js.
         *
         * App.js tidak melakukan:
         * - whitelist material
         * - blacklist material
         * - fuzzy matching
         * - menghapus material
         *
         * Itu harus dilakukan di parser material.
         */

        const rows =
            filterRows(
                getMaterialRows()
            );


        tbody.innerHTML =
            "";


        if (!rows.length) {

            show(
                empty,
                true
            );

            return;

        }


        show(
            empty,
            false
        );


        rows.forEach(
            function (row) {

                const ticket =
                    getTicketNumber(
                        row
                    );


                const material =
                    getValue(
                        row,
                        [

                            "material",

                            "Material",

                            "name",

                            "materialName",

                            "Material Name"

                        ]
                    );


                const qty =
                    getValue(
                        row,
                        [

                            "quantity",

                            "qty",

                            "Qty",

                            "Quantity"

                        ]
                    );


                const unit =
                    getValue(
                        row,
                        [

                            "unit",

                            "satuan",

                            "Unit",

                            "Satuan"

                        ]
                    );


                const code =
                    getValue(
                        row,
                        [

                            "code",

                            "kode",

                            "Kode",

                            "materialCode",

                            "Material Code"

                        ]
                    );


                tbody.insertAdjacentHTML(
                    "beforeend",
                    `
                    <tr>
                        <td>${escapeHtml(ticket)}</td>
                        <td>${escapeHtml(material || "-")}</td>
                        <td>${escapeHtml(qty || "-")}</td>
                        <td>${escapeHtml(unit || "-")}</td>
                        <td>${escapeHtml(code || "-")}</td>
                    </tr>
                    `
                );

            }
        );

    }


    /* =====================================================
       TABLE MATERIAL ERROR
    ===================================================== */

    function renderMaterialErrorTable() {

        const tbody =
            $("#materialErrorTableBody");

        const empty =
            $("#materialErrorEmpty");


        if (!tbody) return;


        const rows =
            filterRows(
                getMaterialErrorRows()
            );


        tbody.innerHTML =
            "";


        if (!rows.length) {

            show(
                empty,
                true
            );

            return;

        }


        show(
            empty,
            false
        );


        rows.forEach(
            function (row) {

                const ticket =
                    getTicketNumber(
                        row
                    );


                const material =
                    getValue(
                        row,
                        [

                            "material",

                            "Material",

                            "raw",

                            "originalMaterial",

                            "materialName"

                        ]
                    );


                const qty =
                    getValue(
                        row,
                        [

                            "quantity",

                            "qty",

                            "Qty",

                            "Quantity"

                        ]
                    );


                const unit =
                    getValue(
                        row,
                        [

                            "unit",

                            "satuan",

                            "Unit",

                            "Satuan"

                        ]
                    );


                const code =
                    getValue(
                        row,
                        [

                            "code",

                            "kode",

                            "Kode",

                            "materialCode",

                            "Material Code"

                        ]
                    );


                const error =
                    getValue(
                        row,
                        [

                            "error",

                            "reason",

                            "message",

                            "keterangan"

                        ]
                    ) ||

                    "Material gagal diproses.";


                tbody.insertAdjacentHTML(
                    "beforeend",
                    `
                    <tr>
                        <td>${escapeHtml(ticket)}</td>
                        <td>${escapeHtml(material || "-")}</td>
                        <td>${escapeHtml(qty || "-")}</td>
                        <td>${escapeHtml(unit || "-")}</td>
                        <td>${escapeHtml(code || "-")}</td>
                        <td>${escapeHtml(error)}</td>
                    </tr>
                    `
                );

            }
        );

    }


    /* =====================================================
       FILTER
    ===================================================== */

    function filterRows(
        rows
    ) {

        if (
            !Array.isArray(rows)
        ) {

            return [];

        }


        const query =
            state.search
                .trim()
                .toLowerCase();


        if (!query) {

            return rows;

        }


        return rows.filter(
            function (row) {

                return Object
                    .values(
                        row || {}
                    )
                    .some(
                        function (value) {

                            return String(
                                value ?? ""
                            )
                                .toLowerCase()
                                .includes(
                                    query
                                );

                        }
                    );

            }
        );

    }


    /* =====================================================
       SEARCH
    ===================================================== */

    function setupSearch() {

        const input =
            $("#searchInput") ||
            $("#globalSearch") ||
            $("#search");


        if (!input) {

            return;

        }


        input.addEventListener(
            "input",
            function () {

                state.search =
                    input.value || "";


                state.page =
                    1;


                updateDashboard();

            }
        );

    }


    /* =====================================================
       TABS
    ===================================================== */

    function setupTabs() {

        $$(
            "[data-tab]"
        ).forEach(
            function (button) {

                button.addEventListener(
                    "click",
                    function () {

                        const tab =
                            button.getAttribute(
                                "data-tab"
                            );


                        state.activeTab =
                            tab;


                        updateTabs();

                    }
                );

            }
        );

    }


    function updateTabs() {

        $$(
            ".tab-button"
        ).forEach(
            function (button) {

                const active =
                    button.getAttribute(
                        "data-tab"
                    ) ===
                    state.activeTab;


                button.classList.toggle(
                    "active",
                    active
                );

            }
        );


        $$(".tab-content")
            .forEach(
                function (content) {

                    const id =
                        content.id ||
                        "";


                    const tabName =
                        id.replace(
                            "tab-",
                            ""
                        );


                    content.classList.toggle(
                        "active",
                        tabName ===
                        state.activeTab
                    );

                }
            );

    }


    /* =====================================================
       DOWNLOAD
    ===================================================== */

    function setupDownloads() {

        bindDownload(
            "#downloadValidBtn",
            "valid"
        );


        bindDownload(
            "#downloadInvalidBtn",
            "invalid"
        );


        bindDownload(
            "#downloadMaterialBtn",
            "material"
        );


        bindDownload(
            "#downloadMaterialErrorBtn",
            "material-error"
        );

    }


    function bindDownload(
        selector,
        type
    ) {

        const button =
            $(selector);


        if (!button) return;


        button.addEventListener(
            "click",
            function () {

                downloadResult(
                    type
                );

            }
        );

    }


    function downloadResult(
        type
    ) {

        if (
            !window.ReportCheckerExcel
        ) {

            alert(
                "excel.js belum tersedia."
            );

            return;

        }


        const excel =
            window.ReportCheckerExcel;


        try {

            if (
                typeof excel.exportResult ===
                "function"
            ) {

                excel.exportResult(
                    type
                );

                return;

            }


            if (
                typeof excel.exportExcel ===
                "function"
            ) {

                excel.exportExcel(
                    type
                );

                return;

            }


            fallbackExport(
                type
            );

        } catch (error) {

            console.error(
                "Export error:",
                error
            );


            alert(
                error?.message ||
                "Gagal membuat file Excel."
            );

        }

    }


    function fallbackExport(
        type
    ) {

        if (
            typeof XLSX ===
            "undefined"
        ) {

            throw new Error(
                "Library XLSX belum dimuat."
            );

        }


        let rows = [];

        let filename =
            "Report_Checker.xlsx";


        if (
            type === "valid"
        ) {

            rows =
                getValidRows();

            filename =
                "Sesuai.xlsx";

        }


        else if (
            type === "invalid"
        ) {

            rows =
                getInvalidRows();

            filename =
                "Tidak_Sesuai.xlsx";

        }


        else if (
            type === "material"
        ) {

            rows =
                getMaterialRows();

            filename =
                "Material.xlsx";

        }


        else if (
            type === "material-error"
        ) {

            rows =
                getMaterialErrorRows();

            filename =
                "Material_Error.xlsx";

        }


        const cleanRows =
            rows.map(
                function (row) {

                    const copy = {
                        ...row
                    };


                    delete copy.originalRow;

                    delete copy.source;


                    return copy;

                }
            );


        const worksheet =
            XLSX.utils.json_to_sheet(
                cleanRows
            );


        const workbook =
            XLSX.utils.book_new();


        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            "Data"
        );


        XLSX.writeFile(
            workbook,
            filename
        );

    }


    function updateDownloadButtons() {

        const valid =
            getValidRows();

        const invalid =
            getInvalidRows();

        const material =
            getMaterialRows();

        const materialError =
            getMaterialErrorRows();


        setButtonState(
            "#downloadValidBtn",
            valid.length > 0
        );


        setButtonState(
            "#downloadInvalidBtn",
            invalid.length > 0
        );


        setButtonState(
            "#downloadMaterialBtn",
            material.length > 0
        );


        setButtonState(
            "#downloadMaterialErrorBtn",
            materialError.length > 0
        );

    }


    function setButtonState(
        selector,
        enabled
    ) {

        const button =
            $(selector);


        if (!button) return;


        button.disabled =
            !enabled;

    }


    /* =====================================================
       SETTINGS
    ===================================================== */

    function setupSettings() {

        const toggle =
            $("#toggleSettingsBtn");

        const panel =
            $("#settingsPanel");


        if (
            toggle &&
            panel
        ) {

            toggle.addEventListener(
                "click",
                function () {

                    panel.classList.toggle(
                        "hidden"
                    );


                    toggle.textContent =
                        panel.classList.contains(
                            "hidden"
                        )

                            ? "Buka Pengaturan"

                            : "Tutup Pengaturan";

                }
            );

        }


        const save =
            $("#saveSettingsBtn");


        if (save) {

            save.addEventListener(
                "click",
                function () {

                    saveParserSettings();

                }
            );

        }


        const reset =
            $("#resetSettingsBtn");


        if (reset) {

            reset.addEventListener(
                "click",
                function () {

                    resetParserSettings();

                }
            );

        }


        loadParserSettings();

    }


    function saveParserSettings() {

        if (

            window.ReportCheckerSettings &&

            typeof window
                .ReportCheckerSettings
                .saveFromUI ===
                "function"

        ) {

            window
                .ReportCheckerSettings
                .saveFromUI();

        } else {

            saveSettingsFallback();

        }


        const message =
            $("#settingsSavedMessage");


        if (message) {

            message.classList.remove(
                "hidden"
            );


            setTimeout(
                function () {

                    message.classList.add(
                        "hidden"
                    );

                },
                2000
            );

        }

    }


    function saveSettingsFallback() {

        const settings = {

            materialStartPhrases:
                readTextarea(
                    "#materialStartPhrases"
                ),

            materialEndPhrases:
                readTextarea(
                    "#materialEndPhrases"
                ),

            releasePhrases:
                readTextarea(
                    "#releasePhrases"
                ),

            notFoundPhrases:
                readTextarea(
                    "#notFoundPhrases"
                ),

            validationType:
                $("#validationType")
                    ?.value ||
                "release-after-receive",

            maxReleaseMinutes:
                Number(
                    $("#maxReleaseMinutes")
                        ?.value ||
                    0
                )

        };


        localStorage.setItem(
            "reportCheckerSettings",
            JSON.stringify(
                settings
            )
        );

    }


    function readTextarea(
        selector
    ) {

        const element =
            $(selector);


        if (!element) {

            return [];

        }


        return element.value
            .split("\n")
            .map(
                value =>
                    value.trim()
            )
            .filter(Boolean);

    }


    function loadParserSettings() {

        if (

            window.ReportCheckerSettings &&

            typeof window
                .ReportCheckerSettings
                .loadToUI ===
                "function"

        ) {

            window
                .ReportCheckerSettings
                .loadToUI();

            return;

        }


        try {

            const raw =
                localStorage.getItem(
                    "reportCheckerSettings"
                );


            if (!raw) {

                return;

            }


            const settings =
                JSON.parse(
                    raw
                );


            writeTextarea(
                "#materialStartPhrases",
                settings
                    .materialStartPhrases
            );


            writeTextarea(
                "#materialEndPhrases",
                settings
                    .materialEndPhrases
            );


            writeTextarea(
                "#releasePhrases",
                settings
                    .releasePhrases
            );


            writeTextarea(
                "#notFoundPhrases",
                settings
                    .notFoundPhrases
            );


            if (

                $("#validationType") &&

                settings.validationType

            ) {

                $("#validationType")
                    .value =
                    settings.validationType;

            }


            if (

                $("#maxReleaseMinutes") &&

                settings.maxReleaseMinutes !==
                    undefined

            ) {

                $("#maxReleaseMinutes")
                    .value =
                    settings.maxReleaseMinutes;

            }

        } catch (error) {

            console.warn(
                "Gagal membaca settings.",
                error
            );

        }

    }


    function writeTextarea(
        selector,
        values
    ) {

        const element =
            $(selector);


        if (!element) return;


        if (
            Array.isArray(values)
        ) {

            element.value =
                values.join(
                    "\n"
                );

        }

    }


    function resetParserSettings() {

        if (

            window.ReportCheckerSettings &&

            typeof window
                .ReportCheckerSettings
                .reset ===
                "function"

        ) {

            window
                .ReportCheckerSettings
                .reset();


            loadParserSettings();

            return;

        }


        localStorage.removeItem(
            "reportCheckerSettings"
        );


        location.reload();

    }


    /* =====================================================
       RESET APPLICATION
    ===================================================== */

    function setupReset() {

        const button =
            $("#resetBtn");


        if (!button) return;


        button.addEventListener(
            "click",
            function () {

                if (
                    state.processing
                ) {

                    return;

                }


                resetApplicationData();

                clearSelectedFile();


                show(
                    $("#dashboardSection"),
                    false
                );


                state.activeTab =
                    "valid";


                state.search =
                    "";


                updateTabs();


                setSystemStatus(
                    "Ready",
                    "offline"
                );

            }
        );

    }


    function resetApplicationData() {

        if (

            window.ReportCheckerExcel &&

            typeof window
                .ReportCheckerExcel
                .reset ===
                "function"

        ) {

            window
                .ReportCheckerExcel
                .reset();

        }


        clearTables();

        updateDashboard();

    }


    function clearTables() {

        const ids = [

            "#validTableBody",

            "#invalidTableBody",

            "#materialTableBody",

            "#materialErrorTableBody"

        ];


        ids.forEach(
            function (selector) {

                const element =
                    $(selector);


                if (element) {

                    element.innerHTML =
                        "";

                }

            }
        );

    }


    /* =====================================================
       INITIAL RENDER
    ===================================================== */

    function initializeEmptyState() {

        updateDashboard();


        show(
            $("#dashboardSection"),
            false
        );


        setSystemStatus(
            "Ready",
            "offline"
        );


        updateTabs();

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


        setupFileInput();

        setupRemoveFile();

        setupDropZone();

        setupProcessButton();

        setupSearch();

        setupTabs();

        setupDownloads();

        setupSettings();

        setupReset();

        initializeEmptyState();


        state.initialized =
            true;


        console.log(
            "Report Checker initialized."
        );

    }


    /* =====================================================
       PUBLIC API
    ===================================================== */

    window.ReportCheckerApp = {

        init,

        processExcel,

        render:
            updateDashboard,

        getState:
            function () {

                return {
                    ...state
                };

            }

    };


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

    } else {

        init();

    }


})();
