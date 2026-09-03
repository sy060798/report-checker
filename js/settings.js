/* =========================================================
   REPORT CHECKER
   settings.js
   ---------------------------------------------------------
   Fungsi:
   - Menyimpan daftar material dari textarea HTML
   - Membaca material dari #materialList
   - Sinkron dengan Material Parser
   - Simpan ke localStorage
   - Reset ke daftar default
   - Mendukung perubahan setting tanpa reload
========================================================= */

(function () {

    "use strict";


    /* =====================================================
       CONFIG
    ====================================================== */

    const STORAGE_KEY =
        "report_checker_parser_settings";


    /* =====================================================
       DEFAULT MATERIAL
       
       Harus sama dengan placeholder di HTML.
    ====================================================== */

    const DEFAULT_MATERIALS = [

        "Pigtail",
        "Patchcord",
        "Splitter 1:2",
        "Splitter 1:4",
        "Splitter 1:8",
        "Splitter 1:16",

        "2C (METER)",
        "12C (METER)",
        "24C (METER)",
        "48C (METER)",
        "96C (METER)",

        "DPFO",

        "12C DOME (UNIT)",
        "24C DOME (UNIT)",
        "48C DOME (UNIT)",
        "96C DOME (UNIT)",
        "144C DOME (UNIT)",

        "12C INLANE (UNIT)",
        "24C INLANE (UNIT)",
        "48C INLINE (UNIT)",
        "96C INLINE (UNIT)",
        "144C INLINE (UNIT)",

        "Fixing Slack",
        "Kaset JB",
        "Terminal Roset (Unit)",

        "Tiang 7 (Batang)",
        "Tiang 9 (Batang)",

        "Subduct",

        "Handhole 40 x 40",
        "Handhole 60 x 60",
        "Handhole 80 x 80"

    ];


    /* =====================================================
       HELPER
    ====================================================== */

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

            .replace(/[ \t]+/g, " ")

            .trim();

    }


    /* =====================================================
       NORMALIZE MATERIAL
    ====================================================== */

    function normalizeMaterial(value) {

        return normalizeText(value)

            .replace(/\s+/g, " ")

            .trim();

    }


    /* =====================================================
       REMOVE DUPLICATE
    ====================================================== */

    function uniqueMaterials(
        materials
    ) {

        const result = [];

        const seen =
            new Set();


        for (
            const item
            of materials || []
        ) {

            const material =
                normalizeMaterial(
                    item
                );


            if (!material) {

                continue;

            }


            const key =
                material
                    .toLowerCase();


            if (
                seen.has(key)
            ) {

                continue;

            }


            seen.add(key);

            result.push(
                material
            );

        }


        return result;

    }


    /* =====================================================
       GET TEXTAREA
    ====================================================== */

    function getMaterialTextarea() {

        /*
         * HTML kamu menggunakan:
         *
         * id="materialList"
         *
         * Jadi ini prioritas utama.
         */

        let textarea =
            document.getElementById(
                "materialList"
            );


        /*
         * Fallback untuk versi HTML lama.
         */

        if (!textarea) {

            textarea =
                document.getElementById(
                    "materialNames"
                );

        }


        return textarea;

    }


    /* =====================================================
       DEFAULT SETTINGS
    ====================================================== */

    function getDefaultSettings() {

        const materials =
            uniqueMaterials(
                DEFAULT_MATERIALS
            );


        return {

            materialNames:
                materials,

            materials:
                materials,

            materialList:
                materials,

            materialNamesList:
                materials,

            version:
                2

        };

    }


    /* =====================================================
       SAVE SETTINGS
    ====================================================== */

    function saveSettings(
        settings
    ) {

        try {

            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(
                    settings
                )
            );


            return true;

        }

        catch (error) {

            console.error(
                "Gagal menyimpan settings:",
                error
            );


            return false;

        }

    }


    /* =====================================================
       LOAD SETTINGS
    ====================================================== */

    function loadSettings() {

        try {

            const saved =
                localStorage.getItem(
                    STORAGE_KEY
                );


            if (!saved) {

                return getDefaultSettings();

            }


            const parsed =
                JSON.parse(
                    saved
                );


            if (
                !parsed ||
                typeof parsed !==
                "object"
            ) {

                return getDefaultSettings();

            }


            let materials = [];


            /*
             * Prioritas materialNames.
             */

            if (
                Array.isArray(
                    parsed.materialNames
                )
            ) {

                materials =
                    parsed.materialNames;

            }

            /*
             * Fallback materials.
             */

            else if (
                Array.isArray(
                    parsed.materials
                )
            ) {

                materials =
                    parsed.materials;

            }

            /*
             * Fallback materialList.
             */

            else if (
                Array.isArray(
                    parsed.materialList
                )
            ) {

                materials =
                    parsed.materialList;

            }


            materials =
                uniqueMaterials(
                    materials
                );


            /*
             * Kalau data tersimpan kosong,
             * gunakan default.
             */

            if (
                materials.length === 0
            ) {

                return getDefaultSettings();

            }


            return {

                ...parsed,

                materialNames:
                    materials,

                materials:
                    materials,

                materialList:
                    materials,

                materialNamesList:
                    materials

            };

        }

        catch (error) {

            console.warn(
                "Settings rusak, menggunakan default:",
                error
            );


            return getDefaultSettings();

        }

    }


    /* =====================================================
       GET PARSER SETTINGS
       
       Dipanggil oleh material-parser.js
    ====================================================== */

    function getParserSettings() {

        return loadSettings();

    }


    /* =====================================================
       READ MATERIAL FROM HTML
    ====================================================== */

    function readMaterialsFromHTML() {

        const textarea =
            getMaterialTextarea();


        if (!textarea) {

            return [];

        }


        const materials =
            textarea.value
                .split(/\r?\n/)
                .map(
                    normalizeMaterial
                )
                .filter(
                    Boolean
                );


        return uniqueMaterials(
            materials
        );

    }


    /* =====================================================
       SAVE MATERIAL FROM HTML
    ====================================================== */

    function saveMaterialSettings() {

        const textarea =
            getMaterialTextarea();


        if (!textarea) {

            console.warn(
                "Textarea material tidak ditemukan."
            );


            return false;

        }


        const materials =
            readMaterialsFromHTML();


        if (
            materials.length === 0
        ) {

            alert(
                "Daftar material tidak boleh kosong."
            );


            return false;

        }


        const settings = {

            materialNames:
                materials,

            materials:
                materials,

            materialList:
                materials,

            materialNamesList:
                materials,

            version:
                2,

            updatedAt:
                new Date()
                    .toISOString()

        };


        const saved =
            saveSettings(
                settings
            );


        if (!saved) {

            alert(
                "Pengaturan gagal disimpan."
            );


            return false;

        }


        /*
         * Update global.
         */

        window.PARSER_SETTINGS =
            settings;


        window.parserSettings =
            settings;


        /*
         * Beritahu parser kalau tersedia.
         */

        if (
            window.ReportCheckerMaterial &&
            typeof window
                .ReportCheckerMaterial
                .refreshSettings ===
                "function"
        ) {

            try {

                window
                    .ReportCheckerMaterial
                    .refreshSettings();

            }

            catch (error) {

                console.warn(
                    "Gagal refresh Material Parser:",
                    error
                );

            }

        }


        /*
         * Event agar komponen lain
         * mengetahui settings berubah.
         */

        try {

            window.dispatchEvent(
                new CustomEvent(
                    "parserSettingsChanged",
                    {
                        detail: settings
                    }
                )
            );

        }

        catch (error) {

            console.warn(
                "Event settings gagal:",
                error
            );

        }


        return true;

    }


    /* =====================================================
       RESET SETTINGS
    ====================================================== */

    function resetSettings() {

        const settings =
            getDefaultSettings();


        const textarea =
            getMaterialTextarea();


        if (textarea) {

            textarea.value =
                settings
                    .materialNames
                    .join("\n");

        }


        saveSettings(
            settings
        );


        window.PARSER_SETTINGS =
            settings;


        window.parserSettings =
            settings;


        try {

            window.dispatchEvent(
                new CustomEvent(
                    "parserSettingsChanged",
                    {
                        detail: settings
                    }
                )
            );

        }

        catch (error) {

            console.warn(
                "Event reset settings gagal:",
                error
            );

        }


        return settings;

    }


    /* =====================================================
       LOAD INTO HTML
    ====================================================== */

    function loadSettingsToHTML() {

        const textarea =
            getMaterialTextarea();


        if (!textarea) {

            return false;

        }


        const settings =
            loadSettings();


        const materials =
            Array.isArray(
                settings.materialNames
            )
                ? settings.materialNames
                : DEFAULT_MATERIALS;


        textarea.value =
            materials.join(
                "\n"
            );


        return true;

    }


    /* =====================================================
       INITIALIZE
    ====================================================== */

    function initializeSettings() {

        const settings =
            loadSettings();


        /*
         * Global settings.
         */

        window.PARSER_SETTINGS =
            settings;


        window.parserSettings =
            settings;


        /*
         * Tunggu DOM kalau belum siap.
         */

        if (
            document.readyState ===
            "loading"
        ) {

            document.addEventListener(
                "DOMContentLoaded",
                function () {

                    loadSettingsToHTML();

                    setupButtons();

                },
                {
                    once: true
                }
            );

        }

        else {

            loadSettingsToHTML();

            setupButtons();

        }

    }


    /* =====================================================
       SETUP BUTTON
    ====================================================== */

    function setupButtons() {

        const saveButton =
            document.getElementById(
                "saveSettingsBtn"
            );


        const resetButton =
            document.getElementById(
                "resetSettingsBtn"
            );


        const savedMessage =
            document.getElementById(
                "settingsSavedMessage"
            );


        if (saveButton) {

            /*
             * Hindari event double.
             */

            if (
                saveButton.dataset
                    .settingsBound ===
                "true"
            ) {

                return;

            }


            saveButton.dataset
                .settingsBound =
                "true";


            saveButton.addEventListener(
                "click",
                function () {

                    const success =
                        saveMaterialSettings();


                    if (
                        success &&
                        savedMessage
                    ) {

                        savedMessage
                            .classList
                            .remove(
                                "hidden"
                            );


                        setTimeout(
                            function () {

                                savedMessage
                                    .classList
                                    .add(
                                        "hidden"
                                    );

                            },
                            2500
                        );

                    }

                }
            );

        }


        if (resetButton) {

            if (
                resetButton.dataset
                    .settingsBound ===
                "true"
            ) {

                return;

            }


            resetButton.dataset
                .settingsBound =
                "true";


            resetButton.addEventListener(
                "click",
                function () {

                    const confirmed =
                        confirm(
                            "Reset daftar material ke default?"
                        );


                    if (!confirmed) {

                        return;

                    }


                    resetSettings();


                    if (
                        savedMessage
                    ) {

                        savedMessage
                            .textContent =
                            "✓ Pengaturan berhasil di-reset.";


                        savedMessage
                            .classList
                            .remove(
                                "hidden"
                            );


                        setTimeout(
                            function () {

                                savedMessage
                                    .classList
                                    .add(
                                        "hidden"
                                    );


                                savedMessage
                                    .textContent =
                                    "✓ Pengaturan berhasil disimpan.";

                            },
                            2500
                        );

                    }

                }
            );

        }

    }


    /* =====================================================
       PUBLIC API
    ====================================================== */

    window.ReportCheckerSettings = {

        get:
            getParserSettings,

        getParserSettings:
            getParserSettings,

        getMaterials:
            function () {

                return loadSettings()
                    .materialNames
                    .slice();

            },

        getDefault:
            getDefaultSettings,

        save:
            saveMaterialSettings,

        reset:
            resetSettings,

        load:
            loadSettingsToHTML,

        readFromHTML:
            readMaterialsFromHTML,

        storageKey:
            STORAGE_KEY

    };


    /*
     * API yang dicari material-parser.js
     */

    window.getParserSettings =
        getParserSettings;


    /*
     * Global settings.
     */

    window.PARSER_SETTINGS =
        loadSettings();


    window.parserSettings =
        window.PARSER_SETTINGS;


    /*
     * Initialize.
     */

    initializeSettings();


    console.log(
        "Settings.js aktif. Material:",
        window.PARSER_SETTINGS
            .materialNames
    );


})();
