/* =========================================================
   REPORT CHECKER
   cir-parser.js

   UPDATE:
   - CIR header fleksibel
   - Case insensitive
   - TT Release hanya dicari setelah CIR
   - Mendukung tanggal sebelum / sesudah TT Release
   - Sistem result lama tetap dipertahankan
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
    ===================================================== */

    function parseDateTime(text) {

        if (!text) {
            return null;
        }

        const value =
            normalizeLine(text);


        /* DD/MM/YYYY HH:mm:ss */

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


        /* DD-MM-YYYY HH:mm:ss */

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


        /* YYYY-MM-DD HH:mm:ss */

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


        /* DD/MM/YYYY */

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


        /* YYYY-MM-DD */

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


        /*
         * Validasi tanggal.
         * Contoh 31/02/2026 tidak boleh dianggap valid.
         */

        if (
            date.getFullYear() !== year ||
            date.getMonth() !== month - 1 ||
            date.getDate() !== day
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


            /*
             * "-" terlalu umum.
             * Jangan digunakan sebagai indikator NOT YET
             * ketika berdiri sendiri.
             */

            if (
                lowerPhrase === "-"
            ) {

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
       FIND CIR HEADER
       
       Contoh yang diterima:

       CIR
       CIR :
       ======CIR========
       ===== CIR =====
       ===CIR===
       ---- CIR ----
       CIR =================
    ===================================================== */

    function findCIRHeader(lines) {

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


            /*
             * Buang karakter dekorasi di awal/akhir.
             */

            const cleaned =
                line
                    .replace(
                        /^[=\-_*#:\s]+/,
                        ""
                    )
                    .replace(
                        /[=\-_*#:\s]+$/,
                        ""
                    )
                    .trim();


            /*
             * Setelah dekorasi dibuang,
             * harus menjadi CIR atau diawali CIR.
             *
             * Contoh:
             * ======CIR========
             * menjadi CIR
             */

            if (
                /^CIR$/i.test(cleaned)
            ) {

                return {

                    found: true,

                    index: index,

                    line: originalLine

                };

            }


            /*
             * Dukungan:
             *
             * CIR :
             * CIR =================
             */

            if (
                /^CIR\b/i.test(cleaned)
            ) {

                return {

                    found: true,

                    index: index,

                    line: originalLine

                };

            }

        }


        return {

            found: false,

            index: -1,

            line: ""

        };

    }


    /* =====================================================
       FIND END OF CIR SECTION
       
       Kita tidak mau mengambil tanggal dari section
       lain secara sembarangan.

       CIR dianggap berjalan sampai:
       - section jelas berikutnya
       - atau akhir report
    ===================================================== */

    function isNextSection(line) {

        const value =
            normalizeLine(line);


        if (!value) {
            return false;
        }


        /*
         * Jangan anggap baris biasa sebagai section.
         */

        const sectionPatterns = [

            /^Material\s*:?\s*$/i,

            /^MATERIAL\s*:?\s*$/i,

            /^Tim\s+QN\s*:?\s*$/i,

            /^Team\s+QN\s*:?\s*$/i,

            /^PIC\s+FS\s*:?\s*$/i,

            /^PIC\s*:?\s*$/i,

            /^RFO\s*:?\s*$/i,

            /^Action\s*:?\s*$/i,

            /^Act\s*:?\s*$/i,

            /^Description\s*:?\s*$/i,

            /^Impact\s*:?\s*$/i

        ];


        return sectionPatterns.some(
            pattern =>
                pattern.test(value)
        );

    }


    /* =====================================================
       GET CIR SECTION
    ===================================================== */

    function getCIRSection(
        text
    ) {

        const lines =
            normalizeText(text)
                .split("\n");


        const header =
            findCIRHeader(
                lines
            );


        if (!header.found) {

            return {

                found: false,

                headerIndex: -1,

                endIndex: -1,

                lines: [],

                text: ""

            };

        }


        const cirLines = [];


        let endIndex =
            lines.length;


        for (
            let index =
                header.index + 1;

            index < lines.length;

            index++
        ) {

            const line =
                lines[index];


            if (
                isNextSection(line)
            ) {

                endIndex =
                    index;

                break;

            }


            cirLines.push(
                line
            );

        }


        return {

            found: true,

            headerIndex:
                header.index,

            endIndex:
                endIndex,

            lines:
                cirLines,

            text:
                cirLines.join("\n")

        };

    }


    /* =====================================================
       FIND RELEASE LINE
       
       Case insensitive.
       
       IMPORTANT:
       Hanya dipanggil pada SECTION CIR.
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

                        line:
                            originalLine,

                        normalizedLine:
                            line,

                        index:
                            index,

                        phrase:
                            phrase

                    };

                }

            }

        }


        return null;

    }


    /* =====================================================
       SEARCH DATE AROUND RELEASE LINE
       
       Mendukung:

       18/08/2026 19:35 TT release

       TT release
       18/08/2026 19:35

       18/08/2026 19:35
       TT release

       Jarak maksimum 3 baris.
    ===================================================== */

    function searchDateAroundLine(
        lines,
        releaseIndex
    ) {

        const maxDistance = 3;


        /* 1. Baris release sendiri */

        let date =
            parseDateTime(
                lines[releaseIndex]
            );


        if (date) {

            return {

                date:
                    date,

                sourceLine:
                    lines[releaseIndex],

                sourceIndex:
                    releaseIndex

            };

        }


        /* 2. Setelah TT Release */

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

                    date:
                        date,

                    sourceLine:
                        lines[index],

                    sourceIndex:
                        index

                };

            }

        }


        /* 3. Sebelum TT Release */

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

                    date:
                        date,

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

            found:
                false,

            status:
                "NOT FOUND",

            releaseDate:
                null,

            releaseDateText:
                "",

            sourceLine:
                "",

            sourceIndex:
                -1,

            matchedPhrase:
                "",

            note:
                "",

            rawCIR:
                text

        };


        /* =================================================
           CIR KOSONG
        ================================================= */

        if (!text) {

            result.status =
                "NOT FOUND";

            result.note =
                "Kolom CIR kosong.";

            return result;

        }


        /* =================================================
           CARI SECTION CIR
        ================================================= */

        const cirSection =
            getCIRSection(
                text
            );


        /*
         * Kalau tidak ada header CIR,
         * JANGAN cari TT Release di seluruh report.
         */

        if (
            !cirSection.found
        ) {

            result.status =
                "NOT FOUND";

            result.note =
                "Section CIR tidak ditemukan.";

            return result;

        }


        /* =================================================
           CARI TT RELEASE HANYA DI SECTION CIR
        ================================================= */

        const releaseLine =
            findReleaseLine(
                cirSection.text,
                settings.releasePhrases
            );


        /* =================================================
           TT RELEASE TIDAK DITEMUKAN
        ================================================= */

        if (!releaseLine) {

            const notFound =
                containsNotFoundPhrase(
                    cirSection.text,
                    settings.notFoundPhrases
                );


            result.status =
                notFound
                    ? "NOT YET"
                    : "NOT FOUND";


            result.note =
                notFound
                    ? "Ditemukan indikasi data belum tersedia pada section CIR."
                    : "Frasa TT Release tidak ditemukan pada section CIR.";


            return result;

        }


        result.matchedPhrase =
            releaseLine.phrase;


        result.sourceLine =
            releaseLine.line;


        /*
         * Index dikembalikan relatif terhadap section CIR.
         * Tetap berguna untuk audit.
         */

        result.sourceIndex =
            cirSection.headerIndex +
            1 +
            releaseLine.index;


        /* =================================================
           CARI TANGGAL
        ================================================= */

        const dateResult =
            searchDateAroundLine(
                cirSection.lines,
                releaseLine.index
            );


        if (!dateResult) {

            result.status =
                "NOT FOUND";

            result.note =
                "TT Release ditemukan tetapi tanggal/jam tidak dapat dibaca.";

            return result;

        }


        /* =================================================
           FOUND
        ================================================= */

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

        parse:
            parseCIR,

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
