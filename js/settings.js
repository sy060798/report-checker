/* =========================================================
   REPORT CHECKER
   settings.js
   ---------------------------------------------------------
   Fungsi:
   - Menyimpan Nama Material
   - Menyimpan Frasa / Kunci Material
   - Sinkron dengan HTML
   - Simpan ke localStorage
   - Reset ke default
   - Dipakai langsung oleh material-parser.js
========================================================= */

(function () {

    "use strict";


    /* =====================================================
       STORAGE
    ====================================================== */

    const STORAGE_KEY =
        "report_checker_parser_settings";


    /* =====================================================
       DEFAULT NAMA MATERIAL
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
       DEFAULT FRASA / KUNCI MATERIAL
       
       Ini BUKAN nama material.
       
       Ini adalah kata/kalimat yang menandakan
       bahwa bagian material dimulai di dalam CIR.
    ====================================================== */

    const DEFAULT_MATERIAL_KEYWORDS = [

        "Material",
        "Matreial",
        "Materrial",
        "Materil",
        "Materials",

        "Material:",
        "Material :",

        "Matreial:",
        "Matreial :",

        "Materrial:",
        "Materrial :",

        "Materil:",
        "Materil :"

    ];


    /* =====================================================
       HELPER
    ====================================================== */

    function cleanText(value) {

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


    function normalizeText(value) {

        return cleanText(value)
            .replace(/\s+/g, " ")
            .toLowerCase();

    }


    function uniqueList(list) {

        const result = [];
        const seen = new Set();


        (Array.isArray(list)
            ? list
            : []
        ).forEach(function (item) {

            const value =
                cleanText(item);


            if (!value) {
                return;
            }


            const key =
                normalizeText(value);


            if (!seen.has(key)) {

                seen.add(key);

                result.push(value);

            }

        });


        return result;

    }


    /* =====================================================
       DEFAULT SETTINGS
    ====================================================== */

    function getDefaultSettings() {

        return {

            materialNames:
                [...DEFAULT_MATERIALS],

            materialKeywords:
                [...DEFAULT_MATERIAL_KEYWORDS]

        };

    }


    /* =====================================================
       LOAD STORAGE
    ====================================================== */

    function loadSettings() {

        const defaults =
            getDefaultSettings();


        try {

            const saved =
                localStorage.getItem(
                    STORAGE_KEY
                );


            if (!saved) {

                return defaults;

            }


            const parsed =
                JSON.parse(
                    saved
                );


            if (
                !parsed ||
                typeof parsed !== "object"
            ) {

                return defaults;

            }


            const materialNames =
                Array.isArray(
                    parsed.materialNames
                )
                    ? uniqueList(
                        parsed.materialNames
                    )
                    : defaults.materialNames;


            const materialKeywords =
                Array.isArray(
                    parsed.materialKeywords
                )
                    ? uniqueList(
                        parsed.materialKeywords
                    )
                    : defaults.materialKeywords;


            return {

                materialNames,

                materialKeywords

            };

        }

        catch (error) {

            console.warn(
                "Gagal membaca pengaturan parser:",
                error
            );


            return defaults;

        }

    }


    /* =====================================================
       SAVE STORAGE
    ====================================================== */

    function saveSettings(
        settings
    ) {

        const data = {

            materialNames:
                uniqueList(
                    settings?.materialNames
                ),

            materialKeywords:
                uniqueList(
                    settings?.materialKeywords
                )

        };


        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(data)
        );


        return data;

    }


    /* =====================================================
       GET PARSER SETTINGS
       
       Dipanggil oleh material-parser.js
    ====================================================== */

    function getParserSettings() {

        return loadSettings();

    }


    /* =====================================================
       UPDATE HTML
    ====================================================== */

    function updateHTML(
        settings
    ) {

        /*
         * Nama Material
         */

        const materialList =
            document.getElementById(
                "materialList"
            );


        if (materialList) {

            materialList.value =
                (
                    settings.materialNames ||
                    []
                ).join("\n");

        }


        /*
         * Frasa / Kunci Material
         */

        const keywordList =
            document.getElementById(
                "materialKeywordList"
            );


        if (keywordList) {

            keywordList.value =
                (
                    settings.materialKeywords ||
                    []
                ).join("\n");

        }

    }


    /* =====================================================
       READ HTML
    ====================================================== */

    function readHTML() {

        const materialList =
            document.getElementById(
                "materialList"
            );


        const keywordList =
            document.getElementById(
                "materialKeywordList"
            );


        let materialNames = [];


        let materialKeywords = [];


        /*
         * Nama Material
         */

        if (materialList) {

            materialNames =
                materialList.value
                    .split(/\r?\n/)
                    .map(cleanText)
                    .filter(Boolean);

        }


        /*
         * Frasa / Kunci Material
         */

        if (keywordList) {

            materialKeywords =
                keywordList.value
                    .split(/\r?\n/)
                    .map(cleanText)
                    .filter(Boolean);

        }


        return {

            materialNames:
                uniqueList(
                    materialNames
                ),

            materialKeywords:
                uniqueList(
                    materialKeywords
                )

        };

    }


    /* =====================================================
       SAVE DARI HTML
    ====================================================== */

    function saveFromHTML() {

        const htmlSettings =
            readHTML();


        /*
         * Kalau textarea frasa belum ada,
         * pertahankan keyword lama/default.
         */

        if (
            !htmlSettings
                .materialKeywords
                .length
        ) {

            const current =
                loadSettings();


            htmlSettings.materialKeywords =
                current.materialKeywords.length
                    ? current.materialKeywords
                    : [
                        ...DEFAULT_MATERIAL_KEYWORDS
                    ];

        }


        /*
         * Kalau material kosong,
         * jangan menghapus daftar material.
         */

        if (
            !htmlSettings
                .materialNames
                .length
        ) {

            const current =
                loadSettings();


            htmlSettings.materialNames =
                current.materialNames.length
                    ? current.materialNames
                    : [
                        ...DEFAULT_MATERIALS
                    ];

        }


        const saved =
            saveSettings(
                htmlSettings
            );


        /*
         * Update global
         */

        window.PARSER_SETTINGS =
            saved;


        window.parserSettings =
            saved;


        return saved;

    }


    /* =====================================================
       RESET
    ====================================================== */

    function resetSettings() {

        const defaults =
            getDefaultSettings();


        saveSettings(
            defaults
        );


        updateHTML(
            defaults
        );


        window.PARSER_SETTINGS =
            defaults;


        window.parserSettings =
            defaults;


        return defaults;

    }


    /* =====================================================
       INITIALIZE
    ====================================================== */

    function initialize() {

        const settings =
            loadSettings();


        updateHTML(
            settings
        );


        /*
         * Global untuk kompatibilitas
         * dengan material-parser.js
         */

        window.PARSER_SETTINGS =
            settings;


        window.parserSettings =
            settings;


        /*
         * Global function
         */

        window.getParserSettings =
            getParserSettings;


        window.saveParserSettings =
            saveFromHTML;


        window.resetParserSettings =
            resetSettings;


        console.log(
            "Settings parser aktif."
        );

        console.log(
            "Nama material:",
            settings.materialNames
        );

        console.log(
            "Frasa/kunci material:",
            settings.materialKeywords
        );

    }


    /* =====================================================
       DOM READY
    ====================================================== */

    document.addEventListener(
        "DOMContentLoaded",
        function () {

            initialize();


            const saveButton =
                document.getElementById(
                    "saveSettingsBtn"
                );


            if (saveButton) {

                saveButton.addEventListener(
                    "click",
                    function () {

                        const saved =
                            saveFromHTML();


                        const message =
                            document.getElementById(
                                "settingsSavedMessage"
                            );


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
                                2500
                            );

                        }


                        console.log(
                            "Pengaturan tersimpan:",
                            saved
                        );

                    }
                );

            }


            const resetButton =
                document.getElementById(
                    "resetSettingsBtn"
                );


            if (resetButton) {

                resetButton.addEventListener(
                    "click",
                    function () {

                        const confirmed =
                            window.confirm(
                                "Reset semua pengaturan parser ke default?"
                            );


                        if (!confirmed) {

                            return;

                        }


                        const defaults =
                            resetSettings();


                        const message =
                            document.getElementById(
                                "settingsSavedMessage"
                            );


                        if (message) {

                            message.textContent =
                                "✓ Pengaturan berhasil direset.";


                            message.classList.remove(
                                "hidden"
                            );


                            setTimeout(
                                function () {

                                    message.textContent =
                                        "✓ Pengaturan berhasil disimpan.";

                                    message.classList.add(
                                        "hidden"
                                    );

                                },
                                2500
                            );

                        }


                        console.log(
                            "Pengaturan direset:",
                            defaults
                        );

                    }
                );

            }

        }
    );


    /* =====================================================
       PUBLIC API
    ====================================================== */

    window.ReportCheckerSettings = {

        get:
            getParserSettings,

        getDefaults:
            getDefaultSettings,

        save:
            saveFromHTML,

        reset:
            resetSettings,

        load:
            loadSettings,

        readHTML:
            readHTML

    };


    /*
     * Pastikan function tersedia walaupun
     * parser dipanggil sebelum DOMContentLoaded.
     */

    window.getParserSettings =
        getParserSettings;


})();
