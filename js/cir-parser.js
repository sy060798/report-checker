/* =========================================================
   REPORT CHECKER
   cir-parser.js

   UPDATE:
   - CIR header fleksibel
   - Case insensitive
   - TT Release hanya dicari setelah CIR
   - Mendukung tanggal sebelum / sesudah TT Release
   - Mendukung // pada tanggal
   - Mendukung berbagai separator CIR
   - Tidak membaca TT Onsite sebagai TT Release
   - Sistem result lama tetap dipertahankan
========================================================= */

(function () {

    "use strict";


    /* =====================================================
       CONSTANTS
    ===================================================== */

    const DEFAULT_TIMEZONE = "Asia/Jakarta";

    /*
     * Maksimal jarak tanggal dari baris TT Release.
     *
     * Contoh valid:
     *
     * TT Release
     * 18/08/2026 19:35
     *
     * atau:
     *
     * 18/08/2026 19:35 TT Release
     *
     * atau:
     *
     * 18/08/2026 19:35
     * TT Release
     */
    const RELEASE_DATE_MAX_DISTANCE = 5;


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
            typeof window.ReportCheckerSettings.get ===
                "function"
        ) {

            return window.ReportCheckerSettings.get();

        }


        return {

            releasePhrases: [
                "TT Release",
                "TT release",
                "TT RELEASE",
                "Ticket Release",
                "Ticket release",
                "TICKET RELEASE"
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
            .replace(
                /[.*+?^${}()|[\]\\]/g,
                "\\$&"
            );

    }


    /* =====================================================
       DATE PARSING
       
       Support:

       21/08/2026 19:07
       21//08/2026 19:07

       18/08/2026 19:35
       18-08-2026 19:35

       2026-08-18 19:35

       18/08/2026
       2026-08-18
    ===================================================== */

    function parseDateTime(text) {

        if (!text) {

            return null;

        }


        let value =
            normalizeLine(text);


        /*
         * Normalisasi slash ganda.
         *
         * 21//08/2026
         * menjadi
         * 21/08/2026
         *
         * Tetapi tidak mengubah format tanggal lain.
         */

        value =
            value.replace(
                /\/{2,}/g,
                "/"
            );


        /* =================================================
           DD/MM/YYYY HH:mm:ss
        ================================================= */

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


        /* =================================================
           DD-MM-YYYY HH:mm:ss
        ================================================= */

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


        /* =================================================
           YYYY-MM-DD HH:mm:ss
        ================================================= */

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


        /* =================================================
           DD/MM/YYYY
        ================================================= */

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


        /* =================================================
           DD-MM-YYYY
        ================================================= */

        match =
            value.match(
                /(\d{1,2})-(\d{1,2})-(\d{4})/
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


        /* =================================================
           YYYY-MM-DD
        ================================================= */

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

        /*
         * Validasi basic.
         */

        if (
            year < 1900 ||
            month < 1 ||
            month > 12 ||
            day < 1 ||
            day > 31 ||
            hour < 0 ||
            hour > 23 ||
            minute < 0 ||
            minute > 59 ||
            second < 0 ||
            second > 59
        ) {

            return null;

        }


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
         * Validasi tanggal sebenarnya.
         *
         * 31/02/2026
         * harus dianggap invalid.
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
            Number.isNaN(
                date.getTime()
            )
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
             *
             * Contoh:
             *
             * LINK A - LINK B
             *
             * jangan dianggap NOT YET.
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
       
       Support:

       CIR

       CIR :

       ====CIR====

       ======CIR========

       ===== CIR =====

       ---- CIR ----

       ___CIR___

       # CIR #
    ===================================================== */

    function findCIRHeader(
        lines
    ) {

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
             * Buang dekorasi:
             *
             * =
             * -
             * _
             * *
             * #
             * :
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
             * Normal:
             *
             * CIR
             */

            if (
                /^CIR$/i.test(
                    cleaned
                )
            ) {

                return {

                    found:
                        true,

                    index:
                        index,

                    line:
                        originalLine

                };

            }


            /*
             * Contoh:
             *
             * CIR :
             * CIR =================
             */

            if (
                /^CIR\b/i.test(
                    cleaned
                )
            ) {

                return {

                    found:
                        true,

                    index:
                        index,

                    line:
                        originalLine

                };

            }

        }


        return {

            found:
                false,

            index:
                -1,

            line:
                ""

        };

    }


    /* =====================================================
       IS NEXT SECTION
    ===================================================== */

    function isNextSection(
        line
    ) {

        const value =
            normalizeLine(
                line
            );


        if (!value) {

            return false;

        }


        /*
         * Section berikutnya yang jelas.
         *
         * Jangan terlalu agresif.
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
                pattern.test(
                    value
                )
        );

    }


    /* =====================================================
       GET CIR SECTION
       
       Penting:
       TT Release hanya dicari setelah CIR header.
    ===================================================== */

    function getCIRSection(
        text
    ) {

        const lines =
            normalizeText(
                text
            )
                .split("\n");


        const header =
            findCIRHeader(
                lines
            );


        if (!header.found) {

            return {

                found:
                    false,

                headerIndex:
                    -1,

                endIndex:
                    -1,

                lines:
                    [],

                text:
                    ""

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


            /*
             * Jika ketemu section lain,
             * CIR section selesai.
             */

            if (
                isNextSection(
                    line
                )
            ) {

                endIndex =
                    index;

                break;

            }


            /*
             * Jika menemukan CIR header kedua,
             * berhenti di header tersebut.
             *
             * Ini penting jika report mempunyai
             * lebih dari satu blok CIR.
             */

            const normalized =
                normalizeLine(
                    line
                );


            const cleaned =
                normalized

                    .replace(
                        /^[=\-_*#:\s]+/,
                        ""
                    )

                    .replace(
                        /[=\-_*#:\s]+$/,
                        ""
                    )

                    .trim();


            if (
                /^CIR$/i.test(
                    cleaned
                )
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

            found:
                true,

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
       
       Hanya bekerja pada CIR section.
       
       Case insensitive.
       
       TT Onsite TIDAK dianggap TT Release.
    ===================================================== */

    function findReleaseLine(
        cirText,
        releasePhrases
    ) {

        const lines =
            normalizeText(
                cirText
            )
                .split("\n");


        if (
            !lines.length
        ) {

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
                const phrase of
                    releasePhrases || []
            ) {

                if (!phrase) {

                    continue;

                }


                const phraseText =
                    String(
                        phrase
                    )
                        .trim();


                if (!phraseText) {

                    continue;

                }


                const regex =
                    new RegExp(
                        escapeRegExp(
                            phraseText
                        ),
                        "i"
                    );


                /*
                 * Hanya match phrase yang memang
                 * release.
                 */

                if (
                    regex.test(
                        line
                    )
                ) {

                    return {

                        line:
                            originalLine,

                        normalizedLine:
                            line,

                        index:
                            index,

                        phrase:
                            phraseText

                    };

                }

            }

        }


        return null;

    }


    /* =====================================================
       SEARCH DATE AROUND RELEASE LINE
       
       Support:

       18/08/2026 19:35 TT release

       TT release
       18/08/2026 19:35

       18/08/2026 19:35
       TT release

       TT release


       18/08/2026 19:35

       Jarak maksimal 5 baris.
    ===================================================== */

    function searchDateAroundLine(
        lines,
        releaseIndex
    ) {

        /*
         * 1. Baris TT Release sendiri.
         */

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


        /*
         * 2. Cari setelah TT Release.
         *
         * Prioritas ke baris setelahnya.
         */

        for (
            let offset = 1;

            offset <=
                RELEASE_DATE_MAX_DISTANCE;

            offset++
        ) {

            const index =
                releaseIndex +
                offset;


            if (
                index >=
                lines.length
            ) {

                break;

            }


            const line =
                lines[index];


            /*
             * Jangan melewati section lain.
             */

            if (
                isNextSection(
                    line
                )
            ) {

                break;

            }


            date =
                parseDateTime(
                    line
                );


            if (date) {

                return {

                    date:
                        date,

                    sourceLine:
                        line,

                    sourceIndex:
                        index

                };

            }

        }


        /*
         * 3. Cari sebelum TT Release.
         */

        for (
            let offset = 1;

            offset <=
                RELEASE_DATE_MAX_DISTANCE;

            offset++
        ) {

            const index =
                releaseIndex -
                offset;


            if (
                index < 0
            ) {

                break;

            }


            const line =
                lines[index];


            date =
                parseDateTime(
                    line
                );


            if (date) {

                return {

                    date:
                        date,

                    sourceLine:
                        line,

                    sourceIndex:
                        index

                };

            }

        }


        return null;

    }


    /* =====================================================
       FIND TT RELEASE IN FULL REPORT
       
       Fungsi ini sengaja menggunakan CIR section.
       
       Tidak boleh mencari langsung dari seluruh report.
    ===================================================== */

    function findReleaseInCIR(
        text,
        settings
    ) {

        const cirSection =
            getCIRSection(
                text
            );


        if (
            !cirSection.found
        ) {

            return {

                cirFound:
                    false,

                releaseFound:
                    false,

                cirSection:
                    cirSection,

                releaseLine:
                    null,

                dateResult:
                    null

            };

        }


        const releaseLine =
            findReleaseLine(
                cirSection.text,
                settings.releasePhrases
            );


        if (!releaseLine) {

            return {

                cirFound:
                    true,

                releaseFound:
                    false,

                cirSection:
                    cirSection,

                releaseLine:
                    null,

                dateResult:
                    null

            };

        }


        const dateResult =
            searchDateAroundLine(
                cirSection.lines,
                releaseLine.index
            );


        return {

            cirFound:
                true,

            releaseFound:
                true,

            cirSection:
                cirSection,

            releaseLine:
                releaseLine,

            dateResult:
                dateResult

        };

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
           CARI TT RELEASE DI DALAM CIR
        ================================================= */

        const searchResult =
            findReleaseInCIR(
                text,
                settings
            );


        /* =================================================
           CIR TIDAK ADA
        ================================================= */

        if (
            !searchResult.cirFound
        ) {

            result.status =
                "NOT FOUND";

            result.note =
                "Section CIR tidak ditemukan.";

            return result;

        }


        const cirSection =
            searchResult.cirSection;


        /* =================================================
           TT RELEASE TIDAK ADA
        ================================================= */

        if (
            !searchResult.releaseFound
        ) {

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


        /* =================================================
           RELEASE LINE
        ================================================= */

        const releaseLine =
            searchResult.releaseLine;


        result.matchedPhrase =
            releaseLine.phrase;


        result.sourceLine =
            releaseLine.line;


        /*
         * Index global terhadap report.
         */

        result.sourceIndex =
            cirSection.headerIndex +
            1 +
            releaseLine.index;


        /* =================================================
           DATE RESULT
        ================================================= */

        const dateResult =
            searchResult.dateResult;


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
                "TT Release ditemukan pada section CIR dan tanggal release ditemukan di sekitar baris TT Release.";

        } else {

            result.note =
                "TT Release berhasil ditemukan pada section CIR.";

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

        if (
            !Array.isArray(rows)
        ) {

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
            normalizeText,

        findCIRHeader:
            findCIRHeader,

        getCIRSection:
            getCIRSection,

        findReleaseLine:
            findReleaseLine

    };


})();
