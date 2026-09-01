/* =========================================================
   REPORT CHECKER - APP.JS
   Controller utama UI
   Cocok dengan index.html versi terbaru

   UPDATE:
   - Ticket menggunakan TT Number
   - Tidak memprioritaskan Customer Ticket / Ref Ticket
   - Mendukung beberapa nama field TT Number
   - Material tetap ditampilkan
   - Material Error tetap ditampilkan
   - Tidak mengubah sistem result lama
   - Aman jika field tertentu tidak tersedia
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

        initialized: false

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

        if (!element) {

            return;

        }


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
                .getState ===
                "function"

        ) {

            return window
                .ReportCheckerExcel
                .getState();

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

        if (!element) {

            return;

        }


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

        if (!input) {

            return;

        }


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


                if (!isExcelFile(file)) {

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
                false;

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
            )

            +

            " "

            +

            units[index]

        );

    }


    /* =====================================================
       REMOVE FILE
    ===================================================== */

    function setupRemoveFile() {

        const button =
            $("#removeFileBtn");

        if (!button) {

            return;

        }


        button.addEventListener(
            "click",
            function () {

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


        if (!zone || !input) {

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


                const file =
                    event
                        .dataTransfer
                        ?.files?.[0];


                if (!file) {

                    return;

                }


                if (!isExcelFile(file)) {

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

                    event.key ===
                        "Enter" ||

                    event.key ===
                        " "

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
            )
                .toLowerCase();


        return (

            name.endsWith(
                ".xlsx"
            )

            ||

            name.endsWith(
                ".xls"
            )

            ||

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


        if (!button || !input) {

            return;

        }


        button.addEventListener(
            "click",
            async function () {

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


    async function processExcel(
        file
    ) {

        const button =
            $("#processBtn");


        try {

            if (!file) {

                throw new Error(
                    "File Excel tidak ditemukan."
                );

            }


            if (!isExcelFile(file)) {

                throw new Error(
                    "File harus Excel (.xlsx, .xls, atau .xlsm)."
                );

            }


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


            if (
                !window.ReportCheckerExcel
            ) {

                throw new Error(
                    "excel.js belum berhasil dimuat."
                );

            }


            if (

                typeof window
                    .ReportCheckerExcel
                    .load !==
                "function"

            ) {

                throw new Error(
                    "Fungsi load() belum tersedia di excel.js."
                );

            }


            processing(
                true,
                "Membaca data Excel..."
            );


            /*
             * Beri kesempatan browser memperbarui
             * tampilan processing sebelum proses
             * Excel yang berat dijalankan.
             */

            await yieldToBrowser();


            const result =
                await window
                    .ReportCheckerExcel
                    .load(
                        file
                    );


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


            alert(
                error?.message ||
                "Gagal memproses file Excel."
            );


        } finally {

            if (button) {

                button.disabled =
                    false;

            }

        }

    }


    function yieldToBrowser() {

        return new Promise(
            function (resolve) {

                setTimeout(
                    resolve,
                    0
                );

            }
        );

    }


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
                summary.total ||
                0
            )

            +

            " data • " +

            "Sesuai " +

            number(
                summary.sesuai ||
                0
            )

            +

            " • " +

            "Tidak Sesuai " +

            number(
                summary.tidakSesuai ||
                0
            )

            +

            " • " +

            "Material " +

            number(
                summary.material ||
                0
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

        if (!row) {

            return "";

        }


        for (
            const key of keys
        ) {

            if (

                row[key] !==
                    undefined &&

                row[key] !==
                    null &&

                String(
                    row[key]
                ).trim() !==
                    ""

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
       3. TT_Number
       4. TTNumber
       5. ticketNumber
       6. ticket
       7. nomorTT
       8. noTT
       
       Kemudian cek originalRow/source.
       
       Customer Ticket / Ref Ticket TIDAK digunakan.
    ===================================================== */

    function getTicketNumber(
        row
    ) {

        const original =
            row?.originalRow ||
            row?.source ||
            row?.rowData ||
            row?.data ||
            {};


        const ticketKeys = [

            "ttNumber",

            "TT Number",

            "TT_Number",

            "tt_number",

            "TTNumber",

            "TTNUMBER",

            "ttnumber",

            "ticketNumber",

            "Ticket Number",

            "TicketNumber",

            "ticket_number",

            "ticket",

            "Ticket",

            "nomorTT",

            "Nomor TT",

            "noTT",

            "No TT",

            "No. TT",

            "TT No",

            "TT No.",

            "TT_NO"

        ];


        let ticket =
            getValue(
                row,
                ticketKeys
            );


        if (
            ticket !== ""
        ) {

            return String(
                ticket
            ).trim();

        }


        ticket =
            getValue(
                original,
                ticketKeys
            );


        if (
            ticket !== ""
        ) {

            return String(
                ticket
            ).trim();

        }


        /*
         * Beberapa parser mungkin menyimpan
         * TT Number dalam metadata.
         */

        const metadata =
            row?.metadata ||
            row?.meta ||
            {};


        ticket =
            getValue(
                metadata,
                ticketKeys
            );


        if (
            ticket !== ""
        ) {

            return String(
                ticket
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


        if (!tbody) {

            return;

        }


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

                            "datetimeReceive",

                            "Datetime Receive",

                            "datetime_receive"

                        ]
                    )

                    ||

                    getValue(
                        original,
                        [

                            "Datetime Receive",

                            "datetimeReceive",

                            "DatetimeReceive"

                        ]
                    );


                const release =
                    getValue(
                        row,
                        [

                            "releaseDateTime",

                            "release",

                            "ttRelease",

                            "TT Release",

                            "releaseDateText"

                        ]
                    );


                const reason =
                    getValue(
                        row,
                        [

                            "reason",

                            "message",

                            "keterangan",

                            "note"

                        ]
                    )

                    ||

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


        if (!tbody) {

            return;

        }


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

                            "datetimeReceive",

                            "Datetime Receive",

                            "datetime_receive"

                        ]
                    )

                    ||

                    getValue(
                        original,
                        [

                            "Datetime Receive",

                            "datetimeReceive",

                            "DatetimeReceive"

                        ]
                    );


                const release =
                    getValue(
                        row,
                        [

                            "releaseDateTime",

                            "release",

                            "ttRelease",

                            "TT Release",

                            "releaseDateText"

                        ]
                    );


                const reason =
                    getValue(
                        row,
                        [

                            "reason",

                            "message",

                            "keterangan",

                            "note"

                        ]
                    )

                    ||

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


        if (!tbody) {

            return;

        }


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

                /*
                 * Ticket selalu dicari dari TT Number.
                 */

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

                            "Name",

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

                            "Quantity",

                            "jumlah",

                            "Jumlah"

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


        if (!tbody) {

            return;

        }


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

                            "name",

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

                            "materialCode"

                        ]
                    );


                const error =
                    getValue(
                        row,
                        [

                            "error",

                            "reason",

                            "message",

                            "keterangan",

                            "note"

                        ]
                    )

                    ||

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

                if (!row) {

                    return false;

                }


                return Object
                    .values(row)
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
       
       Mendukung search input jika index.html
       nantinya mempunyai input pencarian.
    ===================================================== */

    function setupSearch() {

        const inputs = $$(
            "#searchInput, #globalSearch, [data-search]"
        );


        inputs.forEach(
            function (input) {

                input.addEventListener(
                    "input",
                    function () {

                        state.search =
                            String(
                                input.value ||
                                ""
                            );


                        state.page =
                            1;


                        updateDashboard();

                    }
                );

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


        if (!button) {

            return;

        }


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

                typeof excel
                    .exportResult ===
                "function"

            ) {

                excel.exportResult(
                    type
                );

                return;

            }


            if (

                typeof excel
                    .exportExcel ===
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
            type ===
            "valid"
        ) {

            rows =
                getValidRows();

            filename =
                "Sesuai.xlsx";

        }


        else if (
            type ===
            "invalid"
        ) {

            rows =
                getInvalidRows();

            filename =
                "Tidak_Sesuai.xlsx";

        }


        else if (
            type ===
            "material"
        ) {

            rows =
                getMaterialRows();

            filename =
                "Material.xlsx";

        }


        else if (
            type ===
            "material-error"
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

                    delete copy.rowData;

                    delete copy.data;


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


        if (!button) {

            return;

        }


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

                            ?

                        "Buka Pengaturan"

                            :

                        "Tutup Pengaturan";

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


        if (!element) {

            return;

        }


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


        if (!button) {

            return;

        }


        button.addEventListener(
            "click",
            function () {

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

        setupTabs();

        setupSearch();

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
