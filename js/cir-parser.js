/* =========================================================
   REPORT CHECKER
   cir-parser.js

   RULE BARU:

   1. Cari tulisan CIR dalam bentuk apa pun.
      Contoh:
      ===CIR====
      ===== CIR =====
      CIR
      -----CIR-----
      === CIR ===

   2. TT Release TIDAK harus mengandung tulisan
      "TT Release".

   3. Setelah menemukan CIR, abaikan semua baris kosong /
      spasi / separator.

   4. Cari TANGGAL + JAM PERTAMA yang muncul SETELAH CIR.

   5. Tanggal boleh menggunakan berbagai format:
      26/08/2026 21.12
      26/08/2026 21:12
      26-08-2026 21.12
      2026-08-26 21:12
      26//08//2026 21.12
      dll.

   6. Tanggal pada baris CIR sendiri TIDAK dihitung.

   7. TT Number tetap berasal dari kolom D / index 3.

   8. Ticket = TT Number.
========================================================= */

(function () {

    "use strict";


    /* =====================================================
       CONSTANT
    ===================================================== */

    const DEFAULT_TT_NUMBER_COLUMN_INDEX = 3;

    /*
     * Default CIR = kolom AF
     * A = 0
     * B = 1
     * C = 2
     * D = 3
     * ...
     * AF = 31
     */
    const DEFAULT_CIR_COLUMN_INDEX = 31;


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
            .replace(/\u00A0/g, " ");

    }


    /* =====================================================
       NORMALIZE LINE
    ===================================================== */

    function normalizeLine(value) {

        return String(value || "")
            .replace(/\u00A0/g, " ")
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
         * Kolom D = index 3
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
         * Fallback case-insensitive.
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

            return window.ReportCheckerSettings.get();

        }


        return {

            releasePhrases: [

                "TT Release",
                "TT release",
                "TT RELEASE",
                "TT Relase",
                "TT RELESAE",
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
                "N/A"

            ]

        };

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
             * Jangan menganggap "-"
             * sebagai NOT FOUND karena terlalu umum.
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

       Sangat fleksibel.

       Yang penting ada kata "CIR" sebagai bagian
       dari baris section.

       Contoh diterima:

       CIR
       ===CIR====
       =====CIR=====
       === CIR ===
       ---CIR---
       **** CIR ****
       [CIR]

       Tidak mengambil tanggal yang berada di baris
       sebelum CIR.
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
             * Hilangkan separator umum di kiri dan kanan.
             */

            const cleaned =
                line
                    .replace(
                        /^[=\-_*#:\s[\]{}()<>|]+/g,
                        ""
                    )
                    .replace(
                        /[=\-_*#:\s[\]{}()<>|]+$/g,
                        ""
                    )
                    .trim();


            /*
             * Harus berupa "CIR" atau diawali CIR
             * sebagai nama section.
             *
             * Contoh:
             *
             * CIR
             * CIR :
             * CIR =====
             * CIR DATA
             *
             * Tetapi tidak menganggap kata seperti
             * "DESCRIPTION" sebagai CIR.
             */

            if (
                /^CIR(?:\s|:|$)/i.test(
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
             * Untuk kasus:
             *
             * XXXXXCIRXXXXX
             *
             * atau separator aneh yang masih
             * jelas mengandung CIR.
             *
             * Tetapi hindari kata yang hanya
             * mengandung huruf cir.
             */

            if (
                /(?:^|[^a-z])CIR(?:[^a-z]|$)/i.test(
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
       IS EMPTY / SEPARATOR LINE
    ===================================================== */

    function isIgnorableLine(line) {

        const value =
            String(line || "")
                .trim();


        if (!value) {

            return true;

        }


        /*
         * Baris yang hanya separator.
         */

        if (
            /^[=\-_*#:.\s|]+$/.test(
                value
            )
        ) {

            return true;

        }


        return false;

    }


    /* =====================================================
       PARSE DATE TIME

       Mendukung:

       DD/MM/YYYY HH:mm
       DD/MM/YYYY HH.mm

       DD//MM//YYYY HH:mm
       DD//MM//YYYY HH.mm

       DD-MM-YYYY HH:mm
       DD-MM-YYYY HH.mm

       DD.MM.YYYY HH:mm
       DD.MM.YYYY HH.mm

       YYYY-MM-DD HH:mm
       YYYY-MM-DD HH.mm

       YYYY/MM/DD HH:mm
       YYYY/MM/DD HH.mm

       Juga dengan detik.

       Contoh:
       26/08/2026 21.12
       26/08/2026 21:12
       2026-08-26 21:12:49
    ===================================================== */

    function parseDateTime(text) {

        if (!text) {

            return null;

        }


        let value =
            normalizeLine(
                text
            );


        /*
         * Slash ganda menjadi slash tunggal.
         */

        value =
            value.replace(
                /\/{2,}/g,
                "/"
            );


        /*
         * Cari tanggal + jam.

         * Prioritas format YYYY-MM-DD
         * agar tidak tertukar.
         */

        let match;


        /* =================================================
           YYYY-MM-DD HH:mm
        ================================================== */

        match =
            value.match(
                /(\d{4})\s*[-/.]\s*(\d{1,2})\s*[-/.]\s*(\d{1,2})\s+(\d{1,2})\s*[:.]\s*(\d{2})(?:\s*[:.]\s*(\d{2}))?/i
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
           DD-MM-YYYY / DD/MM/YYYY / DD.MM.YYYY HH:mm
        ================================================== */

        match =
            value.match(
                /(\d{1,2})\s*[-/.]\s*(\d{1,2})\s*[-/.]\s*(\d{4})\s+(\d{1,2})\s*[:.]\s*(\d{2})(?:\s*[:.]\s*(\d{2}))?/i
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


        /*
         * Format tanpa jam tidak digunakan
         * sebagai TT Release karena yang dicari
         * wajib tanggal + jam.
         */

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
            year > 2200 ||
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
            date.getDate() !== day ||
            date.getHours() !== hour ||
            date.getMinutes() !== minute ||
            date.getSeconds() !== second
        ) {

            return null;

        }


        return date;

    }


    /* =====================================================
       FORMAT DATE TIME
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


        return (

            pad(date.getDate()) +
            "/" +
            pad(date.getMonth() + 1) +
            "/" +
            date.getFullYear() +
            " " +
            pad(date.getHours()) +
            ":" +
            pad(date.getMinutes()) +
            ":" +
            pad(date.getSeconds())

        );

    }


    /* =====================================================
       FIND FIRST DATE AFTER CIR

       INI BAGIAN PALING PENTING.

       Parser TIDAK LAGI MENCARI "TT RELEASE".

       Setelah CIR ditemukan:

       CIR
       |
       |-- baris kosong
       |-- baris kosong
       |-- separator
       |-- tanggal pertama  <-- INI YANG DIAMBIL
       |
       |-- tanggal berikutnya
       |-- dst

       Jadi:
       
       ===CIR====

       19/08/2026 09:39 TT Relase

       hasil:
       19/08/2026 09:39:00


       Dan:

       ===CIR====


       21/08/2026 15.59 TT RELESAE

       hasil:
       21/08/2026 15:59:00
    ===================================================== */

    function findFirstDateAfterCIR(
        lines,
        cirIndex
    ) {

        /*
         * Mulai SATU BARIS SETELAH CIR.
         *
         * Sangat penting agar tanggal yang ada
         * pada baris CIR sendiri tidak ikut.
         */

        for (
            let index =
                cirIndex + 1;

            index < lines.length;

            index++
        ) {

            const line =
                lines[index];


            /*
             * Baris kosong / separator dilewati.
             */

            if (
                isIgnorableLine(
                    line
                )
            ) {

                continue;

            }


            /*
             * Cari tanggal + jam pada baris ini.
             */

            const date =
                parseDateTime(
                    line
                );


            if (date) {

                return {

                    found:
                        true,

                    date:
                        date,

                    sourceLine:
                        line,

                    sourceIndex:
                        index

                };

            }

        }


        return {

            found:
                false,

            date:
                null,

            sourceLine:
                "",

            sourceIndex:
                -1

        };

    }


    /* =====================================================
       FIND RELEASE IN CIR

       Nama fungsi lama tetap dipertahankan supaya
       app.js lama tidak rusak.

       Sekarang definisinya:

       RELEASE = tanggal + jam PERTAMA setelah CIR.
    ===================================================== */

    function findReleaseInCIR(
        text,
        settings
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


        if (
            !header.found
        ) {

            return {

                cirFound:
                    false,

                releaseFound:
                    false,

                cirSection:
                    null,

                releaseLine:
                    null,

                dateResult:
                    null

            };

        }


        /*
         * Cari tanggal pertama setelah CIR.
         */

        const dateResult =
            findFirstDateAfterCIR(
                lines,
                header.index
            );


        /*
         * Ambil seluruh bagian setelah CIR
         * untuk keperluan pengecekan NOT FOUND.
         */

        const afterCIRLines =
            lines.slice(
                header.index + 1
            );


        const afterCIRText =
            afterCIRLines.join(
                "\n"
            );


        /*
         * Tetap buat object cirSection
         * supaya kompatibel dengan kode lama.
         */

        const cirSection = {

            found:
                true,

            headerIndex:
                header.index,

            endIndex:
                lines.length,

            lines:
                afterCIRLines,

            text:
                afterCIRText

        };


        if (
            !dateResult.found
        ) {

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
         * Release line sekarang adalah baris
         * tempat tanggal pertama ditemukan.
         */

        const releaseLine = {

            line:
                dateResult.sourceLine,

            normalizedLine:
                normalizeLine(
                    dateResult.sourceLine
                ),

            index:
                dateResult.sourceIndex -
                (header.index + 1),

            phrase:
                ""

        };


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
        ================================================== */

        if (!cleanTTNumber) {

            result.status =
                "NO TT NUMBER";

            result.note =
                "CIR tidak diproses karena TT Number pada kolom D kosong.";

            return result;

        }


        /* =================================================
           CIR KOSONG
        ================================================== */

        if (!text) {

            result.status =
                "NOT FOUND";

            result.note =
                "Kolom CIR kosong.";

            return result;

        }


        /* =================================================
           CARI CIR + TANGGAL PERTAMA
        ================================================== */

        const searchResult =
            findReleaseInCIR(
                text,
                settings
            );


        /* =================================================
           CIR TIDAK ADA
        ================================================== */

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
           TANGGAL TIDAK ADA
        ================================================== */

        if (
            !searchResult.releaseFound ||
            !searchResult.dateResult
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

                    ? "Section CIR ditemukan tetapi belum ada tanggal/jam release."

                    : "Section CIR ditemukan tetapi tanggal/jam tidak ditemukan setelah CIR.";


            return result;

        }


        /* =================================================
           RELEASE LINE
        ================================================== */

        const releaseLine =
            searchResult.releaseLine;


        result.sourceLine =
            releaseLine.line;


        result.sourceIndex =
            searchResult.dateResult.sourceIndex;


        /*
         * Tidak lagi bergantung pada tulisan
         * TT RELEASE.
         *
         * Karena tanggal pertama setelah CIR
         * dianggap sebagai TT Release.
         */

        result.matchedPhrase =
            "FIRST DATE AFTER CIR";


        /* =================================================
           DATE
        ================================================== */

        result.found =
            true;

        result.status =
            "FOUND";


        result.releaseDate =
            searchResult.dateResult.date;


        result.releaseDateText =
            formatDateTime(
                searchResult.dateResult.date
            );


        result.note =
            "TT Release diambil dari tanggal dan jam pertama yang ditemukan setelah tulisan CIR.";


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
                   ARRAY
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
                         * gunakan kolom terakhir.
                         */

                        cir =
                            row[
                                row.length - 1
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
                   OBJECT
                ========================================= */

                else if (
                    row &&
                    typeof row === "object"
                ) {

                    if (
                        cirField !==
                        undefined &&
                        cirField !==
                        null
                    ) {

                        cir =
                            row[
                                cirField
                            ];

                    }


                    if (
                        ttNumberField !==
                        undefined &&
                        ttNumberField !==
                        null
                    ) {

                        ttNumber =
                            row[
                                ttNumberField
                            ];

                    } else {

                        ttNumber =
                            getTTNumberFromRow(
                                row
                            );

                    }

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
       PARSE SPREADSHEET ROWS
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

        findReleaseInCIR:
            findReleaseInCIR,

        findFirstDateAfterCIR:
            findFirstDateAfterCIR

    };


})();
