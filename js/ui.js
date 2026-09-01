/* =========================================================
   REPORT CHECKER
   ui.js

   Fungsi:
   - Handle upload Excel
   - Jalankan parser
   - Tampilkan summary
   - Tampilkan data SESUAI
   - Tampilkan data TIDAK SESUAI
   - Tampilkan material
   - Tampilkan CUSTOM material
   - Tampilkan NOT FOUND
   - Search
   - Filter
   - Pagination sederhana
   - Export Excel
========================================================= */

(function () {

    "use strict";


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


    /* =====================================================
       STATE UI
    ===================================================== */

    const uiState = {

        activeTab:
            "summary",

        search:
            "",

        currentPage:
            1,

        pageSize:
            25,

        currentRows:
            [],

        initialized:
            false

    };


    /* =====================================================
       SAFE TEXT
    ===================================================== */

    function escapeHtml(
        value
    ) {

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


    /* =====================================================
       FORMAT NUMBER
    ===================================================== */

    function formatNumber(
        value
    ) {

        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {

            return "-";

        }


        if (
            typeof value !==
            "number"
        ) {

            return escapeHtml(
                value
            );

        }


        return new Intl.NumberFormat(
            "id-ID"
        ).format(
            value
        );

    }


    /* =====================================================
       SET TEXT
    ===================================================== */

    function setText(
        selector,
        value
    ) {

        const element =
            $(selector);


        if (!element) {

            return;

        }


        element.textContent =
            value ?? "";

    }


    /* =====================================================
       SET HTML
    ===================================================== */

    function setHtml(
        selector,
        value
    ) {

        const element =
            $(selector);


        if (!element) {

            return;

        }


        element.innerHTML =
            value ?? "";

    }


    /* =====================================================
       SHOW / HIDE
    ===================================================== */

    function show(
        selector
    ) {

        const element =
            $(selector);


        if (!element) {

            return;

        }


        element.hidden =
            false;

        element.style.display =
            "";

    }


    function hide(
        selector
    ) {

        const element =
            $(selector);


        if (!element) {

            return;

        }


        element.hidden =
            true;

        element.style.display =
            "none";

    }


    /* =====================================================
       STATUS MESSAGE
    ===================================================== */

    function showStatus(
        message,
        type
    ) {

        const box =
            $(
                "#statusMessage"
            );


        if (!box) {

            return;

        }


        box.textContent =
            message || "";


        box.className =
            "status-message";


        if (type) {

            box.classList.add(
                `status-${type}`
            );

        }


        if (message) {

            box.hidden =
                false;

        }

        else {

            box.hidden =
                true;

        }

    }


    /* =====================================================
       LOADING
    ===================================================== */

    function setLoading(
        loading
    ) {

        const button =
            $(
                "#processButton"
            );


        if (button) {

            button.disabled =
                loading;


            button.textContent =
                loading
                    ? "Memproses..."
                    : "Proses Excel";

        }


        const loader =
            $(
                "#loading"
            );


        if (loader) {

            loader.hidden =
                !loading;

        }

    }


    /* =====================================================
       UPDATE SUMMARY
    ===================================================== */

    function updateSummary(
        result
    ) {

        if (!result) {

            return;

        }


        const summary =
            result.summary ||
            {};


        setText(
            "#totalCount",
            formatNumber(
                summary.total || 0
            )
        );


        setText(
            "#sesuaiCount",
            formatNumber(
                summary.sesuai || 0
            )
        );


        setText(
            "#tidakSesuaiCount",
            formatNumber(
                summary.tidakSesuai ||
                0
            )
        );


        setText(
            "#invalidCount",
            formatNumber(
                summary.invalid ||
                0
            )
        );


        setText(
            "#materialCount",
            formatNumber(
                summary.material ||
                0
            )
        );


        setText(
            "#materialNotFoundCount",
            formatNumber(
                summary.materialNotFound ||
                0
            )
        );


        setText(
            "#customMaterialCount",
            formatNumber(
                summary.customMaterial ||
                0
            )
        );

    }


    /* =====================================================
       STATUS BADGE
    ===================================================== */

    function statusBadge(
        status
    ) {

        const value =
            String(
                status || ""
            ).toUpperCase();


        if (
            value ===
            "SESUAI"
        ) {

            return (
                '<span class="badge badge-success">' +
                'SESUAI' +
                '</span>'
            );

        }


        if (
            value ===
            "TIDAK SESUAI"
        ) {

            return (
                '<span class="badge badge-danger">' +
                'TIDAK SESUAI' +
                '</span>'
            );

        }


        if (
            value ===
            "INVALID"
        ) {

            return (
                '<span class="badge badge-warning">' +
                'INVALID' +
                '</span>'
            );

        }


        return (
            '<span class="badge">' +
            escapeHtml(
                status || "-"
            ) +
            '</span>'
        );

    }


    /* =====================================================
       MATERIAL TYPE BADGE
    ===================================================== */

    function materialTypeBadge(
        type
    ) {

        const value =
            String(
                type || ""
            ).toUpperCase();


        if (
            value ===
            "MASTER"
        ) {

            return (
                '<span class="badge badge-success">' +
                'MASTER' +
                '</span>'
            );

        }


        if (
            value ===
            "CUSTOM"
        ) {

            return (
                '<span class="badge badge-warning">' +
                'CUSTOM' +
                '</span>'
            );

        }


        return (
            '<span class="badge badge-danger">' +
            'UNKNOWN' +
            '</span>'
        );

    }


    /* =====================================================
       RENDER VALIDATION TABLE
    ===================================================== */

    function renderValidationTable(
        rows
    ) {

        const tbody =
            $(
                "#validationTableBody"
            );


        if (!tbody) {

            return;

        }


        if (
            !Array.isArray(rows) ||
            rows.length === 0
        ) {

            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-cell">
                        Tidak ada data.
                    </td>
                </tr>
            `;

            renderPagination(
                [],
                "validation"
            );

            return;

        }


        const filtered =
            filterRows(
                rows
            );


        const paginated =
            paginate(
                filtered
            );


        tbody.innerHTML =
            paginated.rows
                .map(
                    function (item) {

                        const original =
                            item.originalRow ||
                            {};


                        return `
                            <tr>

                                <td>
                                    ${escapeHtml(
                                        item.ticket
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
                                    ${statusBadge(
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
                                        "-"
                                    )}
                                </td>

                            </tr>
                        `;

                    }
                )
                .join("");


        renderPagination(
            filtered,
            "validation"
        );

    }


    /* =====================================================
       RENDER MATERIAL TABLE
    ===================================================== */

    function renderMaterialTable(
        rows
    ) {

        const tbody =
            $(
                "#materialTableBody"
            );


        if (!tbody) {

            return;

        }


        if (
            !Array.isArray(rows) ||
            rows.length === 0
        ) {

            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-cell">
                        Tidak ada material.
                    </td>
                </tr>
            `;

            renderPagination(
                [],
                "material"
            );

            return;

        }


        const filtered =
            filterRows(
                rows
            );


        const paginated =
            paginate(
                filtered
            );


        tbody.innerHTML =
            paginated.rows
                .map(
                    function (item) {

                        return `
                            <tr>

                                <td>
                                    ${escapeHtml(
                                        item.ticket
                                    )}
                                </td>

                                <td>
                                    <strong>
                                        ${escapeHtml(
                                            item.material
                                        )}
                                    </strong>
                                </td>

                                <td>
                                    ${escapeHtml(
                                        item.originalMaterial ||
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
                                    ${materialTypeBadge(
                                        item.type
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
            filtered,
            "material"
        );

    }


    /* =====================================================
       RENDER CUSTOM MATERIAL
    ===================================================== */

    function renderCustomMaterialTable(
        rows
    ) {

        const tbody =
            $(
                "#customMaterialTableBody"
            );


        if (!tbody) {

            return;

        }


        if (
            !Array.isArray(rows) ||
            rows.length === 0
        ) {

            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-cell">
                        Tidak ada CUSTOM material.
                    </td>
                </tr>
            `;

            renderPagination(
                [],
                "custom"
            );

            return;

        }


        const filtered =
            filterRows(
                rows
            );


        const paginated =
            paginate(
                filtered
            );


        tbody.innerHTML =
            paginated.rows
                .map(
                    function (item) {

                        return `
                            <tr>

                                <td>
                                    ${escapeHtml(
                                        item.ticket
                                    )}
                                </td>

                                <td>
                                    <strong>
                                        ${escapeHtml(
                                            item.material
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
                                    ${materialTypeBadge(
                                        item.type
                                    )}
                                </td>

                                <td>
                                    ${escapeHtml(
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
            filtered,
            "custom"
        );

    }


    /* =====================================================
       RENDER NOT FOUND MATERIAL
    ===================================================== */

    function renderMaterialNotFoundTable(
        rows
    ) {

        const tbody =
            $(
                "#materialNotFoundTableBody"
            );


        if (!tbody) {

            return;

        }


        if (
            !Array.isArray(rows) ||
            rows.length === 0
        ) {

            tbody.innerHTML = `
                <tr>
                    <td colspan="3" class="empty-cell">
                        Tidak ada data NOT FOUND.
                    </td>
                </tr>
            `;

            renderPagination(
                [],
                "notfound"
            );

            return;

        }


        const filtered =
            filterRows(
                rows
            );


        const paginated =
            paginate(
                filtered
            );


        tbody.innerHTML =
            paginated.rows
                .map(
                    function (item) {

                        return `
                            <tr>

                                <td>
                                    ${escapeHtml(
                                        item.ticket
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
                                        "-"
                                    )}
                                </td>

                            </tr>
                        `;

                    }
                )
                .join("");


        renderPagination(
            filtered,
            "notfound"
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
            String(
                uiState.search || ""
            )
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
                                value ??
                                ""
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

    function paginate(
        rows
    ) {

        const pageSize =
            Number(
                uiState.pageSize
            ) || 25;


        const total =
            rows.length;


        const totalPages =
            Math.max(
                1,
                Math.ceil(
                    total /
                    pageSize
                )
            );


        if (
            uiState.currentPage >
            totalPages
        ) {

            uiState.currentPage =
                totalPages;

        }


        const start =
            (
                uiState.currentPage -
                1
            ) *
            pageSize;


        const end =
            start +
            pageSize;


        return {

            rows:
                rows.slice(
                    start,
                    end
                ),

            total:
                total,

            totalPages:
                totalPages,

            start:
                total === 0
                    ? 0
                    : start + 1,

            end:
                Math.min(
                    end,
                    total
                )

        };

    }


    /* =====================================================
       PAGINATION UI
    ===================================================== */

    function renderPagination(
        rows,
        type
    ) {

        const container =
            document.querySelector(
                `[data-pagination="${type}"]`
            );


        if (!container) {

            return;

        }


        const result =
            paginate(
                rows
            );


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
                    data-page-type="${escapeHtml(type)}"
                    ${uiState.currentPage <= 1
                        ? "disabled"
                        : ""}
                >
                    ‹
                </button>

                <span>
                    Halaman
                    ${uiState.currentPage}
                    /
                    ${result.totalPages}
                </span>

                <button
                    type="button"
                    data-page-action="next"
                    data-page-type="${escapeHtml(type)}"
                    ${uiState.currentPage >= result.totalPages
                        ? "disabled"
                        : ""}
                >
                    ›
                </button>

            </div>

        `;

    }


    /* =====================================================
       RENDER ALL
    ===================================================== */

    function renderAll() {

        const data =
            window
                .ReportCheckerExcel
                .getState();


        renderValidationTable(
            data.validationResults
        );


        renderMaterialTable(
            data.materials
        );


        renderCustomMaterialTable(
            data.customMaterials
        );


        renderMaterialNotFoundTable(
            data.materialNotFound
        );


        updateSummary({

            summary: {

                total:
                    data.validationResults.length,

                sesuai:
                    data.sesuai.length,

                tidakSesuai:
                    data.tidakSesuai.length,

                invalid:
                    data.invalid.length,

                material:
                    data.materials.length,

                materialNotFound:
                    data.materialNotFound.length,

                customMaterial:
                    data.customMaterials.length

            }

        });


        updateVisibleTab();

    }


    /* =====================================================
       TAB
    ===================================================== */

    function updateVisibleTab() {

        $$(
            "[data-tab-content]"
        )
            .forEach(
                function (element) {

                    const name =
                        element.getAttribute(
                            "data-tab-content"
                        );


                    element.hidden =
                        name !==
                        uiState.activeTab;

                }
            );


        $$(
            "[data-tab]"
        )
            .forEach(
                function (button) {

                    const name =
                        button.getAttribute(
                            "data-tab"
                        );


                    button.classList.toggle(
                        "active",
                        name ===
                        uiState.activeTab
                    );

                }
            );

    }


    function activateTab(
        tab
    ) {

        uiState.activeTab =
            tab || "summary";


        uiState.currentPage =
            1;


        updateVisibleTab();

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


        /*
         * Cek extension
         */

        const fileName =
            String(
                file.name ||
                ""
            )
                .toLowerCase();


        const valid =
            fileName.endsWith(
                ".xlsx"
            ) ||
            fileName.endsWith(
                ".xls"
            ) ||
            fileName.endsWith(
                ".xlsm"
            );


        if (!valid) {

            showStatus(
                "File harus berupa Excel (.xlsx, .xls, atau .xlsm).",
                "error"
            );

            return;

        }


        try {

            setLoading(
                true
            );


            showStatus(
                "Sedang membaca dan memproses Excel...",
                "info"
            );


            const result =
                await window
                    .ReportCheckerExcel
                    .load(
                        file
                    );


            /*
             * Reset search
             */

            uiState.search =
                "";


            const searchInput =
                $(
                    "#searchInput"
                );


            if (searchInput) {

                searchInput.value =
                    "";

            }


            uiState.currentPage =
                1;


            updateSummary(
                result
            );


            renderAll();


            showStatus(
                `Berhasil memproses ${result.summary.total} data.`,
                "success"
            );


            /*
             * Tampilkan hasil
             */

            show(
                "#resultSection"
            );


            /*
             * Aktifkan summary
             */

            activateTab(
                "summary"
            );

        }

        catch (error) {

            console.error(
                error
            );


            showStatus(
                error?.message ||
                "Gagal memproses Excel.",
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
       FILE INPUT
    ===================================================== */

    function setupFileInput() {

        const input =
            $(
                "#excelFile"
            );


        if (!input) {

            return;

        }


        input.addEventListener(
            "change",
            function () {

                const file =
                    input.files?.[0];


                if (file) {

                    handleFile(
                        file
                    );

                }

            }
        );

    }


    /* =====================================================
       DRAG DROP
    ===================================================== */

    function setupDropZone() {

        const zone =
            $(
                "#dropZone"
            );


        const input =
            $(
                "#excelFile"
            );


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


                if (file) {

                    /*
                     * Set input file jika browser
                     * mengizinkan.
                     */

                    try {

                        const dataTransfer =
                            new DataTransfer();


                        dataTransfer.items.add(
                            file
                        );


                        input.files =
                            dataTransfer.files;

                    }

                    catch (_) {}


                    handleFile(
                        file
                    );

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
       SEARCH
    ===================================================== */

    function setupSearch() {

        const input =
            $(
                "#searchInput"
            );


        if (!input) {

            return;

        }


        input.addEventListener(
            "input",
            function () {

                uiState.search =
                    input.value;


                uiState.currentPage =
                    1;


                renderAll();

            }
        );

    }


    /* =====================================================
       PAGE SIZE
    ===================================================== */

    function setupPageSize() {

        const select =
            $(
                "#pageSize"
            );


        if (!select) {

            return;

        }


        select.addEventListener(
            "change",
            function () {

                uiState.pageSize =
                    Number(
                        select.value
                    ) || 25;


                uiState.currentPage =
                    1;


                renderAll();

            }
        );

    }


    /* =====================================================
       TABS
    ===================================================== */

    function setupTabs() {

        $$(
            "[data-tab]"
        )
            .forEach(
                function (button) {

                    button.addEventListener(
                        "click",
                        function () {

                            activateTab(
                                button.getAttribute(
                                    "data-tab"
                                )
                            );

                        }
                    );

                }
            );

    }


    /* =====================================================
       PAGINATION CLICK
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

                    if (
                        uiState.currentPage >
                        1
                    ) {

                        uiState.currentPage--;

                    }

                }


                else if (
                    action ===
                    "next"
                ) {

                    uiState.currentPage++;

                }


                renderAll();

            }
        );

    }


    /* =====================================================
       EXPORT BUTTONS
    ===================================================== */

    function setupExport() {

        const exports = {

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
                "exportInvalid",

            "#exportAll":
                "exportAll"

        };


        Object.entries(
            exports
        )
            .forEach(
                function (
                    [
                        selector,
                        method
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

                            try {

                                if (
                                    !window
                                        .ReportCheckerExcel
                                        [method]
                                ) {

                                    throw new Error(
                                        "Fungsi export tidak ditemukan."
                                    );

                                }


                                window
                                    .ReportCheckerExcel
                                    [method]();

                            }

                            catch (error) {

                                console.error(
                                    error
                                );


                                showStatus(
                                    error?.message ||
                                    "Gagal export Excel.",
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
            $(
                "#resetButton"
            );


        if (!button) {

            return;

        }


        button.addEventListener(
            "click",
            function () {

                if (
                    !confirm(
                        "Hapus hasil dan mulai dari awal?"
                    )
                ) {

                    return;

                }


                window
                    .ReportCheckerExcel
                    .reset();


                uiState.search =
                    "";

                uiState.currentPage =
                    1;


                const input =
                    $(
                        "#excelFile"
                    );


                if (input) {

                    input.value =
                        "";

                }


                const search =
                    $(
                        "#searchInput"
                    );


                if (search) {

                    search.value =
                        "";

                }


                hide(
                    "#resultSection"
                );


                showStatus(
                    "",
                    ""
                );


                renderAll();

            }
        );

    }


    /* =====================================================
       FILE NAME DISPLAY
    ===================================================== */

    function updateFileName(
        file
    ) {

        const element =
            $(
                "#fileName"
            );


        if (!element) {

            return;

        }


        element.textContent =
            file?.name ||
            "Belum ada file";

    }


    /* =====================================================
       FILE CHANGE DISPLAY
    ===================================================== */

    function setupFileName() {

        const input =
            $(
                "#excelFile"
            );


        if (!input) {

            return;

        }


        input.addEventListener(
            "change",
            function () {

                updateFileName(
                    input.files?.[0]
                );

            }
        );

    }


    /* =====================================================
       INITIAL RENDER
    ===================================================== */

    function initialRender() {

        hide(
            "#resultSection"
        );


        updateVisibleTab();


        setText(
            "#totalCount",
            "0"
        );


        setText(
            "#sesuaiCount",
            "0"
        );


        setText(
            "#tidakSesuaiCount",
            "0"
        );


        setText(
            "#invalidCount",
            "0"
        );


        setText(
            "#materialCount",
            "0"
        );


        setText(
            "#materialNotFoundCount",
            "0"
        );


        setText(
            "#customMaterialCount",
            "0"
        );

    }


    /* =====================================================
       INIT
    ===================================================== */

    function init() {

        if (
            uiState.initialized
        ) {

            return;

        }


        /*
         * Pastikan dependency tersedia.
         */

        if (
            !window.ReportCheckerExcel
        ) {

            console.error(
                "ReportCheckerExcel belum tersedia."
            );

            return;

        }


        if (
            !window.ReportCheckerValidator
        ) {

            console.error(
                "ReportCheckerValidator belum tersedia."
            );

            return;

        }


        if (
            !window.ReportCheckerMaterial
        ) {

            console.error(
                "ReportCheckerMaterial belum tersedia."
            );

            return;

        }


        setupFileInput();

        setupDropZone();

        setupSearch();

        setupPageSize();

        setupTabs();

        setupPagination();

        setupExport();

        setupReset();

        setupFileName();

        initialRender();


        uiState.initialized =
            true;

    }


    /* =====================================================
       AUTO INIT
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

    window.ReportCheckerUI = {

        init:
            init,

        loadFile:
            handleFile,

        render:
            renderAll,

        activateTab:
            activateTab,

        getState:
            function () {

                return {

                    ...uiState

                };

            }

    };


})();
