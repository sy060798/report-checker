/* =========================================================
   REPORT CHECKER
   app.js

   Controller utama aplikasi.

   Tugas:
   - Upload Excel
   - Menjalankan proses Excel
   - Menampilkan summary
   - Menampilkan SESUAI
   - Menampilkan TIDAK SESUAI
   - Menampilkan INVALID
   - Menampilkan MATERIAL
   - Menampilkan CUSTOM MATERIAL
   - Menampilkan MATERIAL NOT FOUND
   - Search
   - Tab
   - Pagination
   - Export
   - Reset
========================================================= */

(function () {

    "use strict";


    /* =====================================================
       STATE
    ===================================================== */

    const state = {

        activeTab:
            "summary",

        search:
            "",

        page:
            1,

        pageSize:
            25,

        initialized:
            false

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


    function formatNumber(value) {

        return new Intl.NumberFormat(
            "id-ID"
        ).format(
            Number(value) || 0
        );

    }


    function showStatus(
        message,
        type = "info"
    ) {

        const element =
            $("#statusMessage");


        if (!element) {

            return;

        }


        element.textContent =
            message || "";


        element.className =
            "status-message";


        if (message) {

            element.classList.add(
                `status-${type}`
            );

            element.hidden =
                false;

        }

        else {

            element.hidden =
                true;

        }

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


    /* =====================================================
       GET DATA
    ===================================================== */

    function getData() {

        if (
            !window.ReportCheckerExcel
        ) {

            return {

                validationResults: [],
                sesuai: [],
                tidakSesuai: [],
                invalid: [],
                materials: [],
                customMaterials: [],
                materialNotFound: []

            };

        }


        return window
            .ReportCheckerExcel
            .getState();

    }


    /* =====================================================
       SUMMARY
    ===================================================== */

    function renderSummary() {

        const data =
            getData();


        setText(
            "#totalCount",
            formatNumber(
                data.validationResults.length
            )
        );


        setText(
            "#sesuaiCount",
            formatNumber(
                data.sesuai.length
            )
        );


        setText(
            "#tidakSesuaiCount",
            formatNumber(
                data.tidakSesuai.length
            )
        );


        setText(
            "#invalidCount",
            formatNumber(
                data.invalid.length
            )
        );


        setText(
            "#materialCount",
            formatNumber(
                data.materials.length
            )
        );


        setText(
            "#materialNotFoundCount",
            formatNumber(
                data.materialNotFound.length
            )
        );


        setText(
            "#customMaterialCount",
            formatNumber(
                data.customMaterials.length
            )
        );

    }


    /* =====================================================
       SEARCH
    ===================================================== */

    function filterRows(rows) {

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
       PAGINATION
    ===================================================== */

    function paginate(rows) {

        const pageSize =
            Number(
                state.pageSize
            ) || 25;


        const totalPages =
            Math.max(
                1,
                Math.ceil(
                    rows.length /
                    pageSize
                )
            );


        if (
            state.page >
            totalPages
        ) {

            state.page =
                totalPages;

        }


        const start =
            (
                state.page -
                1
            ) *
            pageSize;


        return {

            rows:
                rows.slice(
                    start,
                    start + pageSize
                ),

            total:
                rows.length,

            totalPages:
                totalPages,

            start:
                rows.length
                    ? start + 1
                    : 0,

            end:
                Math.min(
                    start + pageSize,
                    rows.length
                )

        };

    }


    /* =====================================================
       BADGE
    ===================================================== */

    function badge(
        status
    ) {

        const value =
            String(
                status || ""
            ).toUpperCase();


        if (
            value === "SESUAI"
        ) {

            return `
                <span class="badge badge-success">
                    SESUAI
                </span>
            `;

        }


        if (
            value === "TIDAK SESUAI"
        ) {

            return `
                <span class="badge badge-danger">
                    TIDAK SESUAI
                </span>
            `;

        }


        if (
            value === "INVALID"
        ) {

            return `
                <span class="badge badge-warning">
                    INVALID
                </span>
            `;

        }


        return `
            <span class="badge">
                ${escapeHtml(status || "-")}
            </span>
        `;

    }


    /* =====================================================
       VALIDATION TABLE
    ===================================================== */

    function renderValidation() {

        const tbody =
            $("#validationTableBody");


        if (!tbody) {

            return;

        }


        const data =
            getData();


        const rows =
            filterRows(
                data.validationResults
            );


        const result =
            paginate(
                rows
            );


        if (
            result.total === 0
        ) {

            tbody.innerHTML = `
                <tr>
                    <td
                        colspan="7"
                        class="empty-cell"
                    >
                        Tidak ada data.
                    </td>
                </tr>
            `;

            renderPagination(
                "validation",
                result
            );

            return;

        }


        tbody.innerHTML =
            result.rows
                .map(
                    function (item) {

                        const original =
                            item.originalRow ||
                            {};


                        return `
                            <tr>

                                <td>
                                    ${escapeHtml(
                                        item.ticket ||
                                        original[
                                            "Customer Ticket"
                                        ] ||
                                        original[
                                            "TT Number"
                                        ] ||
                                        "-"
                                    )}
                                </td>

                                <td>
                                    ${escapeHtml(
                                        item.receiveDateFormatted ||
                                        original[
                                            "Datetime Receive"
                                        ] ||
                                        "-"
                                    )}
                                </td>

                                <td>
                                    ${escapeHtml(
                                        item.releaseDateTime ||
                                        "-"
                                    )}
                                </td>

                                <td>
                                    ${badge(
                                        item.status
                                    )}
                                </td>

                                <td>
                                    ${escapeHtml(
                                        original[
                                            "Problem Subject"
                                        ] ||
                                        "-"
                                    )}
                                </td>

                                <td>
                                    ${escapeHtml(
                                        original[
                                            "Status TT"
                                        ] ||
                                        "-"
                                    )}
                                </td>

                                <td>
                                    ${escapeHtml(
                                        item.reason ||
                                        item.message ||
                                        "-"
                                    )}
                                </td>

                            </tr>
                        `;

                    }
                )
                .join("");


        renderPagination(
            "validation",
            result
        );

    }


    /* =====================================================
       MATERIAL TABLE
    ===================================================== */

    function renderMaterial() {

        const tbody =
            $("#materialTableBody");


        if (!tbody) {

            return;

        }


        const data =
            getData();


        const rows =
            filterRows(
                data.materials
            );


        const result =
            paginate(
                rows
            );


        if (
            result.total === 0
        ) {

            tbody.innerHTML = `
                <tr>
                    <td
                        colspan="8"
                        class="empty-cell"
                    >
                        Tidak ada material.
                    </td>
                </tr>
            `;

            renderPagination(
                "material",
                result
            );

            return;

        }


        tbody.innerHTML =
            result.rows
                .map(
                    function (item) {

                        return `
                            <tr>

                                <td>
                                    ${escapeHtml(
                                        item.ticket ||
                                        "-"
                                    )}
                                </td>

                                <td>
                                    <strong>
                                        ${escapeHtml(
                                            item.material ||
                                            "-"
                                        )}
                                    </strong>
                                </td>

                                <td>
                                    ${escapeHtml(
                                        item.originalMaterial ||
                                        item.raw ||
                                        "-"
                                    )}
                                </td>

                                <td>
                                    ${escapeHtml(
                                        item.quantity ??
                                        "-"
                                    )}
                                </td>

                                <td>
                                    ${escapeHtml(
                                        item.unit ||
                                        "-"
                                    )}
                                </td>

                                <td>
                                    ${escapeHtml(
                                        item.code ||
                                        "-"
                                    )}
                                </td>

                                <td>
                                    ${escapeHtml(
                                        item.type ||
                                        "MASTER"
                                    )}
                                </td>

                                <td>
                                    ${escapeHtml(
                                        item.matchedAlias ||
                                        "-"
                                    )}
                                </td>

                            </tr>
                        `;

                    }
                )
                .join("");


        renderPagination(
            "material",
            result
        );

    }


    /* =====================================================
       CUSTOM MATERIAL
    ===================================================== */

    function renderCustomMaterial() {

        const tbody =
            $("#customMaterialTableBody");


        if (!tbody) {

            return;

        }


        const data =
            getData();


        const rows =
            filterRows(
                data.customMaterials
            );


        const result =
            paginate(
                rows
            );


        if (
            result.total === 0
        ) {

            tbody.innerHTML = `
                <tr>
                    <td
                        colspan="7"
                        class="empty-cell"
                    >
                        Tidak ada custom material.
                    </td>
                </tr>
            `;

            renderPagination(
                "custom",
                result
            );

            return;

        }


        tbody.innerHTML =
            result.rows
                .map(
                    function (item) {

                        return `
                            <tr>

                                <td>
                                    ${escapeHtml(
                                        item.ticket ||
                                        "-"
                                    )}
                                </td>

                                <td>
                                    <strong>
                                        ${escapeHtml(
                                            item.material ||
                                            "-"
                                        )}
                                    </strong>
                                </td>

                                <td>
                                    ${escapeHtml(
                                        item.quantity ??
                                        "-"
                                    )}
                                </td>

                                <td>
                                    ${escapeHtml(
                                        item.unit ||
                                        "-"
                                    )}
                                </td>

                                <td>
                                    ${escapeHtml(
                                        item.code ||
                                        "-"
                                    )}
                                </td>

                                <td>
                                    CUSTOM
                                </td>

                                <td>
                                    ${escapeHtml(
                                        item.raw ||
                                        item.originalMaterial ||
                                        "-"
                                    )}
                                </td>

                            </tr>
                        `;

                    }
                )
                .join("");


        renderPagination(
            "custom",
            result
        );

    }


    /* =====================================================
       MATERIAL NOT FOUND
    ===================================================== */

    function renderMaterialNotFound() {

        const tbody =
            $("#materialNotFoundTableBody");


        if (!tbody) {

            return;

        }


        const data =
            getData();


        const rows =
            filterRows(
                data.materialNotFound
            );


        const result =
            paginate(
                rows
            );


        if (
            result.total === 0
        ) {

            tbody.innerHTML = `
                <tr>
                    <td
                        colspan="3"
                        class="empty-cell"
                    >
                        Tidak ada material NOT FOUND.
                    </td>
                </tr>
            `;

            renderPagination(
                "notfound",
                result
            );

            return;

        }


        tbody.innerHTML =
            result.rows
                .map(
                    function (item) {

                        return `
                            <tr>

                                <td>
                                    ${escapeHtml(
                                        item.ticket ||
                                        "-"
                                    )}
                                </td>

                                <td>
                                    <span class="badge badge-danger">
                                        NOT FOUND
                                    </span>
                                </td>

                                <td>
                                    ${escapeHtml(
                                        item.reason ||
                                        item.raw ||
                                        "-"
                                    )}
                                </td>

                            </tr>
                        `;

                    }
                )
                .join("");


        renderPagination(
            "notfound",
            result
        );

    }


    /* =====================================================
       INVALID
    ===================================================== */

    function renderInvalid() {

        const container =
            $(
                "#invalidTableBody"
            );


        if (!container) {

            return;

        }


        const data =
            getData();


        const rows =
            filterRows(
                data.invalid
            );


        if (
            rows.length === 0
        ) {

            container.innerHTML = `
                <tr>
                    <td
                        colspan="5"
                        class="empty-cell"
                    >
                        Tidak ada data invalid.
                    </td>
                </tr>
            `;

            return;

        }


        const result =
            paginate(
                rows
            );


        container.innerHTML =
            result.rows
                .map(
                    function (item) {

                        const original =
                            item.originalRow ||
                            {};


                        return `
                            <tr>

                                <td>
                                    ${escapeHtml(
                                        item.ticket ||
                                        "-"
                                    )}
                                </td>

                                <td>
                                    ${escapeHtml(
                                        item.receiveDateFormatted ||
                                        original[
                                            "Datetime Receive"
                                        ] ||
                                        "-"
                                    )}
                                </td>

                                <td>
                                    ${escapeHtml(
                                        item.releaseDateTime ||
                                        "-"
                                    )}
                                </td>

                                <td>
                                    ${badge(
                                        "INVALID"
                                    )}
                                </td>

                                <td>
                                    ${escapeHtml(
                                        item.reason ||
                                        item.message ||
                                        "-"
                                    )}
                                </td>

                            </tr>
                        `;

                    }
                )
                .join("");

    }


    /* =====================================================
       PAGINATION
    ===================================================== */

    function renderPagination(
        type,
        result
    ) {

        const container =
            document.querySelector(
                `[data-pagination="${type}"]`
            );


        if (!container) {

            return;

        }


        if (
            result.total === 0
        ) {

            container.innerHTML =
                "";

            return;

        }


        container.innerHTML = `

            <div class="pagination-info">

                Menampilkan
                <strong>
                    ${result.start}
                </strong>
                -
                <strong>
                    ${result.end}
                </strong>

                dari
                <strong>
                    ${result.total}
                </strong>

            </div>

            <div class="pagination-buttons">

                <button
                    type="button"
                    data-page-action="prev"
                    data-page-type="${type}"
                    ${state.page <= 1
                        ? "disabled"
                        : ""}
                >
                    ‹
                </button>

                <span>
                    Halaman
                    ${state.page}
                    /
                    ${result.totalPages}
                </span>

                <button
                    type="button"
                    data-page-action="next"
                    data-page-type="${type}"
                    ${state.page >= result.totalPages
                        ? "disabled"
                        : ""}
                >
                    ›
                </button>

            </div>

        `;

    }


    /* =====================================================
       RENDER EVERYTHING
    ===================================================== */

    function render() {

        renderSummary();

        renderValidation();

        renderMaterial();

        renderCustomMaterial();

        renderMaterialNotFound();

        renderInvalid();

        updateTabs();

    }


    /* =====================================================
       TABS
    ===================================================== */

    function updateTabs() {

        $$(
            "[data-tab-content]"
        )
            .forEach(
                function (element) {

                    element.hidden =
                        element.getAttribute(
                            "data-tab-content"
                        ) !==
                        state.activeTab;

                }
            );


        $$(
            "[data-tab]"
        )
            .forEach(
                function (button) {

                    button.classList.toggle(
                        "active",
                        button.getAttribute(
                            "data-tab"
                        ) ===
                        state.activeTab
                    );

                }
            );

    }


    function setupTabs() {

        $$(
            "[data-tab]"
        )
            .forEach(
                function (button) {

                    button.addEventListener(
                        "click",
                        function () {

                            state.activeTab =
                                button.getAttribute(
                                    "data-tab"
                                );


                            state.page =
                                1;


                            updateTabs();

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
            $("#searchInput");


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


                render();

            }
        );

    }


    /* =====================================================
       PAGE SIZE
    ===================================================== */

    function setupPageSize() {

        const select =
            $("#pageSize");


        if (!select) {

            return;

        }


        select.addEventListener(
            "change",
            function () {

                state.pageSize =
                    Number(
                        select.value
                    ) || 25;


                state.page =
                    1;


                render();

            }
        );

    }


    /* =====================================================
       PAGINATION EVENT
    ===================================================== */

    function setupPagination() {

        document.addEventListener(
            "click",
            function (event) {

                const button =
                    event.target.closest(
                        "[data-page-action]"
                    );


                if (!button) {

                    return;

                }


                const action =
                    button.getAttribute(
                        "data-page-action"
                    );


                if (
                    action ===
                    "prev"
                ) {

                    state.page =
                        Math.max(
                            1,
                            state.page - 1
                        );

                }


                if (
                    action ===
                    "next"
                ) {

                    state.page++;

                }


                render();

            }
        );

    }


    /* =====================================================
       UPLOAD
    ===================================================== */

    async function processFile(
        file
    ) {

        if (!file) {

            showStatus(
                "Silakan pilih file Excel terlebih dahulu.",
                "error"
            );

            return;

        }


        const filename =
            String(
                file.name || ""
            )
                .toLowerCase();


        if (
            !(
                filename.endsWith(
                    ".xlsx"
                ) ||
                filename.endsWith(
                    ".xls"
                ) ||
                filename.endsWith(
                    ".xlsm"
                )
            )
        ) {

            showStatus(
                "File harus Excel (.xlsx, .xls, .xlsm).",
                "error"
            );

            return;

        }


        const button =
            $("#processButton");


        const loading =
            $("#loading");


        try {

            if (button) {

                button.disabled =
                    true;

                button.textContent =
                    "Memproses...";

            }


            if (loading) {

                loading.hidden =
                    false;

            }


            showStatus(
                "Sedang membaca Excel dan memproses CIR...",
                "info"
            );


            /*
             * Fungsi utama berada di excel.js
             */

            const result =
                await window
                    .ReportCheckerExcel
                    .load(
                        file
                    );


            state.search =
                "";

            state.page =
                1;

            state.activeTab =
                "summary";


            const search =
                $("#searchInput");


            if (search) {

                search.value =
                    "";

            }


            const section =
                $("#resultSection");


            if (section) {

                section.hidden =
                    false;

            }


            render();


            showStatus(
                `Berhasil memproses ${result.summary.total} data tiket.`,
                "success"
            );

        }

        catch (error) {

            console.error(
                error
            );


            showStatus(
                error?.message ||
                "Terjadi kesalahan saat memproses Excel.",
                "error"
            );

        }

        finally {

            if (button) {

                button.disabled =
                    false;

                button.textContent =
                    "Proses Excel";

            }


            if (loading) {

                loading.hidden =
                    true;

            }

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
                    input.files?.[0];


                if (!file) {

                    return;

                }


                const fileName =
                    $("#fileName");


                if (fileName) {

                    fileName.textContent =
                        file.name;

                }

            }
        );

    }


    /* =====================================================
       PROCESS BUTTON
    ===================================================== */

    function setupProcessButton() {

        const button =
            $("#processButton");


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
            function () {

                processFile(
                    input.files?.[0]
                );

            }
        );

    }


    /* =====================================================
       DRAG DROP
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


        [
            "dragenter",
            "dragover"
        ]
            .forEach(
                function (eventName) {

                    zone.addEventListener(
                        eventName,
                        function (event) {

                            event.preventDefault();

                            zone.classList.add(
                                "dragging"
                            );

                        }
                    );

                }
            );


        [
            "dragleave",
            "drop"
        ]
            .forEach(
                function (eventName) {

                    zone.addEventListener(
                        eventName,
                        function (event) {

                            event.preventDefault();

                            zone.classList.remove(
                                "dragging"
                            );

                        }
                    );

                }
            );


        zone.addEventListener(
            "drop",
            function (event) {

                const file =
                    event
                        .dataTransfer
                        ?.files
                        ?.[0];


                if (!file) {

                    return;

                }


                try {

                    const dt =
                        new DataTransfer();


                    dt.items.add(
                        file
                    );


                    input.files =
                        dt.files;

                }

                catch (_) {}


                const fileName =
                    $("#fileName");


                if (fileName) {

                    fileName.textContent =
                        file.name;

                }

            }
        );


        zone.addEventListener(
            "click",
            function (event) {

                if (
                    event.target.closest(
                        "button"
                    )
                ) {

                    return;

                }


                input.click();

            }
        );

    }


    /* =====================================================
       EXPORT
    ===================================================== */

    function setupExport() {

        const mapping = {

            "#exportAll":
                "exportAll",

            "#exportSesuai":
                "exportSesuai",

            "#exportTidakSesuai":
                "exportTidakSesuai",

            "#exportMaterial":
                "exportMaterial",

            "#exportCustom":
                "exportCustomMaterial",

            "#exportNotFound":
                "exportMaterialNotFound",

            "#exportInvalid":
                "exportInvalid"

        };


        Object.entries(
            mapping
        )
            .forEach(
                function (
                    [
                        selector,
                        functionName
                    ]
                ) {

                    const button =
                        $(selector);


                    if (!button) {

                        return;

                    }


                    button.addEventListener(
                        "click",
                        function () {

                            if (
                                !window.ReportCheckerExporter
                            ) {

                                showStatus(
                                    "Exporter belum tersedia.",
                                    "error"
                                );

                                return;

                            }


                            const exporter =
                                window
                                    .ReportCheckerExporter
                                    [functionName];


                            if (
                                typeof exporter !==
                                "function"
                            ) {

                                showStatus(
                                    `Fungsi ${functionName} belum tersedia.`,
                                    "error"
                                );

                                return;

                            }


                            try {

                                exporter();

                            }

                            catch (error) {

                                console.error(
                                    error
                                );


                                showStatus(
                                    error?.message ||
                                    "Gagal membuat file Excel.",
                                    "error"
                                );

                            }

                        }
                    );

                }
            );

    }


    /* =====================================================
       RESET
    ===================================================== */

    function setupReset() {

        const button =
            $("#resetButton");


        if (!button) {

            return;

        }


        button.addEventListener(
            "click",
            function () {

                if (
                    !confirm(
                        "Hapus semua hasil dan mulai dari awal?"
                    )
                ) {

                    return;

                }


                if (
                    window
                        .ReportCheckerExcel
                        ?.reset
                ) {

                    window
                        .ReportCheckerExcel
                        .reset();

                }


                state.search =
                    "";

                state.page =
                    1;

                state.activeTab =
                    "summary";


                const input =
                    $("#excelFile");


                if (input) {

                    input.value =
                        "";

                }


                const filename =
                    $("#fileName");


                if (filename) {

                    filename.textContent =
                        "Belum ada file";

                }


                const search =
                    $("#searchInput");


                if (search) {

                    search.value =
                        "";

                }


                const result =
                    $("#resultSection");


                if (result) {

                    result.hidden =
                        true;

                }


                renderSummary();

                updateTabs();


                showStatus(
                    "",
                    "info"
                );

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


        setupFileInput();

        setupProcessButton();

        setupDropZone();

        setupTabs();

        setupSearch();

        setupPageSize();

        setupPagination();

        setupExport();

        setupReset();


        updateTabs();

        renderSummary();


        state.initialized =
            true;

    }


    /* =====================================================
       PUBLIC
    ===================================================== */

    window.ReportCheckerApp = {

        init:
            init,

        processFile:
            processFile,

        render:
            render,

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

    }

    else {

        init();

    }

})();
