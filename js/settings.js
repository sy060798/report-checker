/* =========================================================
   SETTINGS.JS
   Pengaturan Parser Material
   =========================================================

   Fungsi utama:

   1. Menyimpan daftar nama material
   2. Memuat daftar material saat aplikasi dibuka
   3. Menyediakan daftar material untuk material-parser.js
   4. Otomatis membersihkan baris kosong
   5. Menghapus duplikat material
   6. Tetap menyimpan format tulisan asli material
   7. Bisa mengambil perubahan terbaru langsung dari textarea

   Sumber utama:
   #materialList

========================================================= */

(function () {

    "use strict";


    /* =====================================================
       STORAGE KEY
    ===================================================== */

    const STORAGE_KEY =
        "reportChecker_materialSettings";


    /* =====================================================
       DEFAULT MATERIAL
    ===================================================== */

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
       GET ELEMENT
    ===================================================== */

    function getMaterialElement() {

        return document.getElementById(
            "materialList"
        );

    }


    /* =====================================================
       NORMALIZE MATERIAL
    ===================================================== */

    function normalizeMaterialName(value) {

        if (value === null || value === undefined) {
            return "";
        }

        return String(value)
            .replace(/\r/g, "")
            .replace(/\t/g, " ")
            .replace(/[ ]+/g, " ")
            .trim();

    }


    /* =====================================================
       GET MATERIAL LIST FROM TEXTAREA
    ===================================================== */

    function getMaterialList() {

        const textarea =
            getMaterialElement();

        if (!textarea) {
            return [];
        }


        const lines =
            textarea.value
                .replace(/\r/g, "")
                .split("\n");


        const result = [];
        const exists = new Set();


        lines.forEach(function (line) {

            const material =
                normalizeMaterialName(line);


            if (!material) {
                return;
            }


            /*
             * Digunakan untuk pengecekan duplikat
             * tanpa membedakan huruf besar/kecil.
             */

            const compareKey =
                material.toLowerCase();


            if (exists.has(compareKey)) {
                return;
            }


            exists.add(compareKey);

            result.push(material);

        });


        return result;

    }


    /* =====================================================
       SET MATERIAL LIST
    ===================================================== */

    function setMaterialList(materials) {

        const textarea =
            getMaterialElement();

        if (!textarea) {
            return;
        }


        if (!Array.isArray(materials)) {
            materials = [];
        }


        const cleaned = [];
        const exists = new Set();


        materials.forEach(function (item) {

            const material =
                normalizeMaterialName(item);


            if (!material) {
                return;
            }


            const key =
                material.toLowerCase();


            if (exists.has(key)) {
                return;
            }


            exists.add(key);

            cleaned.push(material);

        });


        textarea.value =
            cleaned.join("\n");

    }


    /* =====================================================
       SAVE SETTINGS
    ===================================================== */

    function saveMaterialSettings(showMessage) {

        const materials =
            getMaterialList();


        const data = {
            materials: materials,
            updatedAt: new Date().toISOString()
        };


        try {

            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(data)
            );

        } catch (error) {

            console.error(
                "Gagal menyimpan pengaturan material:",
                error
            );

        }


        /*
         * Pastikan textarea menggunakan
         * data yang sudah dibersihkan.
         */

        setMaterialList(materials);


        if (showMessage !== false) {

            showSavedMessage();

        }


        /*
         * Event untuk memberi tahu parser
         * bahwa daftar material berubah.
         */

        window.dispatchEvent(
            new CustomEvent(
                "materialSettingsChanged",
                {
                    detail: {
                        materials: materials
                    }
                }
            )
        );


        return materials;

    }


    /* =====================================================
       LOAD SETTINGS
    ===================================================== */

    function loadMaterialSettings() {

        let materials = null;


        try {

            const saved =
                localStorage.getItem(
                    STORAGE_KEY
                );


            if (saved) {

                const data =
                    JSON.parse(saved);


                if (
                    data &&
                    Array.isArray(data.materials)
                ) {

                    materials =
                        data.materials;

                }

            }

        } catch (error) {

            console.error(
                "Gagal membaca pengaturan material:",
                error
            );

        }


        /*
         * Jika belum ada setting,
         * gunakan default material.
         */

        if (
            !Array.isArray(materials) ||
            materials.length === 0
        ) {

            materials =
                DEFAULT_MATERIALS.slice();

        }


        setMaterialList(materials);


        return materials;

    }


    /* =====================================================
       RESET DEFAULT
    ===================================================== */

    function resetMaterialSettings() {

        const confirmed =
            window.confirm(
                "Reset daftar material ke pengaturan default?"
            );


        if (!confirmed) {
            return;
        }


        const materials =
            DEFAULT_MATERIALS.slice();


        setMaterialList(materials);


        try {

            localStorage.removeItem(
                STORAGE_KEY
            );

        } catch (error) {

            console.error(
                "Gagal menghapus pengaturan material:",
                error
            );

        }


        /*
         * Simpan kembali default sebagai setting aktif.
         */

        try {

            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({
                    materials: materials,
                    updatedAt:
                        new Date().toISOString()
                })
            );

        } catch (error) {

            console.error(
                "Gagal menyimpan default material:",
                error
            );

        }


        showSavedMessage(
            "✓ Daftar material berhasil di-reset."
        );


        window.dispatchEvent(
            new CustomEvent(
                "materialSettingsChanged",
                {
                    detail: {
                        materials: materials
                    }
                }
            )
        );

    }


    /* =====================================================
       SAVED MESSAGE
    ===================================================== */

    function showSavedMessage(
        message
    ) {

        const element =
            document.getElementById(
                "settingsSavedMessage"
            );


        if (!element) {
            return;
        }


        element.textContent =
            message ||
            "✓ Pengaturan berhasil disimpan.";


        element.classList.remove(
            "hidden"
        );


        clearTimeout(
            showSavedMessage.timer
        );


        showSavedMessage.timer =
            setTimeout(
                function () {

                    element.classList.add(
                        "hidden"
                    );

                },
                2500
            );

    }


    /* =====================================================
       PUBLIC API
       Dipakai material-parser.js / app.js
    ===================================================== */

    window.ReportCheckerSettings = {

        /*
         * Ambil daftar material terbaru
         * langsung dari textarea.
         *
         * Jadi meskipun user belum klik Save,
         * parser bisa mengambil perubahan terbaru.
         */

        getMaterials: function () {

            return getMaterialList();

        },


        /*
         * Ambil daftar material yang tersimpan.
         */

        getSavedMaterials: function () {

            try {

                const saved =
                    localStorage.getItem(
                        STORAGE_KEY
                    );


                if (!saved) {
                    return [];
                }


                const data =
                    JSON.parse(saved);


                if (
                    data &&
                    Array.isArray(data.materials)
                ) {

                    return data.materials.slice();

                }

            } catch (error) {

                console.error(
                    "Gagal mengambil material tersimpan:",
                    error
                );

            }


            return [];

        },


        /*
         * Ganti daftar material dari JavaScript.
         */

        setMaterials: function (
            materials
        ) {

            setMaterialList(materials);

        },


        /*
         * Simpan.
         */

        save: function () {

            return saveMaterialSettings(
                true
            );

        },


        /*
         * Reset.
         */

        reset: function () {

            resetMaterialSettings();

        },


        /*
         * Default material.
         */

        getDefaults: function () {

            return DEFAULT_MATERIALS.slice();

        }

    };


    /* =====================================================
       DOM READY
    ===================================================== */

    document.addEventListener(
        "DOMContentLoaded",
        function () {

            const textarea =
                getMaterialElement();


            if (!textarea) {

                console.warn(
                    "Textarea #materialList belum ditemukan."
                );

                return;

            }


            /*
             * Load setting saat aplikasi dibuka.
             */

            loadMaterialSettings();


            /* =============================================
               SAVE BUTTON
            ============================================= */

            const saveButton =
                document.getElementById(
                    "saveSettingsBtn"
                );


            if (saveButton) {

                saveButton.addEventListener(
                    "click",
                    function () {

                        saveMaterialSettings(
                            true
                        );

                    }
                );

            }


            /* =============================================
               RESET BUTTON
            ============================================= */

            const resetButton =
                document.getElementById(
                    "resetSettingsBtn"
                );


            if (resetButton) {

                resetButton.addEventListener(
                    "click",
                    function () {

                        resetMaterialSettings();

                    }
                );

            }


            /* =============================================
               AUTO SYNC
            ============================================= */

            /*
             * Ketika user mengubah textarea,
             * parser bisa langsung mengambil
             * nilai terbaru melalui getMaterials().
             *
             * Event ini hanya memberi tanda bahwa
             * data berubah.
             */

            textarea.addEventListener(
                "input",
                function () {

                    window.dispatchEvent(
                        new CustomEvent(
                            "materialSettingsChanged",
                            {
                                detail: {
                                    materials:
                                        getMaterialList()
                                }
                            }
                        )
                    );

                }
            );

        }
    );


})();
