/* =========================================================
   REPORT CHECKER
   cir-parser.js

   UPDATE FINAL:

   1. Mencari tulisan CIR secara fleksibel:
      CIR
      ===CIR===
      ===== CIR =====
      ---CIR---
      *** CIR ***
      CIR :
      CIR REPORT
      dll.

   2. Setelah CIR ditemukan, parser TIDAK lagi bergantung
      pada tulisan "TT Release".

   3. Parser mencari tanggal + jam PALING AWAL setelah CIR.

   4. Baris kosong / gap setelah CIR TIDAK menjadi masalah.

   5. Contoh:

      ===CIR====

      21/08/2026 15.59 TT RELESAE

      -> diambil:
         21/08/2026 15.59

   6. Mendukung:
      21/08/2026 15.59
      21/08/2026 15:59
      21//08//2026 15.59
      21-08-2026 15.59
      2026-08-21 15.59

   7. Ticket = TT Number kolom D.
   8. CIR default = kolom AF.
========================================================= */

(function () {

    "use strict";


    /* =====================================================
       CONSTANTS
    ===================================================== */

    const DEFAULT_TIMEZONE = "Asia/Jakarta";

    /*
     * Kolom D
     *
     * A = index 0
     * B = index 1
     * C = index 2
     * D = index 3
     */
    const DEFAULT_TT_NUMBER_COLUMN_INDEX = 3;


    /*
     * Kolom AF
     *
     * A  = 0
     * ...
     * AF = 31
     */
    const DEFAULT_CIR_COLUMN_INDEX = 31;


    /*
     * Maksimal jumlah baris yang diperiksa
     * setelah menemukan CIR.

     * Nilai besar supaya gap/baris kosong
     * tidak menyebabkan tanggal terlewat.
     */
    const MAX_CIR_SEARCH_LINES = 200;


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
       NORMALIZE TT NUMBER
    ===================================================== */

    function normalizeTTNumber(value) {

        if (
            value === null ||
            value === undefined
        ) {

            return "";

        }

        return String(value)
            .trim();

    }


    /* =====================================================
       GET TT NUMBER FROM ROW
    ===================================================== */

    function getTTNumberFromRow(row) {

        if (
            row === null ||
            row === undefined
        ) {

            return "";

        }


        /*
         * Array
         *
         * D = index 3
         */
        if (
            Array.isArray(row)
        ) {

            return normalizeTTNumber(
                row[
                    DEFAULT_TT_NUMBER_COLUMN_INDEX
                ]
            );

        }


        /*
         * Object
         */

        const possibleFields = [

            "ttNumber",
            "TT Number",
            "TTNumber",
            "TT NUMBER",
            "tt number",
            "TT_Number",
            "tt_number"

        ];


        for (
            const field of possibleFields
        ) {

            if (
                Object.prototype.hasOwnProperty.call(
                    row,
                    field
                )
            ) {

                const value =
                    normalizeTTNumber(
                        row[field]
                    );


                if (value) {

                    return value;

                }

            }

        }


        /*
         * Fallback case insensitive.
         */

        const keys =
            Object.keys(row);


        for (
            const key of keys
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

                return normalizeTTNumber(
                    row[key]
                );

            }

        }


        return "";

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

            const settings =
                window.ReportCheckerSettings.get();


            return settings || {};

        }


        return {

            releasePhrases: [

                "TT Release",
                "Ticket Release"

            ],

            notFoundPhrases: [

                "NOT YET",
                "NOT FOUND",
                "Belum ada",
                "Belum tersedia",
                "Pending",
                "N/A"

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
       NORMALIZE DATE SEPARATOR
       
       Contoh:
       
       21//08//2026
       21///08/2026

       menjadi:

       21/08/2026
    ===================================================== */

    function normalizeDateSeparators(value) {

        return String(value || "")
            .replace(
                /\/{2,}/g,
                "/"
            )
            .replace(
                /:{2,}/g,
                ":"
            )
            .replace(
                /\s+/g,
                " "
            )
            .trim();

    }


    /* =====================================================
       PARSE DATETIME
       
       Support:

       21/08/2026 19:07
       21/08/2026 19.07
       21//08//2026 19:07
       21-08-2026 19:07
       21-08-2026 19.07
       2026-08-21 19:07
       2026-08-21 19.07

       Date only juga didukung.
    ===================================================== */

    function parseDateTime(text) {

        if (!text) {

            return null;

        }


        let value =
            normalizeDateSeparators(
                text
            );


        /* =================================================
           DD/MM/YYYY HH:mm atau HH.mm
        ================================================= */

        let match =
            value.match(
                /(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2})[:.](\d{2})(?::(\d{2}))?/
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
           DD-MM-YYYY HH:mm atau HH.mm
        ================================================= */

        match =
            value.match(
                /(\d{1,2})-(\d{1,2})-(\d{4})\s+(\d{1,2})[:.](\d{2})(?::(\d{2}))?/
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
           YYYY-MM-DD HH:mm atau HH.mm
        ================================================= */

        match =
            value.match(
                /(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2})[:.](\d{2})(?::(\d{2}))?/
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
         * Pastikan tanggal valid.
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
       CHECK NOT FOUND
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
             * "-" jangan digunakan karena
             * terlalu umum.
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
       IS CIR HEADER
       
       PENTING:

       Tidak menggunakan exact match.

       Semua bentuk berikut diterima:

       CIR
       ===CIR===
       =====CIR=====
       === CIR ===
       --- CIR ---
       *** CIR ***
       CIR:
       CIR REPORT
       CIR DETAIL
       [CIR]
       dll.

       Syarat utama:
       ada kata CIR sebagai token.
    ===================================================== */

    function isCIRHeader(line) {

        const value =
            normalizeLine(
                line
            );


        if (!value) {

            return false;

        }


        /*
         * Hilangkan separator di awal/akhir.
         */

        const cleaned =
            value
                .replace(
                    /^[=\-_*#:\s[\](){}<>]+/g,
                    ""
                )
                .replace(
                    /[=\-_*#:\s[\](){}<>]+$/g,
                    ""
                )
                .trim();


        /*
         * Cari token CIR.
         *
         * \b memastikan:
         *
         * CIR = cocok
         * ===CIR=== = cocok
         * CIR: = cocok
         *
         * CIRCLE = tidak cocok
         * CIRCUIT = tidak cocok
         */
        return /\bCIR\b/i.test(
            cleaned
        );

    }


    /* =====================================================
       FIND CIR HEADER
    ===================================================== */

    function findCIRHeader(lines) {

        for (
            let index = 0;
            index < lines.length;
            index++
        ) {

            const line =
                lines[index];


            if (
                isCIRHeader(
                    line
                )
            ) {

                return {

                    found:
                        true,

                    index:
                        index,

                    line:
                        line

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

    function isNextSection(line) {

        const value =
            normalizeLine(
                line
            );


        if (!value) {

            return false;

        }


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
       
       PERUBAHAN PENTING:

       Setelah CIR ditemukan, parser tetap membaca
       meskipun ada baris kosong.

       Tidak berhenti hanya karena gap.

       Berhenti jika benar-benar menemukan section lain.
    ===================================================== */

    function getCIRSection(text) {

        const lines =
            normalizeText(
                text
            )
                .split("\n");


        const header =
            findCIRHeader(
                lines
            );


        if (
            !header.found
        ) {

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


        /*
         * Jangan berhenti karena blank line.

         * Blank line tetap dimasukkan.
         */

        for (
            let index =
                header.index + 1;

            index < lines.length;

            index++
        ) {

            const line =
                lines[index];


            /*
             * Section lain.
             *
             * Hanya section yang benar-benar
             * dikenal yang menghentikan parser.
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
             * CIR kedua.
             */

            if (
                index >
                header.index + 1 &&
                isCIRHeader(
                    line
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
       
       COMPATIBILITY FUNCTION

       Fungsi ini tetap tersedia untuk app lama.

       Tetapi sekarang pencarian dilakukan
       secara fleksibel.
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


        if (!lines.length) {

            return null;

        }


        /*
         * Cari baris yang mengandung
         * kata-kata release.

         * Mendukung typo umum:
         *
         * TT Release
         * TT Relase
         * TT Releas
         * TT Releasse
         * TT RELESAE
         * TT RELEASE
         *
         * Tetapi fungsi ini hanya helper.
         *
         * Parser utama tetap mengambil tanggal
         * paling awal setelah CIR.
         */

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
             * Exact setting dahulu.
             */

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


            /*
             * Flexible release matching.

             * Mendeteksi:
             *
             * TT RELEASE
             * TT RELASE
             * TT RELESAE
             * TT RELESE
             * TICKET RELEASE
             * TICKET RELESAE
             */

            if (
                /\bTT\s+R(?:ELEASE|ELASE|ELESAE|ELESE|ELEASSE)\b/i.test(
                    line
                ) ||
                /\bTICKET\s+R(?:ELEASE|ELASE|ELESAE|ELESE|ELEASSE)\b/i.test(
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
                        "Flexible TT Release"

                };

            }

        }


        return null;

    }


    /* =====================================================
       FIND FIRST DATETIME AFTER CIR
       
       INI BAGIAN UTAMA.

       Parser TIDAK PEDULI:

       - baris kosong
       - gap
       - separator
       - typo TT Release
       - tulisan Team
       - tulisan Onsite
       - tulisan RELESAE
       - tulisan Relase

       Yang dicari adalah:

       TANGGAL + JAM PALING AWAL
       setelah tulisan CIR.
    ===================================================== */

    function findFirstDateAfterCIR(
        lines
    ) {

        const max =
            Math.min(
                lines.length,
                MAX_CIR_SEARCH_LINES
            );


        for (
            let index = 0;
            index < max;
            index++
        ) {

            const line =
                lines[index];


            /*
             * Baris kosong tidak masalah.
             */

            if (
                !normalizeLine(
                    line
                )
            ) {

                continue;

            }


            /*
             * Jangan membaca section lain.
             */

            if (
                isNextSection(
                    line
                )
            ) {

                break;

            }


            /*
             * Cari tanggal + jam.

             * Jika ada:
             *
             * 26/08/2026 21.12 TT RELEASE
             *
             * parseDateTime() akan menemukan tanggalnya.
             */

            const date =
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
       FIND RELEASE IN CIR
       
       LOGIKA BARU:

       1. Cari CIR.
       2. Ambil semua baris setelah CIR.
       3. Cari DATETIME PALING AWAL.
       4. Tidak peduli tulisan TT Release.
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


        /*
         * Cari tanggal paling awal
         * setelah CIR.
         */

        const dateResult =
            findFirstDateAfterCIR(
                cirSection.lines
            );


        /*
         * Tidak ada tanggal.

         * Coba cek indikasi NOT FOUND.
         */

        if (!dateResult) {

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


        /*
         * Cari release line untuk informasi tambahan.

         * Tidak wajib berhasil.
         */

        const releaseLine =
            findReleaseLine(
                cirSection.text,
                settings.releasePhrases
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
       
       parse(CIR, TT Number)
    ===================================================== */

    function parseCIR(
        cirText,
        ttNumber
    ) {

        const text =
            normalizeText(
                cirText
            );


        /*
         * TT Number = kolom D.
         */

        const cleanTTNumber =
            normalizeTTNumber(
                ttNumber
            );


        const settings =
            getSettings();


        const result = {

            found:
                false,

            status:
                "NOT FOUND",

            ticket:
                cleanTTNumber,

            ttNumber:
                cleanTTNumber,

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
           TT NUMBER KOSONG
        ================================================= */

        if (!cleanTTNumber) {

            result.status =
                "NO TT NUMBER";

            result.note =
                "CIR tidak diproses karena TT Number pada kolom D kosong.";

            return result;

        }


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
           CARI RELEASE
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
           TANGGAL RELEASE TIDAK ADA
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

                    : "Tidak ditemukan tanggal dan jam setelah tulisan CIR.";


            return result;

        }


        /* =================================================
           DATE RESULT
        ================================================= */

        const dateResult =
            searchResult.dateResult;


        if (!dateResult) {

            result.status =
                "NOT FOUND";

            result.note =
                "Tanggal dan jam Ticket Release tidak dapat dibaca.";

            return result;

        }


        /* =================================================
           RELEASE LINE
        ================================================= */

        if (
            searchResult.releaseLine
        ) {

            result.sourceLine =
                searchResult.releaseLine.line;


            result.matchedPhrase =
                searchResult.releaseLine.phrase;

        } else {

            /*
             * Kalau tulisan TT Release typo,
             * tetap gunakan baris tanggal sebagai source.
             */

            result.sourceLine =
                dateResult.sourceLine;


            result.matchedPhrase =
                "Tanggal pertama setelah CIR";

        }


        /*
         * Index global terhadap report.
         */

        result.sourceIndex =
            cirSection.headerIndex +
            1 +
            dateResult.sourceIndex;


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


        result.note =
            "Tanggal dan jam paling awal setelah section CIR berhasil ditemukan.";


        return result;

    }


    /* =====================================================
       PARSE MULTIPLE CIR
    ===================================================== */

    function parseMultipleCIR(
        rows,
        cirField,
        ttNumberField
    ) {

        if (
            !Array.isArray(rows)
        ) {

            return [];

        }


        return rows.map(
            function (row) {

                let cir = "";

                let ttNumber = "";


                /* =========================================
                   ARRAY ROW
                ========================================= */

                if (
                    Array.isArray(row)
                ) {

                    /*
                     * CIR
                     */

                    if (
                        typeof cirField ===
                        "number"
                    ) {

                        cir =
                            row[
                                cirField
                            ];

                    } else {

                        /*
                         * Jika tidak diberikan,
                         * gunakan kolom AF.
                         */

                        cir =
                            row[
                                DEFAULT_CIR_COLUMN_INDEX
                            ];

                    }


                    /*
                     * TT Number
                     */

                    if (
                        typeof ttNumberField ===
                        "number"
                    ) {

                        ttNumber =
                            row[
                                ttNumberField
                            ];

                    } else {

                        ttNumber =
                            row[
                                DEFAULT_TT_NUMBER_COLUMN_INDEX
                            ];

                    }

                }


                /* =========================================
                   OBJECT ROW
                ========================================= */

                else if (
                    row &&
                    typeof row === "object"
                ) {

                    if (
                        cirField
                    ) {

                        cir =
                            row[
                                cirField
                            ];

                    }


                    ttNumber =
                        ttNumberField
                            ? row[
                                ttNumberField
                            ]
                            : getTTNumberFromRow(
                                row
                            );

                }


                ttNumber =
                    normalizeTTNumber(
                        ttNumber
                    );


                return parseCIR(
                    cir,
                    ttNumber
                );

            }
        );

    }


    /* =====================================================
       PARSE ROW
       
       D  = TT Number
       AF = CIR
    ===================================================== */

    function parseRow(
        row,
        cirColumnIndex
    ) {

        if (
            !Array.isArray(row)
        ) {

            return parseCIR(
                "",
                ""
            );

        }


        const ttNumber =
            normalizeTTNumber(
                row[
                    DEFAULT_TT_NUMBER_COLUMN_INDEX
                ]
            );


        const cirIndex =
            typeof cirColumnIndex ===
            "number"

                ? cirColumnIndex

                : DEFAULT_CIR_COLUMN_INDEX;


        const cir =
            row[
                cirIndex
            ];


        return parseCIR(
            cir,
            ttNumber
        );

    }


    /* =====================================================
       PARSE MULTIPLE SPREADSHEET ROWS
    ===================================================== */

    function parseSpreadsheetRows(
        rows,
        cirColumnIndex
    ) {

        if (
            !Array.isArray(rows)
        ) {

            return [];

        }


        return rows.map(
            function (row) {

                return parseRow(
                    row,
                    cirColumnIndex
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

        parseRow:
            parseRow,

        parseSpreadsheetRows:
            parseSpreadsheetRows,

        getTTNumber:
            getTTNumberFromRow,

        parseDateTime:
            parseDateTime,

        formatDateTime:
            formatDateTime,

        normalizeText:
            normalizeText,

        normalizeTTNumber:
            normalizeTTNumber,

        findCIRHeader:
            findCIRHeader,

        getCIRSection:
            getCIRSection,

        findReleaseLine:
            findReleaseLine,

        findFirstDateAfterCIR:
            findFirstDateAfterCIR,

        isCIRHeader:
            isCIRHeader

    };


})();
