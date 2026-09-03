/* =========================================================
   REPORT CHECKER
   settings.js - FULL UPDATE

   Fokus:
   - Master nama material
   - Parser material mencari berdasarkan nama material
   - Tidak bergantung pada tulisan:
       Material:
       Material :
       material
       matrial
       MATERIAL
       dll.

   Contoh CIR:

   matrial
   protek:1
   pigtail:1

   Hasil:
   - Pigtail = 1
   - protek diabaikan karena tidak ada di master material

   Catatan:
   - Pencocokan nama material tidak case-sensitive.
   - Spasi berlebih / line break akan dinormalisasi.
   - Hanya material yang ada di daftar master yang boleh diambil.
========================================================= */

(function () {

    "use strict";


    /* =====================================================
       DEFAULT SETTINGS
    ===================================================== */

    const DEFAULT_SETTINGS = {

        /*
         * =================================================
         * MASTER NAMA MATERIAL
         * =================================================
         *
         * Parser material HARUS menggunakan daftar ini
         * sebagai acuan.
         *
         * Material di luar daftar akan diabaikan.
         *
         * Contoh:
         *
         * pigtail:1
         *
         * akan dikenali sebagai:
         *
         * Pigtail = 1
         *
         * walaupun tulisan di CIR menggunakan huruf kecil.
         */

        materialKeywords: [

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

            "Handhole 80 x 80",

            "Dead end"

        ],


        /*
         * =================================================
         * FRASA AWAL MATERIAL
         * =================================================
         *
         * TIDAK lagi menjadi syarat utama pencarian
         * material.
         *
         * Tetap disimpan untuk kompatibilitas dengan
         * parser lama / parser lain.
         */

        materialStartPhrases: [

            "Material :",

            "Material:",

            "Material",

            "MATERIAL :",

            "MATERIAL:",

            "MATERIAL",

            "Matrial :",

            "Matrial:",

            "Matrial",

            "MATRIAL :",

            "MATRIAL:",

            "MATRIAL",

            "Material yang digunakan :",

            "Material yang digunakan:",

            "Material digunakan :",

            "Material digunakan:",

            "List Material :",

            "List Material:"

        ],


        /*
         * =================================================
         * FRASA AKHIR MATERIAL
         * =================================================
         */

        materialEndPhrases: [

            "Tim qn",

            "Team QN",

            "TEAM QN",

            "Tim QN",

            "PIC FS",

            "PIC fs",

            "PIC FS:",

            "RFO",

            "RFO:",

            "Action",

            "Action:",

            "Act",

            "Act:",

            "===CIR===",

            "==="

        ],


        /*
         * =================================================
         * FRASA TT RELEASE
         * =================================================
         */

        releasePhrases: [

            "TT Release",

            "TT release",

            "TT RELEASE",

            "Ticket Release",

            "Ticket release",

            "TICKET RELEASE"

        ],


        /*
         * =================================================
         * FRASA DATA TIDAK TERSEDIA
         * =================================================
         */

        notFoundPhrases: [

            "NOT YET",

            "Not Yet",

            "not yet",

            "NOT FOUND",

            "Not Found",

            "not found",

            "Belum ada",

            "belum ada",

            "Belum tersedia",

            "belum tersedia",

            "Pending",

            "pending",

            "N/A",

            "n/a",

            "-"

        ],


        /*
         * =================================================
         * VALIDASI TANGGAL
         * =================================================
         */

        validationType:
            "release-after-receive",


        /*
         * =================================================
         * MAX SELISIH RELEASE
         * =================================================
         *
         * 0 = tidak menggunakan batas maksimal.
         */

        maxReleaseMinutes:
            0

    };


    /* =====================================================
       STORAGE KEY
    ===================================================== */

    const STORAGE_KEY =
        "reportCheckerSettings";


    /* =====================================================
       UTILITY
    ===================================================== */

    function cloneDefaultSettings() {

        return JSON.parse(
            JSON.stringify(
                DEFAULT_SETTINGS
            )
        );

    }


    /*
     * Membersihkan array setting.
     */

    function cleanPhraseArray(value) {

        if (!Array.isArray(value)) {

            return [];

        }


        return value

            .map(function (item) {

                return String(item)
                    .trim();

            })

            .filter(function (item) {

                return item.length > 0;

            });

    }


    /*
     * Normalisasi nama material.
     *
     * Tujuannya agar:
     *
     * Pigtail
     * PIGTAIL
     * pigtail
     *
     * dianggap sama.
     *
     * Juga menangani line break:
     *
     * Handhole
     * 40 x 40
     *
     * menjadi:
     *
     * handhole 40 x 40
     */

    function normalizeMaterialName(value) {

        if (
            value === null ||
            value === undefined
        ) {

            return "";

        }


        return String(value)

            .replace(
                /\u00A0/g,
                " "
            )

            .replace(
                /[\r\n\t]+/g,
                " "
            )

            .replace(
                /\s+/g,
                " "
            )

            .trim()

            .toLowerCase();

    }


    /*
     * Bersihkan daftar material.
     */

    function cleanMaterialKeywords(value) {

        if (!Array.isArray(value)) {

            return [];

        }


        const result = [];


        value.forEach(
            function (item) {

                const material =
                    String(item || "")
                        .replace(
                            /\u00A0/g,
                            " "
                        )
                        .replace(
                            /[\r\n\t]+/g,
                            " "
                        )
                        .replace(
                            /\s+/g,
                            " "
                        )
                        .trim();


                if (!material) {

                    return;

                }


                /*
                 * Hindari duplicate berdasarkan
                 * nama yang sudah dinormalisasi.
                 */

                const normalized =
                    normalizeMaterialName(
                        material
                    );


                const exists =
                    result.some(
                        function (existing) {

                            return (
                                normalizeMaterialName(
                                    existing
                                ) ===
                                normalized
                            );

                        }
                    );


                if (!exists) {

                    result.push(
                        material
                    );

                }

            }
        );


        return result;

    }


    /* =====================================================
       LOAD SETTINGS
    ===================================================== */

    function loadSettings() {

        try {

            const saved =
                localStorage.getItem(
                    STORAGE_KEY
                );


            if (!saved) {

                return cloneDefaultSettings();

            }


            const parsed =
                JSON.parse(
                    saved
                );


            const settings = {

                ...cloneDefaultSettings(),

                ...parsed

            };


            /*
             * Master material
             */

            settings.materialKeywords =
                cleanMaterialKeywords(
                    settings.materialKeywords
                );


            /*
             * Setting kompatibilitas parser
             */

            settings.materialStartPhrases =
                cleanPhraseArray(
                    settings.materialStartPhrases
                );


            settings.materialEndPhrases =
                cleanPhraseArray(
                    settings.materialEndPhrases
                );


            settings.releasePhrases =
                cleanPhraseArray(
                    settings.releasePhrases
                );


            settings.notFoundPhrases =
                cleanPhraseArray(
                    settings.notFoundPhrases
                );


            settings.maxReleaseMinutes =
                Number(
                    settings.maxReleaseMinutes
                ) || 0;


            return settings;

        }
        catch (error) {

            console.error(
                "Gagal membaca settings:",
                error
            );


            return cloneDefaultSettings();

        }

    }


    /* =====================================================
       SAVE SETTINGS
    ===================================================== */

    function saveSettings(settings) {

        try {

            const normalized = {

                ...cloneDefaultSettings(),

                ...(settings || {})

            };


            /*
             * Master material
             */

            normalized.materialKeywords =
                cleanMaterialKeywords(
                    normalized.materialKeywords
                );


            /*
             * Setting lainnya
             */

            normalized.materialStartPhrases =
                cleanPhraseArray(
                    normalized.materialStartPhrases
                );


            normalized.materialEndPhrases =
                cleanPhraseArray(
                    normalized.materialEndPhrases
                );


            normalized.releasePhrases =
                cleanPhraseArray(
                    normalized.releasePhrases
                );


            normalized.notFoundPhrases =
                cleanPhraseArray(
                    normalized.notFoundPhrases
                );


            normalized.maxReleaseMinutes =
                Number(
                    normalized.maxReleaseMinutes
                ) || 0;


            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(
                    normalized
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
       RESET SETTINGS
    ===================================================== */

    function resetSettings() {

        try {

            localStorage.removeItem(
                STORAGE_KEY
            );


            return cloneDefaultSettings();

        }
        catch (error) {

            console.error(
                "Gagal reset settings:",
                error
            );


            return cloneDefaultSettings();

        }

    }


    /* =====================================================
       TEXTAREA HELPERS
    ===================================================== */

    function arrayToTextarea(array) {

        if (!Array.isArray(array)) {

            return "";

        }


        return array.join("\n");

    }


    function textareaToArray(value) {

        if (!value) {

            return [];

        }


        return value

            .split(/\r?\n/)

            .map(function (item) {

                return item.trim();

            })

            .filter(function (item) {

                return item.length > 0;

            });

    }


    /* =====================================================
       LOAD SETTINGS INTO UI
    ===================================================== */

    function loadSettingsToUI() {

        const settings =
            loadSettings();


        /*
         * Master material
         */

        const materialKeywords =
            document.getElementById(
                "materialKeywords"
            );


        /*
         * Kompatibilitas UI lama
         */

        const materialStart =
            document.getElementById(
                "materialStartPhrases"
            );


        const materialEnd =
            document.getElementById(
                "materialEndPhrases"
            );


        const releasePhrases =
            document.getElementById(
                "releasePhrases"
            );


        const notFound =
            document.getElementById(
                "notFoundPhrases"
            );


        const validationType =
            document.getElementById(
                "validationType"
            );


        const maxReleaseMinutes =
            document.getElementById(
                "maxReleaseMinutes"
            );


        /*
         * Material master
         */

        if (materialKeywords) {

            materialKeywords.value =
                arrayToTextarea(
                    settings.materialKeywords
                );

        }


        /*
         * Setting lama.
         */

        if (materialStart) {

            materialStart.value =
                arrayToTextarea(
                    settings.materialStartPhrases
                );

        }


        if (materialEnd) {

            materialEnd.value =
                arrayToTextarea(
                    settings.materialEndPhrases
                );

        }


        if (releasePhrases) {

            releasePhrases.value =
                arrayToTextarea(
                    settings.releasePhrases
                );

        }


        if (notFound) {

            notFound.value =
                arrayToTextarea(
                    settings.notFoundPhrases
                );

        }


        if (validationType) {

            validationType.value =
                settings.validationType;

        }


        if (maxReleaseMinutes) {

            maxReleaseMinutes.value =
                settings.maxReleaseMinutes;

        }

    }


    /* =====================================================
       READ SETTINGS FROM UI
    ===================================================== */

    function getSettingsFromUI() {

        const current =
            loadSettings();


        const materialKeywords =
            document.getElementById(
                "materialKeywords"
            );


        const materialStart =
            document.getElementById(
                "materialStartPhrases"
            );


        const materialEnd =
            document.getElementById(
                "materialEndPhrases"
            );


        const releasePhrases =
            document.getElementById(
                "releasePhrases"
            );


        const notFound =
            document.getElementById(
                "notFoundPhrases"
            );


        const validationType =
            document.getElementById(
                "validationType"
            );


        const maxReleaseMinutes =
            document.getElementById(
                "maxReleaseMinutes"
            );


        return {

            ...current,


            /*
             * Jika UI baru memiliki
             * #materialKeywords,
             * gunakan itu sebagai master.
             */

            materialKeywords:
                materialKeywords
                    ? textareaToArray(
                        materialKeywords.value
                    )
                    : current.materialKeywords,


            /*
             * Tetap kompatibel dengan
             * UI lama.
             */

            materialStartPhrases:
                materialStart
                    ? textareaToArray(
                        materialStart.value
                    )
                    : current.materialStartPhrases,


            materialEndPhrases:
                materialEnd
                    ? textareaToArray(
                        materialEnd.value
                    )
                    : current.materialEndPhrases,


            releasePhrases:
                releasePhrases
                    ? textareaToArray(
                        releasePhrases.value
                    )
                    : current.releasePhrases,


            notFoundPhrases:
                notFound
                    ? textareaToArray(
                        notFound.value
                    )
                    : current.notFoundPhrases,


            validationType:
                validationType
                    ? validationType.value
                    : current.validationType,


            maxReleaseMinutes:
                maxReleaseMinutes
                    ? Number(
                        maxReleaseMinutes.value
                    ) || 0
                    : current.maxReleaseMinutes

        };

    }


    /* =====================================================
       UI EVENT HANDLERS
    ===================================================== */

    function initializeSettingsUI() {

        loadSettingsToUI();


        const toggleButton =
            document.getElementById(
                "toggleSettingsBtn"
            );


        const settingsPanel =
            document.getElementById(
                "settingsPanel"
            );


        if (
            toggleButton &&
            settingsPanel
        ) {

            toggleButton.addEventListener(
                "click",
                function () {

                    const isHidden =
                        settingsPanel.classList.contains(
                            "hidden"
                        );


                    settingsPanel.classList.toggle(
                        "hidden"
                    );


                    toggleButton.textContent =
                        isHidden
                            ? "Tutup Pengaturan"
                            : "Buka Pengaturan";

                }
            );

        }


        /* ---------------------------------------------
           SAVE
        --------------------------------------------- */

        const saveButton =
            document.getElementById(
                "saveSettingsBtn"
            );


        if (saveButton) {

            saveButton.addEventListener(
                "click",
                function () {

                    const settings =
                        getSettingsFromUI();


                    const saved =
                        saveSettings(
                            settings
                        );


                    const message =
                        document.getElementById(
                            "settingsSavedMessage"
                        );


                    if (
                        saved &&
                        message
                    ) {

                        message.textContent =
                            "✓ Pengaturan berhasil disimpan.";

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

                }
            );

        }


        /* ---------------------------------------------
           RESET
        --------------------------------------------- */

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


                    resetSettings();


                    loadSettingsToUI();


                    const message =
                        document.getElementById(
                            "settingsSavedMessage"
                        );


                    if (message) {

                        message.textContent =
                            "✓ Pengaturan dikembalikan ke default.";

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

                }
            );

        }

    }


    /* =====================================================
       PUBLIC API
       ===================================================== */

    window.ReportCheckerSettings = {

        /*
         * Ambil seluruh settings.
         */

        get:
            loadSettings,


        /*
         * Simpan settings.
         */

        save:
            saveSettings,


        /*
         * Reset settings.

         */

        reset:
            resetSettings,


        /*
         * Load settings ke UI.
         */

        loadToUI:
            loadSettingsToUI,


        /*
         * Ambil settings dari UI.

         */

        getFromUI:
            getSettingsFromUI,


        /*
         * Default settings.

         */

        defaults:
            cloneDefaultSettings,


        /*
         * Utility untuk parser material.

         * Contoh:

           const settings =
               window.ReportCheckerSettings.get();

           const materials =
               settings.materialKeywords;

         */

        normalizeMaterialName:
            normalizeMaterialName,


        cleanMaterialKeywords:
            cleanMaterialKeywords

    };


    /* =====================================================
       INITIALIZE AFTER DOM READY
    ===================================================== */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initializeSettingsUI
        );

    }
    else {

        initializeSettingsUI();

    }

})();
