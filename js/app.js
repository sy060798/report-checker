/* ============================================================
   REPORT CHECKER - APP.JS
   VERSION:
   - CIR SYSTEM LOCKED
   - CIR DATE = FIRST VALID DATE AFTER ===CIR===
   - MATERIAL LIST DYNAMIC / AUTO SYNC
   - LIGHTWEIGHT MATERIAL SEARCH
   - VALIDATION RECEIVE vs TT RELEASE
   - PAGINATION
   - DOWNLOAD
   ============================================================ */

(() => {
    "use strict";

    /* ========================================================
       GLOBAL STATE
    ======================================================== */

    const state = {
        workbook: null,
        file: null,

        rows: [],
        validRows: [],
        invalidRows: [],

        materials: [],
        materialErrors: [],

        materialIndex: null,

        currentPage: {
            valid: 1,
            invalid: 1,
            material: 1,
            materialError: 1
        },

        pageSize: 50,

        processing: false
    };


    /* ========================================================
       DEFAULT SETTINGS
       CIR RULES ARE LOCKED HERE
       ======================================================== */

    const CIR_LOCKED = Object.freeze({

        cirMarker: "===CIR===",

        /*
         * Sistem hanya mencari tanggal pertama yang valid
         * setelah marker ===CIR===
         */
        firstDateAfterCIR: true,

        /*
         * Format tanggal yang didukung.
         */
        datePatterns: [
            /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/,
            /\b(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/,
            /\b(\d{1,2})\s+(Jan(?:uari)?|Feb(?:ruari)?|Mar(?:et)?|Apr(?:il)?|Mei|Jun(?:i)?|Jul(?:i)?|Agu(?:stus)?|Sep(?:tember)?|Okt(?:ober)?|Nov(?:ember)?|Des(?:ember)?)\s+(\d{4})\b/i
        ]

    });


    /* ========================================================
       DOM HELPER
       ======================================================== */

    function $(id) {
        return document.getElementById(id);
    }


    function escapeHTML(value) {

        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    function normalize(value) {

        return String(value ?? "")
            .toLowerCase()
            .replace(/\r/g, " ")
            .replace(/\n/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }


    function normalizeMaterial(value) {

        return normalize(value)
            .replace(/[“”"]/g, "")
            .replace(/\s*\(\s*/g, " (")
            .replace(/\s*\)\s*/g, ")")
            .replace(/\s+/g, " ")
            .trim();
    }


    /* ========================================================
       PROCESSING UI
       ======================================================== */

    function setProcessing(show, title, text, progress = 0) {

        const box = $("processingStatus");
        const titleEl = $("processingTitle");
        const textEl = $("processingText");
        const progressEl = $("processingProgress");

        if (!box) return;

        if (show) {

            box.classList.remove("hidden");

            if (titleEl) {
                titleEl.textContent =
                    title || "Sedang memproses...";
            }

            if (textEl) {
                textEl.textContent =
                    text || "Membaca data Excel...";
            }

            if (progressEl) {
                progressEl.textContent =
                    `${Math.max(0, Math.min(100, progress))}%`;
            }

        } else {

            box.classList.add("hidden");
        }
    }


    function updateProgress(progress, text) {

        const progressEl = $("processingProgress");
        const textEl = $("processingText");

        if (progressEl) {
            progressEl.textContent =
                `${Math.round(progress)}%`;
        }

        if (textEl && text) {
            textEl.textContent = text;
        }
    }


    /* ========================================================
       SETTINGS
       ======================================================== */

    function getSettings() {

        /*
         * Prioritaskan fungsi dari settings.js jika tersedia.
         */
        if (typeof window.getParserSettings === "function") {

            try {
                return window.getParserSettings() || {};
            } catch (err) {
                console.warn(
                    "getParserSettings gagal:",
                    err
                );
            }
        }


        let saved = {};

        try {

            saved = JSON.parse(
                localStorage.getItem(
                    "reportCheckerSettings"
                ) || "{}"
            );

        } catch (err) {
            saved = {};
        }


        return saved;
    }


    /* ========================================================
       MATERIAL LIST
       AUTO SYNC DARI SETTINGS
       ======================================================== */

    function getMaterialList() {

        let values = [];


        /*
         * 1. Ambil dari fungsi settings.js
         */
        if (typeof window.getMaterialNames === "function") {

            try {

                const result =
                    window.getMaterialNames();

                if (Array.isArray(result)) {
                    values.push(...result);
                }

            } catch (err) {
                console.warn(
                    "getMaterialNames gagal:",
                    err
                );
            }
        }


        /*
         * 2. Ambil dari textarea HTML
         */
        const textarea =
            $("materialNames") ||
            $("materialList") ||
            $("materials");


        if (textarea) {

            values.push(
                ...String(textarea.value || "")
                    .split(/\r?\n/)
            );
        }


        /*
         * 3. Fallback localStorage
         */
        if (!values.length) {

            try {

                const saved =
                    JSON.parse(
                        localStorage.getItem(
                            "reportCheckerSettings"
                        ) || "{}"
                    );

                if (
                    Array.isArray(
                        saved.materialNames
                    )
                ) {
                    values.push(
                        ...saved.materialNames
                    );
                }

            } catch (err) {
                // ignore
            }
        }


        /*
         * Bersihkan dan deduplicate.
         */
        const unique = new Map();

        for (const item of values) {

            const original =
                String(item ?? "")
                    .replace(/\r/g, " ")
                    .replace(/\n/g, " ")
                    .replace(/\s+/g, " ")
                    .trim();

            if (!original) continue;

            const key =
                normalizeMaterial(original);

            if (!key) continue;

            if (!unique.has(key)) {
                unique.set(key, original);
            }
        }


        return Array.from(unique.values());
    }


    /* ========================================================
       BUILD MATERIAL INDEX
       ======================================================== */

    function buildMaterialIndex() {

        const list =
            getMaterialList();

        /*
         * Urutkan panjang terbesar lebih dulu.
         * Contoh:
         *
         * 12C DOME
         * 12C
         *
         * Maka "12C DOME" diperiksa lebih dulu.
         */
        list.sort(
            (a, b) =>
                normalizeMaterial(b).length -
                normalizeMaterial(a).length
        );


        const entries =
            list.map(name => ({
                original: name,
                normalized:
                    normalizeMaterial(name)
            }));


        /*
         * Escape regex.
         */
        const escaped =
            entries
                .map(item =>
                    item.normalized
                        .replace(
                            /[.*+?^${}()|[\]\\]/g,
                            "\\$&"
                        )
                );


        let regex = null;

        if (escaped.length) {

            /*
             * Pencarian menggunakan boundary fleksibel.
             * Tidak memakai regex global berulang-ulang
             * untuk setiap material.
             */
            regex = new RegExp(
                escaped.join("|"),
                "gi"
            );
        }


        state.materials = list;

        state.materialIndex = {
            entries,
            regex
        };

        return state.materialIndex;
    }


    /* ========================================================
       MATERIAL SEARCH
       LIGHTWEIGHT
       ======================================================== */

    function findMaterials(text) {

        if (!text) return [];

        if (
            !state.materialIndex ||
            !state.materialIndex.entries.length
        ) {
            buildMaterialIndex();
        }


        const source =
            String(text)
                .replace(/\r/g, " ")
                .replace(/\n/g, " ")
                .replace(/\s+/g, " ");


        const found = [];
        const seen = new Set();


        /*
         * Untuk daftar pendek gunakan index.
         * Ini jauh lebih ringan daripada memanggil parser
         * berkali-kali.
         */
        for (
            const item of state.materialIndex.entries
        ) {

            if (
                source
                    .toLowerCase()
                    .includes(
                        item.normalized
                    )
            ) {

                if (
                    !seen.has(
                        item.normalized
                    )
                ) {

                    seen.add(
                        item.normalized
                    );

                    found.push(
                        item.original
                    );
                }
            }
        }


        return found;
    }


    /* ========================================================
       CIR DATE - LOCKED
       ======================================================== */

    function parseDateValue(day, month, year) {

        let d = Number(day);
        let m = Number(month);
        let y = Number(year);


        if (
            !Number.isFinite(d) ||
            !Number.isFinite(m) ||
            !Number.isFinite(y)
        ) {
            return null;
        }


        if (y < 100) {
            y += 2000;
        }


        /*
         * JavaScript month 0-11.
         */
        const date =
            new Date(
                y,
                m - 1,
                d
            );


        if (
            date.getFullYear() !== y ||
            date.getMonth() !== m - 1 ||
            date.getDate() !== d
        ) {
            return null;
        }


        return date;
    }


    function monthNumber(name) {

        const m =
            normalize(name);

        const months = {
            januari: 1,
            jan: 1,

            februari: 2,
            feb: 2,

            maret: 3,
            mar: 3,

            april: 4,
            apr: 4,

            mei: 5,

            juni: 6,
            jun: 6,

            juli: 7,
            jul: 7,

            agustus: 8,
            agu: 8,

            september: 9,
            sep: 9,

            oktober: 10,
            okt: 10,

            november: 11,
            nov: 11,

            desember: 12,
            des: 12
        };

        return months[m] || null;
    }


    function findFirstCIRDate(text) {

        if (!text) return null;


        const source =
            String(text);


        const markerIndex =
            source
                .toUpperCase()
                .indexOf(
                    CIR_LOCKED.cirMarker
                );


        /*
         * Kalau tidak ada CIR,
         * jangan mengambil tanggal random dari report.
         */
        if (markerIndex < 0) {
            return null;
        }


        /*
         * Ambil teks setelah ===CIR===
         */
        const afterCIR =
            source.substring(
                markerIndex +
                CIR_LOCKED.cirMarker.length
            );


        /*
         * Batasi pencarian agar tidak membaca seluruh
         * dokumen apabila report sangat panjang.
         */
        const limited =
            afterCIR.substring(
                0,
                5000
            );


        /*
         * Format:
         * DD/MM/YYYY
         * DD-MM-YYYY
         */
        let match =
            limited.match(
                /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/
            );


        if (match) {

            const date =
                parseDateValue(
                    match[1],
                    match[2],
                    match[3]
                );

            if (date) {
                return date;
            }
        }


        /*
         * Format:
         * YYYY-MM-DD
         */
        match =
            limited.match(
                /\b(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/
            );


        if (match) {

            const date =
                parseDateValue(
                    match[3],
                    match[2],
                    match[1]
                );

            if (date) {
                return date;
            }
        }


        /*
         * Format:
         * 12 Januari 2026
         */
        match =
            limited.match(
                /\b(\d{1,2})\s+(Jan(?:uari)?|Feb(?:ruari)?|Mar(?:et)?|Apr(?:il)?|Mei|Jun(?:i)?|Jul(?:i)?|Agu(?:stus)?|Sep(?:tember)?|Okt(?:ober)?|Nov(?:ember)?|Des(?:ember)?)\s+(\d{4})\b/i
            );


        if (match) {

            const month =
                monthNumber(
                    match[2]
                );

            if (month) {

                const date =
                    parseDateValue(
                        match[1],
                        month,
                        match[3]
                    );

                if (date) {
                    return date;
                }
            }
        }


        return null;
    }


    /* ========================================================
       EXCEL CELL -> TEXT
       ======================================================== */

    function rowToText(row) {

        if (!row) return "";

        return Object.values(row)
            .map(value => {

                if (
                    value instanceof Date
                ) {
                    return value.toLocaleString(
                        "id-ID"
                    );
                }

                return String(
                    value ?? ""
                );

            })
            .join(" ");
    }


    /* ========================================================
       FIND COLUMN
       ======================================================== */

    function findColumn(row, candidates) {

        if (!row) return null;

        const keys =
            Object.keys(row);


        for (const key of keys) {

            const normalizedKey =
                normalize(key);


            for (
                const candidate of candidates
            ) {

                if (
                    normalizedKey ===
                    normalize(candidate)
                ) {
                    return key;
                }
            }
        }


        /*
         * Partial fallback.
         */
        for (const key of keys) {

            const normalizedKey =
                normalize(key);

            for (
                const candidate of candidates
            ) {

                const c =
                    normalize(candidate);

                if (
                    normalizedKey.includes(c)
                ) {
                    return key;
                }
            }
        }


        return null;
    }


    /* ========================================================
       RECEIVE DATE
       ======================================================== */

    function parseAnyDate(value) {

        if (
            value instanceof Date &&
            !isNaN(value.getTime())
        ) {
            return value;
        }


        if (
            typeof value === "number" &&
            window.XLSX &&
            XLSX.SSF
        ) {

            try {

                const date =
                    XLSX.SSF.parse_date_code(
                        value
                    );

                if (date) {

                    return new Date(
                        date.y,
                        date.m - 1,
                        date.d,
                        date.H || 0,
                        date.M || 0,
                        date.S || 0
                    );
                }

            } catch (err) {
                // fallback
            }
        }


        const text =
            String(value ?? "")
                .trim();


        if (!text) return null;


        let parsed =
            new Date(text);


        if (
            !isNaN(parsed.getTime())
        ) {
            return parsed;
        }


        let match =
            text.match(
                /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/
            );


        if (match) {

            let year =
                Number(match[3]);

            if (year < 100) {
                year += 2000;
            }

            return new Date(
                year,
                Number(match[2]) - 1,
                Number(match[1]),
                Number(match[4] || 0),
                Number(match[5] || 0),
                Number(match[6] || 0)
            );
        }


        return null;
    }


    /* ========================================================
       RELEASE DATE
       ======================================================== */

    function findReleaseDate(text) {

        /*
         * Jika parser lama tersedia,
         * gunakan parser tersebut terlebih dahulu.
         */
        if (
            typeof window.parseTicketRelease ===
            "function"
        ) {

            try {

                const result =
                    window.parseTicketRelease(
                        text,
                        getSettings()
                    );

                if (result) {

                    if (
                        result instanceof Date
                    ) {
                        return result;
                    }

                    if (
                        result.date
                    ) {

                        const d =
                            parseAnyDate(
                                result.date
                            );

                        if (d) return d;
                    }

                    const d =
                        parseAnyDate(result);

                    if (d) return d;
                }

            } catch (err) {
                console.warn(
                    "Parser Ticket Release gagal:",
                    err
                );
            }
        }


        /*
         * Fallback menggunakan phrase setting.
         */
        const settings =
            getSettings();


        const phrases =
            Array.isArray(
                settings.releasePhrases
            )
                ? settings.releasePhrases
                : String(
                    settings.releasePhrases ||
                    "TT Release\nTicket Release"
                )
                    .split(/\r?\n/)
                    .filter(Boolean);


        const lines =
            String(text || "")
                .split(/\r?\n/);


        for (let i = 0; i < lines.length; i++) {

            const line =
                normalize(lines[i]);


            const matched =
                phrases.some(
                    phrase =>
                        line.includes(
                            normalize(phrase)
                        )
                );


            if (!matched) continue;


            /*
             * Cari tanggal di baris yang sama.
             */
            const sameLine =
                parseAnyDate(
                    lines[i]
                );


            if (sameLine) {
                return sameLine;
            }


            /*
             * Cari maksimal 2 baris berikutnya.
             */
            for (
                let j = i + 1;
                j < Math.min(
                    i + 3,
                    lines.length
                );
                j++
            ) {

                const nextDate =
                    parseAnyDate(
                        lines[j]
                    );

                if (nextDate) {
                    return nextDate;
                }
            }
        }


        return null;
    }


    /* ========================================================
       TICKET
       ======================================================== */

    function findTicket(row) {

        const key =
            findColumn(
                row,
                [
                    "Ticket",
                    "Ticket ID",
                    "Ticket Number",
                    "TT",
                    "No Ticket"
                ]
            );


        if (key) {
            return String(
                row[key] ?? ""
            ).trim();
        }


        return "";
    }


    /* ========================================================
       CIR EXTRACTION
       ======================================================== */

    function getCIRText(row) {

        /*
         * Prioritaskan kolom CIR jika ada.
         */
        const cirKey =
            findColumn(
                row,
                [
                    "CIR",
                    "CIR Detail",
                    "CIR Description",
                    "Report CIR"
                ]
            );


        if (cirKey) {

            return String(
                row[cirKey] ?? ""
            );
        }


        /*
         * Jika tidak ada kolom CIR,
         * gabungkan seluruh row.
         */
        return rowToText(row);
    }


    /* ========================================================
       MATERIAL PARSER
       ======================================================== */

    function parseMaterialsFromRow(row) {

        const text =
            getCIRText(row);


        /*
         * Gunakan parser material existing
         * bila tersedia.
         */
        if (
            typeof window.parseMaterial ===
            "function"
        ) {

            try {

                const result =
                    window.parseMaterial(
                        text,
                        getSettings()
                    );

                if (Array.isArray(result)) {
                    return result;
                }

            } catch (err) {
                console.warn(
                    "parseMaterial gagal:",
                    err
                );
            }
        }


        if (
            typeof window.parseMaterials ===
            "function"
        ) {

            try {

                const result =
                    window.parseMaterials(
                        text,
                        getSettings()
                    );

                if (Array.isArray(result)) {
                    return result;
                }

            } catch (err) {
                console.warn(
                    "parseMaterials gagal:",
                    err
                );
            }
        }


        /*
         * Fallback:
         * cari material berdasarkan daftar nama material.
         */
        const names =
            findMaterials(text);


        return names.map(name => ({
            material: name,
            qty: "",
            satuan: "",
            kode: ""
        }));
    }


    /* ========================================================
       MATERIAL NORMALIZATION
       ======================================================== */

    function normalizeMaterialResult(
        result,
        ticket
    ) {

        if (!result) return null;


        if (typeof result === "string") {

            return {
                ticket,
                material: result,
                qty: "",
                satuan: "",
                kode: ""
            };
        }


        return {
            ticket,

            material:
                result.material ||
                result.name ||
                result.Material ||
                "",

            qty:
                result.qty ??
                result.quantity ??
                result.Qty ??
                "",

            satuan:
                result.satuan ||
                result.unit ||
                result.Satuan ||
                "",

            kode:
                result.kode ||
                result.code ||
                result.Kode ||
                ""
        };
    }


    /* ========================================================
       VALIDATION
       ======================================================== */

    function validateDates(
        receiveDate,
        releaseDate
    ) {

        if (!releaseDate) {

            return {
                valid: false,
                status: "Tidak Sesuai",
                note: "Ticket Release belum ditemukan."
            };
        }


        if (!receiveDate) {

            return {
                valid: false,
                status: "Tidak Sesuai",
                note: "Datetime Receive tidak ditemukan."
            };
        }


        const settings =
            getSettings();


        const type =
            settings.validationType ||
            "release-after-receive";


        const maxMinutes =
            Number(
                settings.maxReleaseMinutes || 0
            );


        const diffMinutes =
            (
                releaseDate.getTime() -
                receiveDate.getTime()
            ) / 60000;


        if (
            type ===
            "release-after-receive"
        ) {

            if (diffMinutes <= 0) {

                return {
                    valid: false,
                    status: "Tidak Sesuai",
                    note:
                        "TT Release harus setelah Datetime Receive."
                };
            }
        }


        if (
            type ===
            "same-or-after"
        ) {

            if (diffMinutes < 0) {

                return {
                    valid: false,
                    status: "Tidak Sesuai",
                    note:
                        "TT Release harus sama atau setelah Receive."
                };
            }
        }


        if (
            type ===
            "same-date"
        ) {

            if (
                receiveDate.getFullYear() !==
                releaseDate.getFullYear() ||

                receiveDate.getMonth() !==
                releaseDate.getMonth() ||

                receiveDate.getDate() !==
                releaseDate.getDate()
            ) {

                return {
                    valid: false,
                    status: "Tidak Sesuai",
                    note:
                        "TT Release harus pada tanggal yang sama."
                };
            }
        }


        if (
            maxMinutes > 0 &&
            diffMinutes > maxMinutes
        ) {

            return {
                valid: false,
                status: "Tidak Sesuai",
                note:
                    `Selisih Ticket Release melebihi batas ${maxMinutes} menit.`
            };
        }


        return {
            valid: true,
            status: "Sesuai",
            note: "Ticket Release sesuai aturan."
        };
    }


    /* ========================================================
       PROCESS ONE ROW
       ======================================================== */

    function processRow(row, index) {

        const ticket =
            findTicket(row);


        const cirText =
            getCIRText(row);


        /*
         * CIR DATE LOCKED:
         * selalu tanggal pertama setelah ===CIR===
         */
        const cirDate =
            findFirstCIRDate(
                cirText
            );


        /*
         * Receive.
         */
        const receiveKey =
            findColumn(
                row,
                [
                    "Datetime Receive",
                    "DateTime Receive",
                    "Datetime",
                    "Receive",
                    "Tanggal Receive"
                ]
            );


        const receiveDate =
            receiveKey
                ? parseAnyDate(
                    row[receiveKey]
                )
                : null;


        /*
         * Release.
         */
        const releaseDate =
            findReleaseDate(
                cirText
            );


        /*
         * Jika release parser tidak menemukan tanggal,
         * coba CIR date sebagai fallback hanya bila
         * report tidak memiliki release phrase.
         *
         * Namun CIR date tetap terpisah dan tidak mengubah
         * aturan CIR.
         */
        const finalRelease =
            releaseDate;


        const validation =
            validateDates(
                receiveDate,
                finalRelease
            );


        const result = {

            index,

            ticket,

            receiveDate,

            releaseDate: finalRelease,

            cirDate,

            cirText,

            valid:
                validation.valid,

            status:
                validation.status,

            note:
                validation.note
        };


        /*
         * Material.
         */
        const parsedMaterials =
            parseMaterialsFromRow(
                row
            );


        if (
            parsedMaterials.length
        ) {

            for (
                const parsed of parsedMaterials
            ) {

                const material =
                    normalizeMaterialResult(
                        parsed,
                        ticket
                    );


                if (!material) continue;


                if (
                    !material.material
                ) {

                    state.materialErrors.push({
                        ticket,
                        material: "",
                        qty:
                            material.qty,
                        satuan:
                            material.satuan,
                        kode:
                            material.kode,
                        error:
                            "Nama material tidak ditemukan."
                    });

                    continue;
                }


                /*
                 * Validasi nama material terhadap daftar.
                 */
                const normalized =
                    normalizeMaterial(
                        material.material
                    );


                const exists =
                    state.materialIndex.entries
                        .some(
                            item =>
                                item.normalized ===
                                normalized
                        );


                if (!exists) {

                    state.materialErrors.push({
                        ...material,
                        error:
                            "Material tidak ada di daftar pengaturan."
                    });

                } else {

                    state.materials.push(
                        material
                    );
                }
            }
        }


        return result;
    }


    /* ========================================================
       PROCESS EXCEL
       ======================================================== */

    async function processExcel() {

        if (state.processing) return;

        if (!state.file) {
            alert(
                "Silakan pilih file Excel terlebih dahulu."
            );
            return;
        }


        if (
            typeof XLSX === "undefined"
        ) {

            alert(
                "Library XLSX belum tersedia."
            );

            return;
        }


        state.processing = true;


        setProcessing(
            true,
            "Sedang memproses...",
            "Membaca data Excel...",
            0
        );


        try {

            buildMaterialIndex();


            state.rows = [];
            state.validRows = [];
            state.invalidRows = [];
            state.materials = [];
            state.materialErrors = [];


            /*
             * Baca file.
             */
            const buffer =
                await state.file.arrayBuffer();


            updateProgress(
                10,
                "Membuka workbook..."
            );


            const workbook =
                XLSX.read(
                    buffer,
                    {
                        type: "array",
                        cellDates: true
                    }
                );


            state.workbook =
                workbook;


            if (
                !workbook.SheetNames.length
            ) {
                throw new Error(
                    "Workbook tidak memiliki sheet."
                );
            }


            /*
             * Gunakan sheet pertama.
             */
            const sheet =
                workbook.Sheets[
                    workbook.SheetNames[0]
                ];


            const rows =
                XLSX.utils.sheet_to_json(
                    sheet,
                    {
                        defval: "",
                        raw: true
                    }
                );


            state.rows =
                rows;


            const total =
                rows.length;


            if (!total) {

                throw new Error(
                    "Tidak ada data pada sheet Excel."
                );
            }


            updateProgress(
                20,
                `Menemukan ${total} data.`
            );


            /*
             * Proses per batch agar browser tidak freeze.
             */
            const batchSize = 100;


            for (
                let start = 0;
                start < total;
                start += batchSize
            ) {

                const end =
                    Math.min(
                        start + batchSize,
                        total
                    );


                for (
                    let i = start;
                    i < end;
                    i++
                ) {

                    const result =
                        processRow(
                            rows[i],
                            i
                        );


                    if (result.valid) {

                        state.validRows.push(
                            result
                        );

                    } else {

                        state.invalidRows.push(
                            result
                        );
                    }
                }


                const progress =
                    20 +
                    (
                        (end / total) *
                        70
                    );


                updateProgress(
                    progress,
                    `Memproses data ${end} dari ${total}...`
                );


                /*
                 * Beri browser kesempatan repaint.
                 */
                await new Promise(
                    resolve =>
                        setTimeout(
                            resolve,
                            0
                        )
                );
            }


            updateProgress(
                95,
                "Menampilkan hasil..."
            );


            state.currentPage = {
                valid: 1,
                invalid: 1,
                material: 1,
                materialError: 1
            };


            renderDashboard();


            updateProgress(
                100,
                "Selesai."
            );


            setTimeout(() => {

                setProcessing(
                    false
                );

            }, 300);


        } catch (error) {

            console.error(
                "Gagal memproses Excel:",
                error
            );


            setProcessing(
                false
            );


            alert(
                "Gagal memproses Excel:\n\n" +
                error.message
            );

        } finally {

            state.processing = false;
        }
    }


    /* ========================================================
       FORMAT DATE
       ======================================================== */

    function formatDate(date) {

        if (
            !date ||
            isNaN(date.getTime())
        ) {
            return "-";
        }


        return date.toLocaleString(
            "id-ID",
            {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            }
        );
    }


    /* ========================================================
       RENDER DASHBOARD
       ======================================================== */

    function renderDashboard() {

        const section =
            $("dashboardSection");


        if (section) {
            section.classList.remove(
                "hidden"
            );
        }


        const total =
            state.rows.length;


        const valid =
            state.validRows.length;


        const invalid =
            state.invalidRows.length;


        const material =
            state.materials.length;


        const materialError =
            state.materialErrors.length;


        setText(
            "totalCount",
            total
        );

        setText(
            "validCount",
            valid
        );

        setText(
            "invalidCount",
            invalid
        );

        setText(
            "materialCount",
            material
        );

        setText(
            "materialErrorCount",
            materialError
        );


        setText(
            "validTabCount",
            valid
        );

        setText(
            "invalidTabCount",
            invalid
        );

        setText(
            "materialTabCount",
            material
        );

        setText(
            "materialErrorTabCount",
            materialError
        );


        const summary =
            `Total ${total} data • ` +
            `${valid} sesuai • ` +
            `${invalid} tidak sesuai • ` +
            `${material} material`;


        setText(
            "resultSummary",
            summary
        );


        renderValidTable();
        renderInvalidTable();
        renderMaterialTable();
        renderMaterialErrorTable();
    }


    function setText(id, value) {

        const el = $(id);

        if (el) {
            el.textContent =
                String(value ?? "");
        }
    }


    /* ========================================================
       PAGINATION HELPER
       ======================================================== */

    function paginate(
        data,
        page
    ) {

        const totalPages =
            Math.max(
                1,
                Math.ceil(
                    data.length /
                    state.pageSize
                )
            );


        const safePage =
            Math.max(
                1,
                Math.min(
                    page,
                    totalPages
                )
            );


        const start =
            (
                safePage - 1
            ) *
            state.pageSize;


        return {
            items:
                data.slice(
                    start,
                    start +
                    state.pageSize
                ),

            page:
                safePage,

            totalPages
        };
    }


    /* ========================================================
       VALID TABLE
       ======================================================== */

    function renderValidTable() {

        const body =
            $("validTableBody");


        if (!body) return;


        const result =
            paginate(
                state.validRows,
                state.currentPage.valid
            );


        state.currentPage.valid =
            result.page;


        body.innerHTML =
            result.items
                .map(row => `
                    <tr>
                        <td>${escapeHTML(row.ticket || "-")}</td>
                        <td>${escapeHTML(formatDate(row.receiveDate))}</td>
                        <td>${escapeHTML(formatDate(row.releaseDate))}</td>
                        <td>
                            <span class="status-badge success">
                                ✓ Sesuai
                            </span>
                        </td>
                        <td>${escapeHTML(row.note || "-")}</td>
                    </tr>
                `)
                .join("");


        toggleEmpty(
            "validEmpty",
            state.validRows.length === 0
        );


        updatePagination(
            "valid",
            result
        );
    }


    /* ========================================================
       INVALID TABLE
       ======================================================== */

    function renderInvalidTable() {

        const body =
            $("invalidTableBody");


        if (!body) return;


        const result =
            paginate(
                state.invalidRows,
                state.currentPage.invalid
            );


        state.currentPage.invalid =
            result.page;


        body.innerHTML =
            result.items
                .map(row => `
                    <tr>
                        <td>${escapeHTML(row.ticket || "-")}</td>
                        <td>${escapeHTML(formatDate(row.receiveDate))}</td>
                        <td>${escapeHTML(formatDate(row.releaseDate))}</td>
                        <td>
                            <span class="status-badge danger">
                                ! Tidak Sesuai
                            </span>
                        </td>
                        <td>${escapeHTML(row.note || "-")}</td>
                    </tr>
                `)
                .join("");


        toggleEmpty(
            "invalidEmpty",
            state.invalidRows.length === 0
        );


        updatePagination(
            "invalid",
            result
        );
    }


    /* ========================================================
       MATERIAL TABLE
       ======================================================== */

    function renderMaterialTable() {

        const body =
            $("materialTableBody");


        if (!body) return;


        const result =
            paginate(
                state.materials,
                state.currentPage.material
            );


        state.currentPage.material =
            result.page;


        body.innerHTML =
            result.items
                .map(item => `
                    <tr>
                        <td>${escapeHTML(item.ticket || "-")}</td>
                        <td>${escapeHTML(item.material || "-")}</td>
                        <td>${escapeHTML(item.qty || "-")}</td>
                        <td>${escapeHTML(item.satuan || "-")}</td>
                        <td>${escapeHTML(item.kode || "-")}</td>
                    </tr>
                `)
                .join("");


        toggleEmpty(
            "materialEmpty",
            state.materials.length === 0
        );


        updatePagination(
            "material",
            result
        );
    }


    /* ========================================================
       MATERIAL ERROR
       ======================================================== */

    function renderMaterialErrorTable() {

        const body =
            $("materialErrorTableBody");


        if (!body) return;


        const result =
            paginate(
                state.materialErrors,
                state.currentPage.materialError
            );


        state.currentPage.materialError =
            result.page;


        body.innerHTML =
            result.items
                .map(item => `
                    <tr>
                        <td>${escapeHTML(item.ticket || "-")}</td>
                        <td>${escapeHTML(item.material || "-")}</td>
                        <td>${escapeHTML(item.qty || "-")}</td>
                        <td>${escapeHTML(item.satuan || "-")}</td>
                        <td>${escapeHTML(item.kode || "-")}</td>
                        <td>${escapeHTML(item.error || "-")}</td>
                    </tr>
                `)
                .join("");


        toggleEmpty(
            "materialErrorEmpty",
            state.materialErrors.length === 0
        );


        updatePagination(
            "materialError",
            result
        );
    }


    /* ========================================================
       EMPTY STATE
       ======================================================== */

    function toggleEmpty(
        id,
        show
    ) {

        const el = $(id);

        if (!el) return;

        el.style.display =
            show
                ? "block"
                : "none";
    }


    /* ========================================================
       PAGINATION UI
       ======================================================== */

    function updatePagination(
        type,
        result
    ) {

        const prev =
            $(`${type}PrevBtn`);

        const next =
            $(`${type}NextBtn`);

        const page =
            $(`${type}PageNumber`);

        const total =
            $(`${type}PageTotal`);


        if (page) {
            page.textContent =
                result.page;
        }


        if (total) {
            total.textContent =
                result.totalPages;
        }


        if (prev) {

            prev.disabled =
                result.page <= 1;
        }


        if (next) {

            next.disabled =
                result.page >=
                result.totalPages;
        }


        const pagination =
            $(`${type}Pagination`);


        if (pagination) {

            pagination.style.display =
                result.totalPages <= 1
                    ? "none"
                    : "flex";
        }
    }


    /* ========================================================
       FILE UI
       ======================================================== */

    function handleFile(
        file
    ) {

        if (!file) return;


        const extension =
            file.name
                .split(".")
                .pop()
                .toLowerCase();


        if (
            ![
                "xlsx",
                "xls",
                "xlsm"
            ].includes(extension)
        ) {

            alert(
                "File harus .xlsx, .xls, atau .xlsm."
            );

            return;
        }


        state.file =
            file;


        const selected =
            $("selectedFile");


        const name =
            $("fileName");


        const size =
            $("fileSize");


        if (selected) {
            selected.classList.remove(
                "hidden"
            );
        }


        if (name) {
            name.textContent =
                file.name;
        }


        if (size) {
            size.textContent =
                formatFileSize(
                    file.size
                );
        }


        const processBtn =
            $("processBtn");


        if (processBtn) {
            processBtn.disabled =
                false;
        }


        const status =
            $("systemStatus");


        if (status) {

            status.textContent =
                "File siap";

            status.classList.remove(
                "offline"
            );

            status.classList.add(
                "online"
            );
        }
    }


    function formatFileSize(bytes) {

        if (!bytes) {
            return "0 KB";
        }


        const mb =
            bytes /
            1024 /
            1024;


        if (mb >= 1) {
            return `${mb.toFixed(2)} MB`;
        }


        return `${(
            bytes / 1024
        ).toFixed(1)} KB`;
    }


    function removeFile() {

        state.file = null;


        const input =
            $("excelFile");


        if (input) {
            input.value = "";
        }


        const selected =
            $("selectedFile");


        if (selected) {
            selected.classList.add(
                "hidden"
            );
        }


        const processBtn =
            $("processBtn");


        if (processBtn) {
            processBtn.disabled =
                true;
        }


        const status =
            $("systemStatus");


        if (status) {

            status.textContent =
                "Ready";

            status.classList.remove(
                "online"
            );

            status.classList.add(
                "offline"
            );
        }
    }


    /* ========================================================
       DOWNLOAD
       ======================================================== */

    function downloadData(
        data,
        filename
    ) {

        if (
            typeof XLSX === "undefined"
        ) {
            alert(
                "Library XLSX belum tersedia."
            );
            return;
        }


        if (!data.length) {

            alert(
                "Tidak ada data untuk didownload."
            );

            return;
        }


        const worksheet =
            XLSX.utils.json_to_sheet(
                data
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


    function downloadValid() {

        const data =
            state.validRows.map(row => ({
                Ticket:
                    row.ticket,

                "Datetime Receive":
                    formatDate(
                        row.receiveDate
                    ),

                "TT Release":
                    formatDate(
                        row.releaseDate
                    ),

                Status:
                    row.status,

                Keterangan:
                    row.note
            }));


        downloadData(
            data,
            "Sesuai.xlsx"
        );
    }


    function downloadInvalid() {

        const data =
            state.invalidRows.map(row => ({
                Ticket:
                    row.ticket,

                "Datetime Receive":
                    formatDate(
                        row.receiveDate
                    ),

                "TT Release":
                    formatDate(
                        row.releaseDate
                    ),

                Status:
                    row.status,

                Keterangan:
                    row.note
            }));


        downloadData(
            data,
            "Tidak Sesuai.xlsx"
        );
    }


    function downloadMaterials() {

        const data =
            state.materials.map(item => ({
                Ticket:
                    item.ticket,

                Material:
                    item.material,

                Qty:
                    item.qty,

                Satuan:
                    item.satuan,

                Kode:
                    item.kode
            }));


        downloadData(
            data,
            "Material.xlsx"
        );
    }


    function downloadMaterialErrors() {

        const data =
            state.materialErrors.map(item => ({
                Ticket:
                    item.ticket,

                Material:
                    item.material,

                Qty:
                    item.qty,

                Satuan:
                    item.satuan,

                Kode:
                    item.kode,

                Error:
                    item.error
            }));


        downloadData(
            data,
            "Material Error.xlsx"
        );
    }


    /* ========================================================
       TABS
       ======================================================== */

    function initTabs() {

        document
            .querySelectorAll(
                ".tab-button"
            )
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        const tab =
                            button.dataset.tab;


                        document
                            .querySelectorAll(
                                ".tab-button"
                            )
                            .forEach(btn =>
                                btn.classList.remove(
                                    "active"
                                )
                            );


                        document
                            .querySelectorAll(
                                ".tab-content"
                            )
                            .forEach(content =>
                                content.classList.remove(
                                    "active"
                                )
                            );


                        button.classList.add(
                            "active"
                        );


                        const target =
                            $(
                                `tab-${tab}`
                            );


                        if (target) {

                            target.classList.add(
                                "active"
                            );
                        }
                    }
                );
            });
    }


    /* ========================================================
       PAGINATION EVENTS
       ======================================================== */

    function initPagination() {

        const types = [
            "valid",
            "invalid",
            "material",
            "materialError"
        ];


        for (
            const type of types
        ) {

            const prev =
                $(`${type}PrevBtn`);

            const next =
                $(`${type}NextBtn`);


            if (prev) {

                prev.addEventListener(
                    "click",
                    () => {

                        state.currentPage[type] =
                            Math.max(
                                1,
                                state.currentPage[type] -
                                1
                            );


                        renderByType(
                            type
                        );
                    }
                );
            }


            if (next) {

                next.addEventListener(
                    "click",
                    () => {

                        state.currentPage[type]++;


                        renderByType(
                            type
                        );
                    }
                );
            }
        }
    }


    function renderByType(type) {

        if (
            type === "valid"
        ) {
            renderValidTable();

        } else if (
            type === "invalid"
        ) {
            renderInvalidTable();

        } else if (
            type === "material"
        ) {
            renderMaterialTable();

        } else if (
            type === "materialError"
        ) {
            renderMaterialErrorTable();
        }
    }


    /* ========================================================
       RESET
       ======================================================== */

    function resetApp() {

        state.workbook = null;
        state.file = null;

        state.rows = [];
        state.validRows = [];
        state.invalidRows = [];
        state.materials = [];
        state.materialErrors = [];

        state.materialIndex = null;

        state.currentPage = {
            valid: 1,
            invalid: 1,
            material: 1,
            materialError: 1
        };


        removeFile();


        const dashboard =
            $("dashboardSection");


        if (dashboard) {

            dashboard.classList.add(
                "hidden"
            );
        }


        [
            "validTableBody",
            "invalidTableBody",
            "materialTableBody",
            "materialErrorTableBody"
        ]
            .forEach(id => {

                const el = $(id);

                if (el) {
                    el.innerHTML = "";
                }
            });
    }


    /* ========================================================
       SETTINGS SAVE HOOK
       ======================================================== */

    function refreshMaterialIndex() {

        /*
         * Dipanggil setelah user menyimpan setting.
         *
         * Material index dibangun ulang.
         * CIR LOCKED tidak berubah.
         */
        buildMaterialIndex();

        console.log(
            `Material index diperbarui: ${state.materials.length} nama material.`
        );
    }


    /* ========================================================
       LISTEN STORAGE CHANGE
       AUTO SYNC
       ======================================================== */

    window.addEventListener(
        "storage",
        event => {

            if (
                event.key ===
                "reportCheckerSettings"
            ) {

                refreshMaterialIndex();
            }
        }
    );


    /* ========================================================
       INIT
       ======================================================== */

    function init() {

        /*
         * Material index dibuat sekali saat aplikasi mulai.
         */
        buildMaterialIndex();


        const fileInput =
            $("excelFile");


        if (fileInput) {

            fileInput.addEventListener(
                "change",
                event => {

                    const file =
                        event.target.files &&
                        event.target.files[0];

                    handleFile(file);
                }
            );
        }


        const dropZone =
            $("dropZone");


        if (dropZone) {

            dropZone.addEventListener(
                "click",
                () => {

                    if (fileInput) {
                        fileInput.click();
                    }
                }
            );


            dropZone.addEventListener(
                "dragover",
                event => {

                    event.preventDefault();

                    dropZone.classList.add(
                        "drag-over"
                    );
                }
            );


            dropZone.addEventListener(
                "dragleave",
                () => {

                    dropZone.classList.remove(
                        "drag-over"
                    );
                }
            );


            dropZone.addEventListener(
                "drop",
                event => {

                    event.preventDefault();

                    dropZone.classList.remove(
                        "drag-over"
                    );


                    const file =
                        event.dataTransfer
                            .files[0];


                    handleFile(file);
                }
            );
        }


        const processBtn =
            $("processBtn");


        if (processBtn) {

            processBtn.addEventListener(
                "click",
                processExcel
            );
        }


        const removeBtn =
            $("removeFileBtn");


        if (removeBtn) {

            removeBtn.addEventListener(
                "click",
                removeFile
            );
        }


        const resetBtn =
            $("resetBtn");


        if (resetBtn) {

            resetBtn.addEventListener(
                "click",
                resetApp
            );
        }


        const validDownload =
            $("downloadValidBtn");


        if (validDownload) {

            validDownload.addEventListener(
                "click",
                downloadValid
            );
        }


        const invalidDownload =
            $("downloadInvalidBtn");


        if (invalidDownload) {

            invalidDownload.addEventListener(
                "click",
                downloadInvalid
            );
        }


        const materialDownload =
            $("downloadMaterialBtn");


        if (materialDownload) {

            materialDownload.addEventListener(
                "click",
                downloadMaterials
            );
        }


        const materialErrorDownload =
            $("downloadMaterialErrorBtn");


        if (materialErrorDownload) {

            materialErrorDownload.addEventListener(
                "click",
                downloadMaterialErrors
            );
        }


        initTabs();

        initPagination();


        /*
         * Expose fungsi agar settings.js bisa
         * meminta refresh index setelah save.
         */
        window.refreshMaterialIndex =
            refreshMaterialIndex;


        console.log(
            "Report Checker siap."
        );

        console.log(
            "CIR system: LOCKED"
        );

        console.log(
            "Material index:",
            state.materials.length
        );
    }


    /* ========================================================
       PUBLIC API
       ======================================================== */

    window.ReportChecker = {

        state,

        processExcel,

        resetApp,

        refreshMaterialIndex,

        findFirstCIRDate,

        findMaterials,

        buildMaterialIndex
    };


    /*
     * DOM ready.
     */
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
