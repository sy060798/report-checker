/* =========================================================
   REPORT CHECKER
   settings.js

   Fungsi:
   - Default parser settings
   - Load settings
   - Save settings
   - Reset settings
   - Dipakai oleh CIR parser & validator
========================================================= */

(function () {

    "use strict";


    /* =====================================================
       DEFAULT SETTINGS
    ===================================================== */

    const DEFAULT_SETTINGS = {

        /*
         * Frasa yang menandakan awal bagian Material.
         * Parser akan mencoba semua variasi ini.
         */
        materialStartPhrases: [
            "Material :",
            "Material:",
            "Material",
            "MATERIAL :",
            "MATERIAL:",
            "MATERIAL",
            "Material yang digunakan :",
            "Material yang digunakan:",
            "Material digunakan :",
            "Material digunakan:",
            "List Material :",
            "List Material:"
        ],


        /*
         * Frasa yang menandakan akhir bagian Material.
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
         * Frasa untuk mencari Ticket Release.
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
         * Frasa yang dianggap menunjukkan
         * data belum tersedia.
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
         * Aturan validasi tanggal.
         */
        validationType: "release-after-receive",


        /*
         * Batas maksimal selisih waktu.
         *
         * 0 = tidak menggunakan batas maksimal.
         */
        maxReleaseMinutes: 0

    };


    /* =====================================================
       STORAGE KEY
    ===================================================== */

    const STORAGE_KEY = "reportCheckerSettings";


    /* =====================================================
       UTILITY
    ===================================================== */

    function cloneDefaultSettings() {

        return JSON.parse(
            JSON.stringify(DEFAULT_SETTINGS)
        );

    }


    function cleanPhraseArray(value) {

        if (!Array.isArray(value)) {
            return [];
        }

        return value
            .map(item => String(item).trim())
            .filter(item => item.length > 0);

    }


    /* =====================================================
       LOAD SETTINGS
    ===================================================== */

    function loadSettings() {

        try {

            const saved = localStorage.getItem(
                STORAGE_KEY
            );

            if (!saved) {

                return cloneDefaultSettings();

            }


            const parsed = JSON.parse(saved);


            const settings = {
                ...cloneDefaultSettings(),
                ...parsed
            };


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

        } catch (error) {

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
                ...settings
            };


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
                JSON.stringify(normalized)
            );


            return true;

        } catch (error) {

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

        } catch (error) {

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
            .map(item => item.trim())
            .filter(item => item.length > 0);

    }


    /* =====================================================
       LOAD SETTINGS INTO UI
    ===================================================== */

    function loadSettingsToUI() {

        const settings = loadSettings();


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

        const current = loadSettings();


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


        if (toggleButton && settingsPanel) {

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


                    if (saved && message) {

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
       
       File parser lain nanti bisa menggunakan:
       
       window.ReportCheckerSettings.get()
       
       Contoh:
       
       const settings =
           window.ReportCheckerSettings.get();
    ===================================================== */

    window.ReportCheckerSettings = {

        get: loadSettings,

        save: saveSettings,

        reset: resetSettings,

        loadToUI: loadSettingsToUI,

        getFromUI: getSettingsFromUI,

        defaults: cloneDefaultSettings

    };


    /* =====================================================
       INITIALIZE AFTER DOM READY
    ===================================================== */

    if (
        document.readyState === "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initializeSettingsUI
        );

    } else {

        initializeSettingsUI();

    }

})();
