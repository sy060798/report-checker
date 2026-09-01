/* =========================================================
   REPORT CHECKER
   cir-parser.js

   Fungsi utama:
   - Membaca teks CIR
   - Mencari TT Release
   - Mengambil tanggal + jam TT Release
   - Menangani beberapa format tanggal
   - Mendeteksi NOT FOUND / NOT YET
   - Tidak mengubah data CIR asli
========================================================= */

(function () {

    "use strict";


    /* =====================================================
       CONSTANTS
    ===================================================== */

    const DEFAULT_TIMEZONE = "Asia/Jakarta";


    /* =====================================================
       NORMALIZE TEXT
    ===================================================== */

    function normalizeText(value) {

        if (
            value === null ||
            value === undefined
        ) {
            return "";
        }


        return String(value)
            .replace(/\r\n/g, "\n")
            .replace(/\r/g, "\n")
            .replace(/\u00A0/g, " ")
            .trim();

    }


    /* =====================================================
       NORMALIZE LINE
    ===================================================== */

    function normalizeLine(value) {

        return String(value || "")
            .replace(/\s+/g, " ")
            .trim();

    }


    /* =====================================================
       GET SETTINGS
    ===================================================== */

    function getSettings() {

        if (
            window.ReportCheckerSettings &&
            typeof window.ReportCheckerSettings.get === "function"
        ) {

            return window.ReportCheckerSettings.get();

        }


        return {

            releasePhrases: [
                "TT Release",
                "TT release",
                "TT RELEASE",
                "Ticket Release",
                "Ticket release"
            ],

            notFoundPhrases: [
                "NOT YET",
                "NOT FOUND",
                "Belum ada",
                "Belum tersedia",
                "Pending",
                "N/A",
                "-"
            ]

        };

    }


    /* =====================================================
       ESCAPE REGEX
    ===================================================== */

    function escapeRegExp(value) {

        return String(value)
            .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    }


    /* =====================================================
       DATE PARSING
       
       Supported examples:
       
       31/08/2026 11:43
       31/08/2026 11:43:22

       2026-08-31 11:43
       2026-08-31 11:43:22

       31-08-2026 11:43
       31-08-2026 11:43:22

       31/08/2026
       2026-08-31
    ===================================================== */

    function parseDateTime(text) {

        if (!text) {
            return null;
        }


        const value =
            normalizeLine(text);


        /* ---------------------------------------------
           FORMAT:
           DD/MM/YYYY HH:mm:ss
        --------------------------------------------- */

        let match =
            value.match(
                /(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/
            );


        if (match) {

            return createDate(
                Number(match[3]),
                Number(match[2]),
                Number(match[1]),
                Number(match[4]),
                Number(match[5]),
                Number(match[6] || 0)
            );

        }


        /* ---------------------------------------------
           FORMAT:
           DD-MM-YYYY HH:mm:ss
        --------------------------------------------- */

        match =
            value.match(
                /(\d{1,2})-(\d{1,2})-(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/
            );


        if (match) {

            return createDate(
                Number(match[3]),
                Number(match[2]),
                Number(match[1]),
                Number(match[4]),
                Number(match[5]),
                Number(match[6] || 0)
            );

        }


        /* ---------------------------------------------
           FORMAT:
           YYYY-MM-DD HH:mm:ss
        --------------------------------------------- */

        match =
            value.match(
                /(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/
            );


        if (match) {

            return createDate(
                Number(match[1]),
                Number(match[2]),
                Number(match[3]),
                Number(match[4]),
                Number(match[5]),
                Number(match[6] || 0)
            );

        }


        /* ---------------------------------------------
           FORMAT:
           DD/MM/YYYY
        --------------------------------------------- */

        match =
            value.match(
                /(\d{1,2})\/(\d{1,2})\/(\d{4})/
            );


        if (match) {

            return createDate(
                Number(match[3]),
                Number(match[2]),
                Number(match[1]),
                0,
                0,
                0
            );

        }


        /* ---------------------------------------------
           FORMAT:
           YYYY-MM-DD
        --------------------------------------------- */

        match =
            value.match(
                /(\d{4})-(\d{1,2})-(\d{1,2})/
            );


        if (match) {

            return createDate(
                Number(match[1]),
                Number(match[2]),
                Number(match[3]),
                0,
                0,
                0
            );

        }


        return null;

    }


    /* =====================================================
       CREATE DATE
       
       JavaScript Date dibuat menggunakan local browser
       karena data operasional menggunakan WIB.
    ===================================================== */

    function createDate(
        year,
        month,
        day,
        hour,
        minute,
        second
    ) {

        const date =
            new Date(
                year,
                month - 1,
                day,
                hour,
                minute,
                second
            );


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return null;

        }


        return date;

    }


    /* =====================================================
       FORMAT DATE
    ===================================================== */

    function formatDateTime(date) {

        if (
            !date ||
            Number.isNaN(date.getTime())
        ) {

            return "";

        }


        const pad =
            value =>
                String(value)
                    .padStart(2, "0");


        return [
            pad(date.getDate()),
            pad(date.getMonth() + 1),
            date.getFullYear()
        ].join("/") +
        " " +
        [
            pad(date.getHours()),
            pad(date.getMinutes()),
            pad(date.getSeconds())
        ].join(":");

    }


    /* =====================================================
       CHECK NOT FOUND PHRASE
    ===================================================== */

    function containsNotFoundPhrase(
        text,
        phrases
    ) {

        if (!text) {
            return false;
        }


        const lowerText =
            text.toLowerCase();


        for (
            const phrase of phrases || []
        ) {

            if (!phrase) {
                continue;
            }


            const lowerPhrase =
                String(phrase)
                    .toLowerCase()
                    .trim();


            if (!lowerPhrase) {
                continue;
            }


            if (
                lowerText.includes(
                    lowerPhrase
                )
            ) {

                return true;

            }

        }


        return false;

    }


    /* =====================================================
       FIND RELEASE LINE
    ===================================================== */

    function findReleaseLine(
        cirText,
        releasePhrases
    ) {

        const lines =
            normalizeText(cirText)
                .split("\n");


        if (!lines.length) {

            return null;

        }


        for (
            let index = 0;
            index < lines.length;
            index++
        ) {

            const originalLine =
                lines[index];


            const line =
                normalizeLine(
                    originalLine
                );


            if (!line) {
                continue;
            }


            for (
                const phrase of releasePhrases || []
            ) {

                if (!phrase) {
                    continue;
                }


                const regex =
                    new RegExp(
                        escapeRegExp(
                            phrase
                        ),
                        "i"
                    );


                if (
                    regex.test(line)
                ) {

                    return {

                        line: originalLine,

                        normalizedLine: line,

                        index: index,

                        phrase: phrase

                    };

                }

            }

        }


        return null;

    }


    /* =====================================================
       EXTRACT DATE FROM RELEASE LINE
    ===================================================== */

    function extractReleaseDateFromLine(
        line
    ) {

        if (!line) {
            return null;
        }


        const parsed =
            parseDateTime(line);


        if (parsed) {

            return parsed;

        }


        return null;

    }


    /* =====================================================
       SEARCH DATE AROUND RELEASE LINE
       
       Jika baris "TT Release" tidak mengandung tanggal,
       parser akan mencoba beberapa baris di sekitar.
    ===================================================== */

    function searchDateAroundLine(
        lines,
        releaseIndex
    ) {

        const maxDistance = 3;


        /* ---------------------------------------------
           1. Coba baris release sendiri
        --------------------------------------------- */

        let date =
            parseDateTime(
                lines[releaseIndex]
            );


        if (date) {

            return {

                date: date,

                sourceLine:
                    lines[releaseIndex],

                sourceIndex:
                    releaseIndex

            };

        }


        /* ---------------------------------------------
           2. Coba beberapa baris setelahnya
        --------------------------------------------- */

        for (
            let offset = 1;
            offset <= maxDistance;
            offset++
        ) {

            const index =
                releaseIndex + offset;


            if (
                index >= lines.length
            ) {

                break;

            }


            date =
                parseDateTime(
                    lines[index]
                );


            if (date) {

                return {

                    date: date,

                    sourceLine:
                        lines[index],

                    sourceIndex:
                        index

                };

            }

        }


        /* ---------------------------------------------
           3. Coba beberapa baris sebelumnya
        --------------------------------------------- */

        for (
            let offset = 1;
            offset <= maxDistance;
            offset++
        ) {

            const index =
                releaseIndex - offset;


            if (index < 0) {

                break;

            }


            date =
                parseDateTime(
                    lines[index]
                );


            if (date) {

                return {

                    date: date,

                    sourceLine:
                        lines[index],

                    sourceIndex:
                        index

                };

            }

        }


        return null;

    }


    /* =====================================================
       MAIN PARSER
    ===================================================== */

    function parseCIR(
        cirText
    ) {

        const text =
            normalizeText(
                cirText
            );


        const settings =
            getSettings();


        const result = {

            found: false,

            status: "NOT FOUND",

            releaseDate: null,

            releaseDateText: "",

            sourceLine: "",

            sourceIndex: -1,

            matchedPhrase: "",

            note: "",

            rawCIR: text

        };


        /* ---------------------------------------------
           CIR kosong
        --------------------------------------------- */

        if (!text) {

            result.status =
                "NOT FOUND";

            result.note =
                "Kolom CIR kosong.";

            return result;

        }


        /* ---------------------------------------------
           Cari frasa NOT FOUND
           
           Catatan:
           Jangan langsung menganggap seluruh CIR
           NOT FOUND jika ada "-" di bagian lain.
           
           Karena "-" terlalu umum.
           
           Kita hanya gunakan phrase tersebut sebagai
           fallback setelah pencarian TT Release gagal.
        --------------------------------------------- */

        const releaseLine =
            findReleaseLine(
                text,
                settings.releasePhrases
            );


        /* ---------------------------------------------
           TT Release tidak ditemukan
        --------------------------------------------- */

        if (!releaseLine) {

            const notFound =
                containsNotFoundPhrase(
                    text,
                    settings.notFoundPhrases
                );


            result.status =
                notFound
                    ? "NOT YET"
                    : "NOT FOUND";


            result.note =
                notFound
                    ? "Ditemukan indikasi data belum tersedia."
                    : "Frasa TT Release tidak ditemukan.";

            return result;

        }


        result.matchedPhrase =
            releaseLine.phrase;


        result.sourceLine =
            releaseLine.line;


        result.sourceIndex =
            releaseLine.index;


        /* ---------------------------------------------
           Cari tanggal di sekitar baris release
        --------------------------------------------- */

        const lines =
            text.split("\n");


        const dateResult =
            searchDateAroundLine(
                lines,
                releaseLine.index
            );


        if (!dateResult) {

            result.status =
                "NOT FOUND";

            result.note =
                "TT Release ditemukan tetapi tanggal/jam tidak dapat dibaca.";

            return result;

        }


        result.found =
            true;


        result.status =
            "FOUND";


        result.releaseDate =
            dateResult.date;


        result.releaseDateText =
            formatDateTime(
                dateResult.date
            );


        /*
         * Jika tanggal ditemukan dari baris berbeda,
         * sourceLine tetap disimpan agar mudah audit.
         */
        if (
            dateResult.sourceIndex !==
            releaseLine.index
        ) {

            result.note =
                "Tanggal release ditemukan di sekitar baris TT Release.";

        } else {

            result.note =
                "TT Release berhasil ditemukan.";

        }


        return result;

    }


    /* =====================================================
       PARSE MULTIPLE CIR
    ===================================================== */

    function parseMultipleCIR(
        rows,
        cirField
    ) {

        if (!Array.isArray(rows)) {

            return [];

        }


        return rows.map(
            function (row) {

                const cir =
                    row
                        ? row[cirField]
                        : "";


                return parseCIR(
                    cir
                );

            }
        );

    }


    /* =====================================================
       PUBLIC API
    ===================================================== */

    window.ReportCheckerCIR = {

        parse: parseCIR,

        parseMultiple:
            parseMultipleCIR,

        parseDateTime:
            parseDateTime,

        formatDateTime:
            formatDateTime,

        normalizeText:
            normalizeText

    };


})();
