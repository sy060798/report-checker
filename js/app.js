/* =========================================================
   REPORT CHECKER - APP.JS
   Controller utama UI

   UPDATE:
   - Ticket utama = kolom D / index 3
   - Header Excel dianggap tetap
   - Material tetap ditampilkan
   - Material wajib memiliki Ticket
   - Settings button dipastikan aktif
   - Settings tidak tergantung proses dashboard
   - Drop zone bisa diklik
   - Aman jika module parser lain mengalami error
   - Search tetap berjalan
   - Download tetap berjalan
   - PAGINATION:
       • Masing-masing TAB punya halaman sendiri
       • 10 data per halaman
       • Sesuai / Tidak Sesuai / Material /
         Material Error terpisah
       • Download tetap SEMUA data
========================================================= */

(function () {

    "use strict";


    /* =====================================================
       STATE
    ===================================================== */

    const state = {

        /*
         * Tab yang sedang aktif
         */
        activeTab: "valid",

        /*
         * Search global
         */
        search: "",

        /*
         * Halaman masing-masing tab.
         *
         * Tidak digabung.
         */
        pages: {

            valid: 1,

            invalid: 1,

            material: 1,

            "material-error": 1

        },

        /*
         * Jumlah data yang ditampilkan
         * dalam satu halaman.
         */
        pageSize: 10,

        initialized: false

    };


    /* =====================================================
       KONSTANTA EXCEL
    ===================================================== */

    /*
     * Excel:
     *
     * A = 0
     * B = 1
     * C = 2
     * D = 3
     *
     * Ticket / TT Number = kolom D
     */

    const TT_NUMBER_COLUMN_INDEX = 3;


    /*
     * CIR default AF
     */

    const DEFAULT_CIR_COLUMN_INDEX = 31;


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
       DATA DARI EXCEL.JS
    ===================================================== */

    function getData() {

        try {

            if (

                window.ReportCheckerExcel &&

                typeof window.ReportCheckerExcel
                    .getState === "function"

            ) {

                return (
                    window.ReportCheckerExcel
                        .getState() ||
                    {}
                );

            }

        } catch (error) {

            console.error(
                "Gagal membaca state Excel:",
                error
            );

        }


        return {

            rows: [],

            validationResults: [],

            sesuai: [],

            valid: [],

            tidakSesuai: [],

            invalid: [],

            materials: [],

            material: [],

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
            "status-badge " + type;

    }


    /* =====================================================
       PROCESSING
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
       SETTINGS
       
       PENTING:
       Fungsi ini dipasang paling awal.
       Jadi kalau module lain error,
       tombol settings tetap bisa bekerja.
    ===================================================== */

    function setupSettings() {

        const toggle =
            $("#toggleSettingsBtn");


        const panel =
            $("#settingsPanel");


        const save =
            $("#saveSettingsBtn");


        const reset =
            $("#resetSettingsBtn");


        console.log(
            "Settings:",
            {
                toggle: !!toggle,
                panel: !!panel,
                save: !!save,
                reset: !!reset
            }
        );


        /*
         * BUTTON BUKA / TUTUP
         */

        if (
            toggle &&
            panel &&
            !toggle.dataset.bound
        ) {

            toggle.dataset.bound =
                "true";


            toggle.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();

                    event.stopPropagation();


                    const isHidden =
                        panel.classList.contains(
                            "hidden"
                        );


                    if (isHidden) {

                        panel.classList.remove(
                            "hidden"
                        );


                        toggle.textContent =
                            "Tutup Pengaturan";

                    } else {

                        panel.classList.add(
                            "hidden"
                        );


                        toggle.textContent =
                            "Buka Pengaturan";

                    }

                }
            );

        }


        /*
         * SIMPAN SETTINGS
         */

        if (
            save &&
            !save.dataset.bound
        ) {

            save.dataset.bound =
                "true";


            save.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();

                    saveParserSettings();

                }
            );

        }


        /*
         * RESET SETTINGS
         */

        if (
            reset &&
            !reset.dataset.bound
        ) {

            reset.dataset.bound =
                "true";


            reset.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();

                    resetParserSettings();

                }
            );

        }


        loadParserSettings();

    }


    function saveParserSettings() {

        try {

            /*
             * Jika settings.js tersedia,
             * gunakan settings.js.
             */

            if (

                window.ReportCheckerSettings &&

                typeof window.ReportCheckerSettings
                    .saveFromUI === "function"

            ) {

                window.ReportCheckerSettings
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


        } catch (error) {

            console.error(
                "Gagal menyimpan settings:",
                error
            );


            alert(
                "Pengaturan gagal disimpan."
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
                $("#validationType")?.value ||
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


    function loadParserSettings() {

        try {

            /*
             * Utamakan settings.js
             */

            if (

                window.ReportCheckerSettings &&

                typeof window.ReportCheckerSettings
                    .loadToUI === "function"

            ) {

                window.ReportCheckerSettings
                    .loadToUI();

                return;

            }


            /*
             * Fallback localStorage
             */

            const raw =
                localStorage.getItem(
                    "reportCheckerSettings"
                );


            if (!raw) {

                return;

            }


            const settings =
                JSON.parse(raw);


            writeTextarea(
                "#materialStartPhrases",
                settings.materialStartPhrases
            );


            writeTextarea(
                "#materialEndPhrases",
                settings.materialEndPhrases
            );


            writeTextarea(
                "#releasePhrases",
                settings.releasePhrases
            );


            writeTextarea(
                "#releasePhrases",
                settings.releasePhrases
            );


            writeTextarea(
                "#notFoundPhrases",
                settings.notFoundPhrases
            );


            if (
                $("#validationType") &&
                settings.validationType
            ) {

                $("#validationType").value =
                    settings.validationType;

            }


            if (
                $("#maxReleaseMinutes") &&
                settings.maxReleaseMinutes !==
                    undefined
            ) {

                $("#maxReleaseMinutes").value =
                    settings.maxReleaseMinutes;

            }

        } catch (error) {

            console.warn(
                "Gagal membaca settings:",
                error
            );

        }

    }


    function resetParserSettings() {

        try {

            if (

                window.ReportCheckerSettings &&

                typeof window.ReportCheckerSettings
                    .reset === "function"

            ) {

                window.ReportCheckerSettings
                    .reset();

                loadParserSettings();

                return;

            }


            localStorage.removeItem(
                "reportCheckerSettings"
            );


            location.reload();

        } catch (error) {

            console.error(
                "Gagal reset settings:",
                error
            );

        }

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
                values.join("\n");

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


        if (input.dataset.bound) {

            return;

        }


        input.dataset.bound =
            "true";


        input.addEventListener(
            "change",
            function () {

                const file =
                    input.files?.[0];


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

            size /= 1024;

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


    function isExcelFile(
        file
    ) {

        const name =
            String(
                file?.name || ""
            ).toLowerCase();


        return (

            name.endsWith(".xlsx") ||

            name.endsWith(".xls") ||

            name.endsWith(".xlsm")

        );

    }


    /* =====================================================
       DROP ZONE
       
       FIX:
       HTML sebelumnya hanya punya tabindex.
       Sekarang click -> input.click().
    ===================================================== */

    function setupDropZone() {

        const zone =
            $("#dropZone");


        const input =
            $("#excelFile");


        if (!zone || !input) {

            return;

        }


        if (zone.dataset.bound) {

            return;

        }


        zone.dataset.bound =
            "true";


        /*
         * KLIK DROP ZONE
         */

        zone.addEventListener(
            "click",
            function (event) {

                /*
                 * Jangan trigger dua kali
                 * jika user klik input langsung.
                 */

                if (
                    event.target ===
                    input
                ) {

                    return;

                }


                input.click();

            }
        );


        /*
         * KEYBOARD
         */

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


        /*
         * DRAG OVER
         */

        zone.addEventListener(
            "dragover",
            function (event) {

                event.preventDefault();


                zone.classList.add(
                    "dragging"
                );

            }
        );


        /*
         * DRAG LEAVE
         */

        zone.addEventListener(
            "dragleave",
            function () {

                zone.classList.remove(
                    "dragging"
                );

            }
        );


        /*
         * DROP
         */

        zone.addEventListener(
            "drop",
            function (event) {

                event.preventDefault();


                zone.classList.remove(
                    "dragging"
                );


                const file =
                    event.dataTransfer
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
                        "DataTransfer tidak tersedia:",
                        error
                    );

                }


                setSelectedFile(
                    file
                );

            }
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


        if (button.dataset.bound) {

            return;

        }


        button.dataset.bound =
            "true";


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
       PROCESS BUTTON
    ===================================================== */

    function setupProcessButton() {

        const button =
            $("#processBtn");


        const input =
            $("#excelFile");


        if (!button || !input) {

            return;

        }


        if (button.dataset.bound) {

            return;

        }


        button.dataset.bound =
            "true";


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


    /* =====================================================
       PROCESS EXCEL
    ===================================================== */

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


            if (!window.ReportCheckerExcel) {

                throw new Error(
                    "excel.js belum berhasil dimuat."
                );

            }


            if (
                typeof window.ReportCheckerExcel
                    .load !==
                "function"
            ) {

                throw new Error(
                    "Fungsi load() belum tersedia di excel.js."
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


            await yieldToBrowser();


            const result =
                await window.ReportCheckerExcel
                    .load(
                        file
                    );


            /*
             * Setelah file baru diproses,
             * semua tab kembali ke halaman 1.
             */

            resetPagination();


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

        let data;


        try {

            data =
                getData();

        } catch (error) {

            console.error(
                "Dashboard data error:",
                error
            );

            return;

        }


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
            data.valid?.length ??
            0;


        const tidakSesuai =
            summary.tidakSesuai ??
            data.tidakSesuai?.length ??
            data.invalid?.length ??
            0;


        const material =
            summary.material ??
            data.materials?.length ??
            data.material?.length ??
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


        /*
         * Render semua tabel.
         *
         * Pagination masing-masing tabel
         * tetap terpisah.
         */

        renderValidTable();

        renderInvalidTable();

        renderMaterialTable();

        renderMaterialErrorTable();


        updateDownloadButtons();

    }


    /* =====================================================
       GET DATA
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


    /* =====================================================
       GET VALUE
    ===================================================== */

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

                row[key] !== undefined &&

                row[key] !== null &&

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
       TICKET DARI ARRAY
       
       FIX UTAMA:
       Ticket selalu kolom D = index 3
    ===================================================== */

    function getTTNumberFromArray(
        row
    ) {

        if (!Array.isArray(row)) {

            return "";

        }


        const value =
            row[
                TT_NUMBER_COLUMN_INDEX
            ];


        if (
            value === undefined ||
            value === null
        ) {

            return "";

        }


        return String(
            value
        ).trim();

    }


    /* =====================================================
       TICKET DARI OBJECT
    ===================================================== */

    function getTTNumberFromObject(
        row
    ) {

        if (

            !row ||

            typeof row !== "object" ||

            Array.isArray(row)

        ) {

            return "";

        }


        const possibleKeys = [

            "ttNumber",

            "TT Number",

            "TT_Number",

            "tt_number",

            "TTNumber",

            "TTNUMBER",

            "ttnumber",

            "TT No",

            "TT No.",

            "TT_NO",

            "nomorTT",

            "Nomor TT",

            "noTT",

            "No TT",

            "No. TT"

        ];


        for (
            const key of possibleKeys
        ) {

            if (

                Object.prototype
                    .hasOwnProperty.call(
                        row,
                        key
                    )

            ) {

                const value =
                    row[key];


                if (

                    value !== undefined &&

                    value !== null &&

                    String(
                        value
                    ).trim() !== ""

                ) {

                    return String(
                        value
                    ).trim();

                }

            }

        }


        /*
         * Case insensitive
         */

        for (
            const key of Object.keys(row)
        ) {

            const normalizedKey =
                String(key)
                    .toLowerCase()
                    .replace(
                        /[\s_-]+/g,
                        ""
                    );


            if (
                normalizedKey ===
                "ttnumber"
            ) {

                const value =
                    row[key];


                if (

                    value !== undefined &&

                    value !== null &&

                    String(
                        value
                    ).trim() !== ""

                ) {

                    return String(
                        value
                    ).trim();

                }

            }

        }


        return "";

    }


    /* =====================================================
       GET TICKET
       
       URUTAN:
       1. Array langsung -> D
       2. Object TT Number
       3. originalRow -> D
       4. source -> D
       5. rowData -> D
       6. data -> D
       7. rawRow -> D
       8. excelRow -> D
       9. sourceRow -> D
       10. originalData -> D
       
       TIDAK menggunakan:
       - Customer Ticket
       - Ref Ticket
    ===================================================== */

    function getTicketNumber(
        row
    ) {

        if (!row) {

            return "-";

        }


        /*
         * Array langsung
         */

        if (Array.isArray(row)) {

            return (

                getTTNumberFromArray(
                    row
                ) ||

                "-"

            );

        }


        /*
         * Object langsung
         */

        let ticket =
            getTTNumberFromObject(
                row
            );


        if (ticket) {

            return ticket;

        }


        /*
         * Field sumber yang mungkin menyimpan
         * baris Excel asli.
         */

        const sourceFields = [

            "originalRow",

            "source",

            "rowData",

            "data",

            "rawRow",

            "excelRow",

            "sourceRow",

            "originalData"

        ];


        for (
            const field of sourceFields
        ) {

            const candidate =
                row[field];


            /*
             * Kalau array:
             * ambil kolom D.
             */

            if (
                Array.isArray(candidate)
            ) {

                ticket =
                    getTTNumberFromArray(
                        candidate
                    );


                if (ticket) {

                    return ticket;

                }

            }


            /*
             * Kalau object:
             * cari TT Number.
             */

            if (

                candidate &&

                typeof candidate ===
                    "object"

            ) {

                ticket =
                    getTTNumberFromObject(
                        candidate
                    );


                if (ticket) {

                    return ticket;

                }

            }

        }


        /*
         * Metadata
         */

        const metadata =
            row.metadata ||
            row.meta;


        ticket =
            getTTNumberFromObject(
                metadata
            );


        if (ticket) {

            return ticket;

        }


        return "-";

    }


    /* =====================================================
       PAGINATION
       
       Setiap TAB mempunyai pagination sendiri.
       
       valid
       invalid
       material
       material-error
       
       Jumlah tampilan = 10 data.
    ===================================================== */

    function resetPagination() {

        state.pages = {

            valid: 1,

            invalid: 1,

            material: 1,

            "material-error": 1

        };

    }


    function getPageKey() {

        const allowed = [

            "valid",

            "invalid",

            "material",

            "material-error"

        ];


        if (
            allowed.includes(
                state.activeTab
            )
        ) {

            return state.activeTab;

        }


        return "valid";

    }


    function paginateRows(
        rows,
        tabKey
    ) {

        if (!Array.isArray(rows)) {

            return {

                rows: [],

                page: 1,

                totalPages: 1,

                totalRows: 0,

                start: 0,

                end: 0

            };

        }


        const totalRows =
            rows.length;


        const pageSize =
            state.pageSize;


        const totalPages =
            Math.max(
                1,
                Math.ceil(
                    totalRows /
                    pageSize
                )
            );


        let page =
            Number(
                state.pages[
                    tabKey
                ] || 1
            );


        /*
         * Kalau halaman melebihi
         * halaman terakhir.
         */

        if (
            page > totalPages
        ) {

            page =
                totalPages;


            state.pages[
                tabKey
            ] =
                page;

        }


        if (page < 1) {

            page = 1;


            state.pages[
                tabKey
            ] =
                1;

        }


        const start =
            (
                page - 1
            ) *
            pageSize;


        const end =
            Math.min(
                start +
                    pageSize,
                totalRows
            );


        return {

            rows:
                rows.slice(
                    start,
                    end
                ),

            page,

            totalPages,

            totalRows,

            start,

            end

        };

    }


    /* =====================================================
       RENDER PAGINATION
    ===================================================== */

    function renderPagination(
        containerSelector,
        rows,
        tabKey
    ) {

        const container =
            $(
                containerSelector
            );


        if (!container) {

            return;

        }


        const pagination =
            paginateRows(
                rows,
                tabKey
            );


        container.innerHTML =
            "";


        /*
         * Jika data <= 10,
         * pagination tidak ditampilkan.
         */

        if (
            pagination.totalRows <=
            state.pageSize
        ) {

            return;

        }


        const wrapper =
            document.createElement(
                "div"
            );


        wrapper.className =
            "pagination";


        /*
         * BUTTON SEBELUMNYA
         */

        const prev =
            document.createElement(
                "button"
            );


        prev.type =
            "button";


        prev.className =
            "pagination-btn";


        prev.textContent =
            "‹ Sebelumnya";


        prev.disabled =
            pagination.page <= 1;


        prev.addEventListener(
            "click",
            function () {

                if (
                    pagination.page <= 1
                ) {

                    return;

                }


                state.pages[
                    tabKey
                ] =
                    pagination.page - 1;


                renderCurrentTab();

            }
        );


        wrapper.appendChild(
            prev
        );


        /*
         * INFO HALAMAN
         */

        const pageInfo =
            document.createElement(
                "span"
            );


        pageInfo.className =
            "pagination-info";


        const from =
            pagination.totalRows === 0
                ? 0
                : pagination.start + 1;


        const to =
            pagination.end;


        pageInfo.textContent =
            "Halaman " +
            pagination.page +
            " dari " +
            pagination.totalPages +
            " • " +
            from +
            "-" +
            to +
            " dari " +
            pagination.totalRows;


        wrapper.appendChild(
            pageInfo
        );


        /*
         * BUTTON BERIKUTNYA
         */

        const next =
            document.createElement(
                "button"
            );


        next.type =
            "button";


        next.className =
            "pagination-btn";


        next.textContent =
            "Berikutnya ›";


        next.disabled =
            pagination.page >=
            pagination.totalPages;


        next.addEventListener(
            "click",
            function () {

                if (
                    pagination.page >=
                    pagination.totalPages
                ) {

                    return;

                }


                state.pages[
                    tabKey
                ] =
                    pagination.page + 1;


                renderCurrentTab();

            }
        );


        wrapper.appendChild(
            next
        );


        container.appendChild(
            wrapper
        );

    }


    /* =====================================================
       RENDER CURRENT TAB
    ===================================================== */

    function renderCurrentTab() {

        const tab =
            state.activeTab;


        if (
            tab === "valid"
        ) {

            renderValidTable();

            return;

        }


        if (
            tab === "invalid"
        ) {

            renderInvalidTable();

            return;

        }


        if (
            tab === "material"
        ) {

            renderMaterialTable();

            return;

        }


        if (
            tab === "material-error"
        ) {

            renderMaterialErrorTable();

        }

    }


    /*
     * =====================================================
     *
     * SAMPAI SINI ADALAH TAHAP 1
     *
     * TAHAP 2 AKAN MELANJUTKAN:
     *
     * - renderValidTable()
     * - renderInvalidTable()
     * - renderMaterialTable()
     * - renderMaterialErrorTable()
     * - Search
     * - Tabs
     * - Download
     * - Fallback export
     * - Reset
     * - Init
     * - Public API
     *
     * =====================================================
     */
/* =========================================================
   REPORT CHECKER - APP.JS
   TAHAP 2
   PAGINATION + RENDER TABLE + SEARCH + TABS + DOWNLOAD
========================================================= */


/* =====================================================
   PAGINATION
===================================================== */

/*
 * Setiap TAB mempunyai halaman sendiri.
 *
 * Valid          -> halaman sendiri
 * Invalid        -> halaman sendiri
 * Material       -> halaman sendiri
 * Material Error -> halaman sendiri
 *
 * Jadi pindah halaman di Material tidak mengubah
 * halaman pada Sesuai / Tidak Sesuai.
 */

const paginationState = {

    valid: 1,

    invalid: 1,

    material: 1,

    "material-error": 1

};


/*
 * Jumlah data per halaman.
 *
 * Bisa diganti:
 *
 * 10
 * 25
 * 50
 * 100
 */

const PAGINATION_PAGE_SIZE = 10;


/* =====================================================
   GET CURRENT PAGE
===================================================== */

function getCurrentPage(type) {

    const page =
        Number(
            paginationState[type]
        ) || 1;


    return Math.max(
        1,
        page
    );

}


/* =====================================================
   SET CURRENT PAGE
===================================================== */

function setCurrentPage(
    type,
    page
) {

    const value =
        Number(page) || 1;


    paginationState[type] =
        Math.max(
            1,
            value
        );

}


/* =====================================================
   RESET PAGINATION
===================================================== */

function resetPagination() {

    paginationState.valid =
        1;

    paginationState.invalid =
        1;

    paginationState.material =
        1;

    paginationState["material-error"] =
        1;

}


/* =====================================================
   PAGINATE ROWS
===================================================== */

function paginateRows(
    rows,
    type
) {

    if (!Array.isArray(rows)) {

        return {

            rows: [],

            page: 1,

            totalPages: 1,

            totalRows: 0,

            start: 0,

            end: 0

        };

    }


    const totalRows =
        rows.length;


    const totalPages =
        Math.max(
            1,
            Math.ceil(
                totalRows /
                PAGINATION_PAGE_SIZE
            )
        );


    let page =
        getCurrentPage(type);


    /*
     * Kalau halaman sekarang melebihi
     * jumlah halaman setelah search,
     * otomatis kembali ke halaman terakhir.
     */

    if (
        page > totalPages
    ) {

        page =
            totalPages;


        setCurrentPage(
            type,
            page
        );

    }


    const start =
        (
            page - 1
        ) *
        PAGINATION_PAGE_SIZE;


    const end =
        Math.min(
            start +
            PAGINATION_PAGE_SIZE,
            totalRows
        );


    return {

        rows:
            rows.slice(
                start,
                end
            ),

        page,

        totalPages,

        totalRows,

        start,

        end

    };

}


/* =====================================================
   PAGINATION HTML
===================================================== */

function createPagination(
    type,
    pagination
) {

    const {

        page,

        totalPages,

        totalRows,

        start,

        end

    } = pagination;


    /*
     * Tidak perlu pagination kalau data kosong.
     */

    if (!totalRows) {

        return "";

    }


    /*
     * Kalau cuma 1 halaman,
     * tetap tampilkan informasi jumlah data.
     */

    let html = `

        <div class="pagination-container">

            <div class="pagination-info">

                Menampilkan

                <strong>
                    ${start + 1}
                </strong>

                -

                <strong>
                    ${end}
                </strong>

                dari

                <strong>
                    ${totalRows}
                </strong>

                data

            </div>

            <div class="pagination-controls">

    `;


    /*
     * Tombol PREVIOUS
     */

    html += `

        <button
            type="button"
            class="pagination-btn"
            data-pagination-type="${escapeHtml(type)}"
            data-pagination-page="${page - 1}"
            ${page <= 1 ? "disabled" : ""}
        >
            ‹
        </button>

    `;


    /*
     * Nomor halaman.
     *
     * Contoh:
     *
     * 1 2 3 4 5
     *
     * Kalau halaman banyak:
     *
     * 1 ... 8 9 10 ... 20
     */

    const pageNumbers =
        buildPageNumbers(
            page,
            totalPages
        );


    pageNumbers.forEach(
        function (item) {

            if (
                item === "..."
            ) {

                html += `

                    <span class="pagination-dots">
                        ...
                    </span>

                `;

                return;

            }


            const active =
                item === page;


            html += `

                <button
                    type="button"
                    class="pagination-btn ${active ? "active" : ""}"
                    data-pagination-type="${escapeHtml(type)}"
                    data-pagination-page="${item}"
                >
                    ${item}
                </button>

            `;

        }
    );


    /*
     * Tombol NEXT
     */

    html += `

        <button
            type="button"
            class="pagination-btn"
            data-pagination-type="${escapeHtml(type)}"
            data-pagination-page="${page + 1}"
            ${page >= totalPages ? "disabled" : ""}
        >
            ›
        </button>

    `;


    html += `

            </div>

        </div>

    `;


    return html;

}


/* =====================================================
   BUILD PAGE NUMBERS
===================================================== */

function buildPageNumbers(
    currentPage,
    totalPages
) {

    /*
     * Kalau halaman sedikit,
     * tampilkan semuanya.
     */

    if (
        totalPages <= 7
    ) {

        return Array.from(
            {
                length:
                    totalPages
            },
            function (_, index) {

                return index + 1;

            }
        );

    }


    const pages = [];


    /*
     * Halaman pertama.
     */

    pages.push(1);


    /*
     * Kondisi halaman awal.
     */

    if (
        currentPage <= 4
    ) {

        pages.push(2);
        pages.push(3);
        pages.push(4);
        pages.push(5);
        pages.push("...");
        pages.push(totalPages);


        return pages;

    }


    /*
     * Kondisi halaman akhir.
     */

    if (
        currentPage >=
        totalPages - 3
    ) {

        pages.push("...");

        pages.push(
            totalPages - 4
        );

        pages.push(
            totalPages - 3
        );

        pages.push(
            totalPages - 2
        );

        pages.push(
            totalPages - 1
        );

        pages.push(
            totalPages
        );


        return pages;

    }


    /*
     * Kondisi tengah.
     */

    pages.push("...");

    pages.push(
        currentPage - 1
    );

    pages.push(
        currentPage
    );

    pages.push(
        currentPage + 1
    );

    pages.push("...");

    pages.push(
        totalPages
    );


    return pages;

}


/* =====================================================
   PAGINATION EVENT
===================================================== */

function setupPaginationEvents() {

    document
        .querySelectorAll(
            "[data-pagination-type]"
        )
        .forEach(
            function (button) {

                if (
                    button.dataset.paginationBound
                ) {

                    return;

                }


                button.dataset.paginationBound =
                    "true";


                button.addEventListener(
                    "click",
                    function () {

                        if (
                            button.disabled
                        ) {

                            return;

                        }


                        const type =
                            button.getAttribute(
                                "data-pagination-type"
                            );


                        const page =
                            Number(
                                button.getAttribute(
                                    "data-pagination-page"
                                )
                            );


                        if (
                            !type ||
                            !page
                        ) {

                            return;

                        }


                        setCurrentPage(
                            type,
                            page
                        );


                        /*
                         * Hanya render TAB
                         * yang berubah.
                         *
                         * Tidak mengubah
                         * tab lainnya.
                         */

                        renderSingleTab(
                            type
                        );


                        /*
                         * Scroll sedikit ke tabel.
                         */

                        const table =
                            getTableElement(
                                type
                            );


                        if (table) {

                            table.scrollIntoView(
                                {
                                    behavior:
                                        "smooth",
                                    block:
                                        "start"
                                }
                            );

                        }

                    }
                );

            }
        );

}


/* =====================================================
   GET TABLE ELEMENT
===================================================== */

function getTableElement(type) {

    const map = {

        valid:
            "#validTable",

        invalid:
            "#invalidTable",

        material:
            "#materialTable",

        "material-error":
            "#materialErrorTable"

    };


    return $(
        map[type] || ""
    );

}


/* =====================================================
   GET PAGINATION CONTAINER
===================================================== */

function getPaginationContainer(
    type
) {

    const table =
        getTableElement(type);


    if (!table) {

        return null;

    }


    /*
     * Pagination ditempatkan setelah
     * table-wrapper.
     */

    const wrapper =
        table.closest(
            ".table-wrapper"
        );


    if (!wrapper) {

        return null;

    }


    let pagination =
        wrapper.querySelector(
            ".pagination-container"
        );


    if (!pagination) {

        pagination =
            document.createElement(
                "div"
            );


        pagination.className =
            "pagination-container";


        wrapper.appendChild(
            pagination
        );

    }


    return pagination;

}


/* =====================================================
   RENDER PAGINATION
===================================================== */

function renderPagination(
    type,
    pagination
) {

    const container =
        getPaginationContainer(
            type
        );


    if (!container) {

        return;

    }


    container.outerHTML =
        createPagination(
            type,
            pagination
        );


    /*
     * Setelah HTML pagination dibuat,
     * pasang event tombol.
     */

    setupPaginationEvents();

}


/* =====================================================
   RENDER SINGLE TAB
===================================================== */

function renderSingleTab(
    type
) {

    if (
        type === "valid"
    ) {

        renderValidTable();

        return;

    }


    if (
        type === "invalid"
    ) {

        renderInvalidTable();

        return;

    }


    if (
        type === "material"
    ) {

        renderMaterialTable();

        return;

    }


    if (
        type === "material-error"
    ) {

        renderMaterialErrorTable();

        return;

    }

}


/* =====================================================
   UPDATED VALID TABLE
===================================================== */

function renderValidTable() {

    const tbody =
        $("#validTableBody");

    const empty =
        $("#validEmpty");


    if (!tbody) {

        return;

    }


    const filtered =
        filterRows(
            getValidRows()
        );


    const pagination =
        paginateRows(
            filtered,
            "valid"
        );


    tbody.innerHTML =
        "";


    if (
        !pagination.rows.length
    ) {

        show(
            empty,
            true
        );


        renderPagination(
            "valid",
            pagination
        );


        return;

    }


    show(
        empty,
        false
    );


    pagination.rows.forEach(
        function (row) {

            const ticket =
                getTicketNumber(row);


            const original =
                row?.originalRow ||
                row?.source ||
                row?.rowData ||
                row?.data ||
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
                ) ||

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
                ) ||
                "Tanggal Release sesuai.";


            tbody.insertAdjacentHTML(
                "beforeend",
                `
                <tr>

                    <td>
                        ${escapeHtml(ticket)}
                    </td>

                    <td>
                        ${escapeHtml(receive || "-")}
                    </td>

                    <td>
                        ${escapeHtml(release || "-")}
                    </td>

                    <td>
                        <span class="badge badge-success">
                            SESUAI
                        </span>
                    </td>

                    <td>
                        ${escapeHtml(reason)}
                    </td>

                </tr>
                `
            );

        }
    );


    renderPagination(
        "valid",
        pagination
    );

}


/* =====================================================
   UPDATED INVALID TABLE
===================================================== */

function renderInvalidTable() {

    const tbody =
        $("#invalidTableBody");

    const empty =
        $("#invalidEmpty");


    if (!tbody) {

        return;

    }


    const filtered =
        filterRows(
            getInvalidRows()
        );


    const pagination =
        paginateRows(
            filtered,
            "invalid"
        );


    tbody.innerHTML =
        "";


    if (
        !pagination.rows.length
    ) {

        show(
            empty,
            true
        );


        renderPagination(
            "invalid",
            pagination
        );


        return;

    }


    show(
        empty,
        false
    );


    pagination.rows.forEach(
        function (row) {

            const ticket =
                getTicketNumber(row);


            const original =
                row?.originalRow ||
                row?.source ||
                row?.rowData ||
                row?.data ||
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
                ) ||

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
                ) ||
                "Tanggal Release tidak sesuai.";


            tbody.insertAdjacentHTML(
                "beforeend",
                `
                <tr>

                    <td>
                        ${escapeHtml(ticket)}
                    </td>

                    <td>
                        ${escapeHtml(receive || "-")}
                    </td>

                    <td>
                        ${escapeHtml(release || "-")}
                    </td>

                    <td>
                        <span class="badge badge-danger">
                            TIDAK SESUAI
                        </span>
                    </td>

                    <td>
                        ${escapeHtml(reason)}
                    </td>

                </tr>
                `
            );

        }
    );


    renderPagination(
        "invalid",
        pagination
    );

}


/* =====================================================
   UPDATED MATERIAL TABLE
===================================================== */

function renderMaterialTable() {

    const tbody =
        $("#materialTableBody");

    const empty =
        $("#materialEmpty");


    if (!tbody) {

        return;

    }


    const filtered =
        filterRows(
            getMaterialRows()
        );


    const pagination =
        paginateRows(
            filtered,
            "material"
        );


    tbody.innerHTML =
        "";


    if (
        !pagination.rows.length
    ) {

        show(
            empty,
            true
        );


        renderPagination(
            "material",
            pagination
        );


        return;

    }


    show(
        empty,
        false
    );


    pagination.rows.forEach(
        function (row) {

            const ticket =
                getTicketNumber(row);


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

                    <td>
                        ${escapeHtml(ticket)}
                    </td>

                    <td>
                        ${escapeHtml(material || "-")}
                    </td>

                    <td>
                        ${escapeHtml(qty || "-")}
                    </td>

                    <td>
                        ${escapeHtml(unit || "-")}
                    </td>

                    <td>
                        ${escapeHtml(code || "-")}
                    </td>

                </tr>
                `
            );

        }
    );


    renderPagination(
        "material",
        pagination
    );

}


/* =====================================================
   UPDATED MATERIAL ERROR TABLE
===================================================== */

function renderMaterialErrorTable() {

    const tbody =
        $("#materialErrorTableBody");

    const empty =
        $("#materialErrorEmpty");


    if (!tbody) {

        return;

    }


    const filtered =
        filterRows(
            getMaterialErrorRows()
        );


    const pagination =
        paginateRows(
            filtered,
            "material-error"
        );


    tbody.innerHTML =
        "";


    if (
        !pagination.rows.length
    ) {

        show(
            empty,
            true
        );


        renderPagination(
            "material-error",
            pagination
        );


        return;

    }


    show(
        empty,
        false
    );


    pagination.rows.forEach(
        function (row) {

            const ticket =
                getTicketNumber(row);


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
                ) ||
                "Material gagal diproses.";


            tbody.insertAdjacentHTML(
                "beforeend",
                `
                <tr>

                    <td>
                        ${escapeHtml(ticket)}
                    </td>

                    <td>
                        ${escapeHtml(material || "-")}
                    </td>

                    <td>
                        ${escapeHtml(qty || "-")}
                    </td>

                    <td>
                        ${escapeHtml(unit || "-")}
                    </td>

                    <td>
                        ${escapeHtml(code || "-")}
                    </td>

                    <td>
                        ${escapeHtml(error)}
                    </td>

                </tr>
                `
            );

        }
    );


    renderPagination(
        "material-error",
        pagination
    );

}


/* =====================================================
   UPDATED SEARCH
===================================================== */

function filterRows(rows) {

    if (!Array.isArray(rows)) {

        return [];

    }


    const query =
        String(
            state.search || ""
        )
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


            /*
             * Search Ticket.
             */

            const ticket =
                getTicketNumber(row);


            if (
                String(ticket)
                    .toLowerCase()
                    .includes(query)
            ) {

                return true;

            }


            /*
             * Search semua field.
             */

            return Object
                .values(row)
                .some(
                    function (value) {

                        /*
                         * Kalau array/object,
                         * ubah menjadi string aman.
                         */

                        let text;


                        try {

                            if (
                                typeof value ===
                                "object"
                            ) {

                                text =
                                    JSON.stringify(
                                        value
                                    );

                            } else {

                                text =
                                    String(
                                        value ??
                                        ""
                                    );

                            }

                        } catch (error) {

                            text =
                                String(
                                    value ??
                                    ""
                                );

                        }


                        return text
                            .toLowerCase()
                            .includes(query);

                    }
                );

        }
    );

}


/* =====================================================
   UPDATED SEARCH SETUP
===================================================== */

function setupSearch() {

    const inputs =
        $$(
            "#searchInput, #globalSearch, [data-search]"
        );


    inputs.forEach(
        function (input) {

            if (
                input.dataset.bound
            ) {

                return;

            }


            input.dataset.bound =
                "true";


            input.addEventListener(
                "input",
                function () {

                    state.search =
                        String(
                            input.value ||
                            ""
                        );


                    /*
                     * Search baru -> semua
                     * kategori kembali ke
                     * halaman 1.
                     */

                    resetPagination();


                    /*
                     * Render semua TAB
                     * dengan hasil search.
                     */

                    renderValidTable();

                    renderInvalidTable();

                    renderMaterialTable();

                    renderMaterialErrorTable();

                }
            );

        }
    );

}


/* =====================================================
   UPDATED TAB SETUP
===================================================== */

function setupTabs() {

    $$("[data-tab]")
        .forEach(
            function (button) {

                if (
                    button.dataset.bound
                ) {

                    return;

                }


                button.dataset.bound =
                    "true";


                button.addEventListener(
                    "click",
                    function (event) {

                        event.preventDefault();


                        const tab =
                            button.getAttribute(
                                "data-tab"
                            );


                        if (!tab) {

                            return;

                        }


                        state.activeTab =
                            tab;


                        updateTabs();


                        /*
                         * Render ulang TAB yang
                         * sedang dibuka saja.
                         */

                        renderSingleTab(
                            tab
                        );

                    }
                );

            }
        );

}


/* =====================================================
   UPDATED UPDATE TABS
===================================================== */

function updateTabs() {

    $$(".tab-button")
        .forEach(
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
                    content.id || "";


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
   UPDATED RESET
===================================================== */

function setupReset() {

    const button =
        $("#resetBtn");


    if (!button) {

        return;

    }


    if (
        button.dataset.resetBound
    ) {

        return;

    }


    button.dataset.resetBound =
        "true";


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


            resetPagination();


            /*
             * Bersihkan search input.
             */

            $$(
                "#searchInput, #globalSearch, [data-search]"
            )
            .forEach(
                function (input) {

                    input.value =
                        "";

                }
            );


            updateTabs();


            setSystemStatus(
                "Ready",
                "offline"
            );

        }
    );

}


/* =====================================================
   UPDATED RESET APPLICATION DATA
===================================================== */

function resetApplicationData() {

    try {

        if (

            window.ReportCheckerExcel &&

            typeof window.ReportCheckerExcel
                .reset === "function"

        ) {

            window.ReportCheckerExcel.reset();

        }

    } catch (error) {

        console.error(
            "Excel reset error:",
            error
        );

    }


    resetPagination();


    clearTables();


    try {

        updateDashboard();

    } catch (error) {

        console.error(
            "Dashboard reset error:",
            error
        );

    }

}


/* =====================================================
   CLEAR TABLES
===================================================== */

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


    /*
     * Hapus pagination lama.
     */

    $$(".pagination-container")
        .forEach(
            function (element) {

                element.remove();

            }
        );

}


/* =====================================================
   UPDATED PROCESS EXCEL
===================================================== */

async function processExcel(file) {

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


        if (!window.ReportCheckerExcel) {

            throw new Error(
                "excel.js belum berhasil dimuat."
            );

        }


        if (
            typeof window.ReportCheckerExcel.load !==
            "function"
        ) {

            throw new Error(
                "Fungsi load() belum tersedia di excel.js."
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


        await yieldToBrowser();


        const result =
            await window.ReportCheckerExcel.load(
                file
            );


        /*
         * Setelah file baru diproses,
         * semua pagination kembali
         * ke halaman 1.
         */

        resetPagination();


        state.page =
            1;


        state.search =
            "";


        /*
         * Bersihkan search.
         */

        $$(
            "#searchInput, #globalSearch, [data-search]"
        )
        .forEach(
            function (input) {

                input.value =
                    "";

            }
        );


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
            buildSummaryText(result)
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


/* =====================================================
   UPDATE DASHBOARD
===================================================== */

function updateDashboard() {

    let data;


    try {

        data =
            getData();

    } catch (error) {

        console.error(
            "Dashboard data error:",
            error
        );

        return;

    }


    const summary =
        data.summary ||
        {};


    const total =
        summary.total ??
        data.validationResults?.length ??
        data.rows?.length ??
        0;


    const sesuai =
        summary.sesuai ??
        data.sesuai?.length ??
        data.valid?.length ??
        0;


    const tidakSesuai =
        summary.tidakSesuai ??
        data.tidakSesuai?.length ??
        data.invalid?.length ??
        0;


    const material =
        summary.material ??
        data.materials?.length ??
        data.material?.length ??
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


    /*
     * Setiap kategori dirender sendiri.
     *
     * Contoh:
     *
     * Sesuai 176
     * -> 18 halaman
     *
     * Tidak Sesuai 16
     * -> 2 halaman
     *
     * Material 21
     * -> 3 halaman
     *
     * Material Error 172
     * -> 18 halaman
     */

    renderValidTable();

    renderInvalidTable();

    renderMaterialTable();

    renderMaterialErrorTable();


    updateDownloadButtons();

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


/* =====================================================
   BIND DOWNLOAD
===================================================== */

function bindDownload(
    selector,
    type
) {

    const button =
        $(selector);


    if (!button) {

        return;

    }


    if (
        button.dataset.downloadBound
    ) {

        return;

    }


    button.dataset.downloadBound =
        "true";


    button.addEventListener(
        "click",
        function () {

            downloadResult(type);

        }
    );

}


/* =====================================================
   DOWNLOAD RESULT
===================================================== */

function downloadResult(type) {

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

        /*
         * PENTING:
         *
         * Pagination HANYA untuk tampilan.
         *
         * Download TIDAK mengambil
         * 10 data yang sedang tampil.
         *
         * Download tetap mengambil
         * SEMUA data kategori.
         */


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
            error
        );


        alert(
            error?.message ||
            "Gagal membuat file Excel."
        );

    }

}


/* =====================================================
   FALLBACK EXPORT
===================================================== */

function fallbackExport(type) {

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


    /*
     * Pastikan DOWNLOAD tidak terkena pagination.
     *
     * Kita sengaja menggunakan rows asli,
     * bukan paginateRows().
     */

    const cleanRows =
        rows.map(
            function (row) {

                const output =
                    {};


                /*
                 * MATERIAL
                 */

                if (
                    type === "material" ||
                    type === "material-error"
                ) {

                    output["Ticket"] =
                        getTicketNumber(
                            row
                        );


                    output["Material"] =
                        getValue(
                            row,
                            [
                                "material",
                                "Material",
                                "name",
                                "Name",
                                "materialName"
                            ]
                        );


                    output["Qty"] =
                        getValue(
                            row,
                            [
                                "qty",
                                "Qty",
                                "quantity",
                                "Quantity"
                            ]
                        );


                    output["Satuan"] =
                        getValue(
                            row,
                            [
                                "satuan",
                                "Satuan",
                                "unit",
                                "Unit"
                            ]
                        );


                    output["Kode"] =
                        getValue(
                            row,
                            [
                                "kode",
                                "Kode",
                                "code",
                                "Code",
                                "materialCode"
                            ]
                        );


                    if (
                        type ===
                        "material-error"
                    ) {

                        output["Error"] =
                            getValue(
                                row,
                                [
                                    "error",
                                    "reason",
                                    "message",
                                    "keterangan",
                                    "note"
                                ]
                            ) ||
                            "Material gagal diproses.";

                    }


                    return output;

                }


                /*
                 * VALID / INVALID
                 */

                Object.keys(
                    row || {}
                )
                .forEach(
                    function (key) {

                        if (
                            key ===
                            "originalRow" ||

                            key ===
                            "source" ||

                            key ===
                            "rowData" ||

                            key ===
                            "data"
                        ) {

                            return;

                        }


                        output[key] =
                            row[key];

                    }
                );


                /*
                 * Pastikan Ticket tetap ada.
                 */

                output["Ticket"] =
                    getTicketNumber(
                        row
                    );


                return output;

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


    /*
     * Download SEMUA data.
     */

    XLSX.writeFile(
        workbook,
        filename
    );

}


/* =====================================================
   DOWNLOAD BUTTON STATE
===================================================== */

function updateDownloadButtons() {

    setButtonState(
        "#downloadValidBtn",
        getValidRows().length > 0
    );


    setButtonState(
        "#downloadInvalidBtn",
        getInvalidRows().length > 0
    );


    setButtonState(
        "#downloadMaterialBtn",
        getMaterialRows().length > 0
    );


    setButtonState(
        "#downloadMaterialErrorBtn",
        getMaterialErrorRows().length > 0
    );

}


/* =====================================================
   BUTTON STATE
===================================================== */

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
   EXTRA CSS PAGINATION
   Dibuat lewat JS supaya tidak wajib
   mengubah style.css terlebih dahulu.
===================================================== */

function injectPaginationStyle() {

    if (
        document.getElementById(
            "reportCheckerPaginationStyle"
        )
    ) {

        return;

    }


    const style =
        document.createElement(
            "style"
        );


    style.id =
        "reportCheckerPaginationStyle";


    style.textContent = `

        .pagination-container {

            display: flex;

            justify-content: space-between;

            align-items: center;

            gap: 16px;

            padding: 16px 4px;

            margin-top: 12px;

            border-top: 1px solid #e5e7eb;

            flex-wrap: wrap;

        }


        .pagination-info {

            color: #6b7280;

            font-size: 13px;

        }


        .pagination-info strong {

            color: #111827;

        }


        .pagination-controls {

            display: flex;

            align-items: center;

            gap: 5px;

        }


        .pagination-btn {

            min-width: 34px;

            height: 34px;

            padding: 0 9px;

            border: 1px solid #d1d5db;

            border-radius: 7px;

            background: #ffffff;

            color: #374151;

            cursor: pointer;

            font-size: 13px;

            transition:
                background .15s ease,
                color .15s ease,
                border-color .15s ease;

        }


        .pagination-btn:hover:not(:disabled) {

            background: #f3f4f6;

            border-color: #9ca3af;

        }


        .pagination-btn.active {

            background: #2563eb;

            color: #ffffff;

            border-color: #2563eb;

        }


        .pagination-btn:disabled {

            opacity: .45;

            cursor: not-allowed;

        }


        .pagination-dots {

            min-width: 24px;

            text-align: center;

            color: #9ca3af;

        }


        @media (max-width: 640px) {

            .pagination-container {

                align-items: flex-start;

                flex-direction: column;

            }


            .pagination-controls {

                width: 100%;

                overflow-x: auto;

                padding-bottom: 3px;

            }

        }

    `;


    document.head.appendChild(
        style
    );

}


/* =====================================================
   INIT PAGINATION
===================================================== */

function initPagination() {

    injectPaginationStyle();

    setupPaginationEvents();

}


/* =====================================================
   START PAGINATION
===================================================== */

try {

    initPagination();

} catch (error) {

    console.error(
        "Pagination initialization error:",
        error
    );

}


/* =====================================================
   PUBLIC API TAMBAHAN
===================================================== */

if (
    window.ReportCheckerApp
) {

    window.ReportCheckerApp
        .pagination = {

            getState:
                function () {

                    return {
                        ...paginationState
                    };

                },

            setPage:
                function (
                    type,
                    page
                ) {

                    setCurrentPage(
                        type,
                        page
                    );


                    renderSingleTab(
                        type
                    );

                },

            reset:
                resetPagination

        };

}


/* =====================================================
   END TAHAP 2
===================================================== */
