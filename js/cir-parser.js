/* =========================================================
   REPORT CHECKER
   cir-parser.js

   RULE FINAL:

   1. Cari tulisan CIR dalam bentuk apa pun:
      ===CIR====
      ===== CIR =====
      CIR
      -----CIR-----
      === CIR ===

   2. TT Release TIDAK membutuhkan tulisan
      "TT Release".

   3. Setelah menemukan CIR:
      - Abaikan baris kosong
      - Abaikan spasi
      - Abaikan separator
      - Abaikan margin kosong sebanyak apa pun

   4. Cari TANGGAL + JAM PERTAMA yang muncul
      setelah CIR.

   5. Begitu tanggal + jam pertama ditemukan:
      - langsung digunakan sebagai TT Release
      - pencarian LANGSUNG BERHENTI
      - tanggal kedua dan seterusnya DIABAIKAN

   6. Tanggal pada baris CIR sendiri TIDAK dihitung.

   7. Format tanggal yang didukung:
      26/08/2026 21.12
      26/08/2026 21:12
      26-08-2026 21.12
      26-08-2026 21:12
      26.08.2026 21.12
      2026-08-26 21:12
      2026/08/26 21:12
      26//08//2026 21.12
      dll.

   8. TT Number tetap berasal dari kolom D / index 3.

   9. Ticket = TT Number.

   10. TIDAK mencari tanggal berdasarkan kata
       "TT Release".

   11. Tanggal pertama setelah CIR adalah PRIORITAS
       MUTLAK.
========================================================= */

(function () {

    "use strict";


    /* =====================================================
       CONSTANT
    ===================================================== */

    const DEFAULT_TT_NUMBER_COLUMN_INDEX = 3;

    /*
     * AF = index 31
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


        /* =================================================
           ARRAY
        ================================================= */

        if (
            Array.isArray(row)
        ) {

            return normalizeTTNumber(
                row[
                    DEFAULT_TT_NUMBER_COLUMN_INDEX
                ]
            );

        }


        /* =================================================
           OBJECT
        ================================================= */

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


        /* =================================================
           FALLBACK CASE-INSENSITIVE
        ================================================= */

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
             * sebagai NOT FOUND.
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

       Contoh:

       CIR
       ===CIR====
       =====CIR=====
       === CIR ===
       ---CIR---
       **** CIR ****
       [CIR]

       Yang dicari adalah kata CIR sebagai token,
       bukan bagian dari kata lain.

       Contoh yang TIDAK dianggap CIR:

       CIRCLE
       DESCRIPTION
       CIRCUIT
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
             * Hilangkan separator di kiri dan kanan.
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
             * CIR sebagai awal nama section.
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
             * CIR sebagai token.
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

       Baris berikut dianggap tidak berisi data:

       ""
       "   "
       "======"
       "------"
       "******"
       "_____"
       "::::::"
       "......"
       "||||||"
    ===================================================== */

    function isIgnorableLine(line) {

        const value =
            String(line || "")
                .trim();


        /*
         * Kosong.
         */

        if (!value) {

            return true;

        }


        /*
         * Hanya separator.
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

       HANYA tanggal + jam yang dianggap valid.

       Didukung:

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

       Dengan optional detik.

       Contoh:

       30/08/2026 15:08
       30/08/2026 15.08
       30-08-2026 15:08
       2026-08-30 15:08
       30//08//2026 15.08

       Tanggal TANPA jam tidak diterima.
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
         * Slash ganda / triple slash
         * dinormalisasi.
         *
         * Contoh:
         * 30//08//2026
         *
         * menjadi:
         * 30/08/2026
         */

        value =
            value.replace(
                /\/{2,}/g,
                "/"
            );


        let match;


        /* =================================================
           FORMAT:

           YYYY-MM-DD HH:mm
           YYYY/MM/DD HH:mm
           YYYY.MM.DD HH:mm

           Optional seconds.
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
           FORMAT:

           DD-MM-YYYY HH:mm
           DD/MM/YYYY HH:mm
           DD.MM.YYYY HH:mm

           Optional seconds.
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
         * Tanggal tanpa jam sengaja tidak diterima.
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
         * Pastikan tanggal benar-benar valid.

         * Contoh:
         * 31/02/2026
         *
         * tidak boleh berubah menjadi
         * 03/03/2026.
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

       ====================================================

       ATURAN MUTLAK:

       CIR
       ↓
       kosong
       ↓
       kosong
       ↓
       separator
       ↓
       separator
       ↓
       TANGGAL + JAM PERTAMA
       ↓
       STOP

       Tanggal kedua TIDAK AKAN DIPERIKSA LAGI.

       Contoh:

       =====CIR=====


       ----------------


       30/08/2026 15:08 TT Release

       30/08/2026 15:38 Team...

       30/08/2026 16:08 Team...

       HASIL:

       30/08/2026 15:08
    ===================================================== */

    function findFirstDateAfterCIR(
        lines,
        cirIndex
    ) {

        /*
         * PENTING:
         *
         * Mulai dari cirIndex + 1.
         *
         * Jadi tanggal yang berada pada
         * baris CIR sendiri TIDAK MUNGKIN
         * ikut terbaca.
         */

        for (
            let index = cirIndex + 1;
            index < lines.length;
            index++
        ) {

            const rawLine =
                lines[index];


            /*
             * Lewati SEMUA baris kosong
             * dan separator.
             */

            if (
                isIgnorableLine(
                    rawLine
                )
            ) {

                continue;

            }


            /*
             * Cari tanggal + jam
             * pada baris ini.
             *
             * parseDateTime() hanya mengembalikan
             * tanggal kalau ada tanggal + jam valid.
             */

            const date =
                parseDateTime(
                    rawLine
                );


            /*
             * =================================================
             * LOCK POINT
             * =================================================
             *
             * Begitu menemukan tanggal + jam PERTAMA:
             *
             * 1. Simpan
             * 2. Return
             * 3. STOP
             *
             * Tidak pernah lanjut ke tanggal berikutnya.
             */

            if (date) {

                return {

                    found:
                        true,

                    date:
                        date,

                    sourceLine:
                        rawLine,

                    sourceIndex:
                        index

                };

            }

        }


        /*
         * Tidak ada tanggal + jam
         * setelah CIR.
         */

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

       Kompatibilitas dengan kode lama.

       Definisi RELEASE:

       = tanggal + jam PERTAMA
         setelah CIR.

       Tidak membutuhkan:
       "TT Release"
       "TT Relase"
       "Ticket Release"
       dll.
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


        /*
         * CIR tidak ditemukan.
         */

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
         * =================================================
         * CARI TANGGAL PERTAMA
         * =================================================
         */

        const dateResult =
            findFirstDateAfterCIR(
                lines,
                header.index
            );


        /*
         * Ambil semua isi setelah CIR
         * hanya untuk pengecekan NOT FOUND.
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
         * Compatibility object.
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


        /*
         * Tidak ditemukan tanggal + jam.
         */

        if (
            !dateResult.found
        ) {

            const notFound =
                containsNotFoundPhrase(
                    cirSection.text,
                    settings.notFoundPhrases
                );


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
         * =================================================
         * RELEASE LINE
         * =================================================
         *
         * Ini adalah BARIS PERTAMA yang memiliki
         * tanggal + jam setelah CIR.
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
           CARI CIR
        ================================================= */

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
        ================================================= */

        const releaseLine =
            searchResult.releaseLine;


        result.sourceLine =
            releaseLine.line;


        result.sourceIndex =
            searchResult.dateResult.sourceIndex;


        /*
         * Tidak bergantung pada:
         *
         * TT Release
         * TT Relase
         * TT RELESAE
         *
         * dll.
         *
         * Yang menentukan adalah:
         *
         * FIRST DATE + TIME AFTER CIR
         */

        result.matchedPhrase =
            "FIRST DATE AFTER CIR";


        /* =================================================
           RELEASE DATE
        ================================================= */

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
            "TT Release dikunci ke tanggal + jam pertama yang ditemukan setelah CIR. Setelah tanggal pertama ditemukan, pencarian dihentikan.";

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
