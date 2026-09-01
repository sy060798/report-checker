/* =========================================================
   REPORT CHECKER
   cir-parser.js

   UPDATE FINAL:

   - CIR header fleksibel
   - Case insensitive
   - ===CIR====
   - --- CIR ---
   - CIR
   - CIR :
   - CIR dengan separator apa pun
   - Setelah CIR ditemukan, cari DATETIME PALING AWAL
   - Baris kosong/spasi panjang tidak masalah
   - Tidak bergantung pada tulisan "TT Release"
   - Mendukung format tanggal:
       26/08/2026 21:12
       26/08/2026 21.12
       26//08//2026 21:12
       26-08-2026 21:12
       2026-08-26 21:12
   - Mendukung tanggal + jam dengan teks setelahnya
   - TT Number berasal dari kolom D
   - Support parse(text, ttNumber)
   - Support parseMultiple()
   - Support parseRow()
   - Support parseSpreadsheetRows()
========================================================= */

(function () {

    "use strict";


    /* =====================================================
       CONSTANTS
    ===================================================== */

    const DEFAULT_TIMEZONE =
        "Asia/Jakarta";


    /*
     * Kolom D = TT Number
     *
     * Array index:
     *
     * A = 0
     * B = 1
     * C = 2
     * D = 3
     */

    const DEFAULT_TT_NUMBER_COLUMN_INDEX = 3;


    /*
     * Kolom AF = CIR
     *
     * A  = 0
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

            .replace(
                /\r\n/g,
                "\n"
            )

            .replace(
                /\r/g,
                "\n"
            )

            .replace(
                /\u00A0/g,
                " "
            )

            .trim();

    }


    /* =====================================================
       NORMALIZE LINE
    ===================================================== */

    function normalizeLine(value) {

        return String(value || "")

            .replace(
                /\s+/g,
                " "
            )

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


        /* ================================================
           ARRAY
        ================================================ */

        if (
            Array.isArray(row)
        ) {

            return normalizeTTNumber(
                row[
                    DEFAULT_TT_NUMBER_COLUMN_INDEX
                ]
            );

        }


        /* ================================================
           OBJECT
        ================================================ */

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


        /* ================================================
           CASE INSENSITIVE FIELD
        ================================================ */

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
            typeof
                window.ReportCheckerSettings.get ===
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
       NORMALIZE DATE SEPARATOR
       
       Contoh:

       26//08//2026
       ->
       26/08/2026

       26.08.2026
       ->
       26/08/2026

       Jam:

       21.12
       ->
       21:12
    ===================================================== */

    function normalizeDateString(text) {

        if (!text) {

            return "";

        }


        let value =
            normalizeLine(
                text
            );


        /*
         * Slash ganda.
         */

        value =
            value.replace(
                /\/{2,}/g,
                "/"
            );


        /*
         * Format tanggal dengan titik:
         *
         * 26.08.2026
         *
         * Jangan mengubah jam.
         */

        value =
            value.replace(
                /(\d{1,2})\.(\d{1,2})\.(\d{4})/g,
                "$1/$2/$3"
            );


        /*
         * Format jam:
         *
         * 21.12
         * 21.12.30
         *
         * menjadi:
         *
         * 21:12
         * 21:12:30
         */

        value =
            value.replace(
                /(\d{1,2})\.(\d{2})(?:\.(\d{2}))?(?=\s|$)/g,
                function (
                    match,
                    hour,
                    minute,
                    second
                ) {

                    if (second) {

                        return (
                            hour +
                            ":" +
                            minute +
                            ":" +
                            second
                        );

                    }


                    return (
                        hour +
                        ":" +
                        minute
                    );

                }
            );


        return value;

    }


    /* =====================================================
       DATE PARSING
    ===================================================== */

    function parseDateTime(text) {

        if (!text) {

            return null;

        }


        const value =
            normalizeDateString(
                text
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
         * Validasi tanggal.
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
                    .padStart(
                        2,
                        "0"
                    );


        return [

            pad(
                date.getDate()
            ),

            pad(
                date.getMonth() + 1
            ),

            date.getFullYear()

        ].join("/") +

        " " +

        [

            pad(
                date.getHours()
            ),

            pad(
                date.getMinutes()
            ),

            pad(
                date.getSeconds()
            )

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
            const phrase of
                phrases || []
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
       
       Contoh yang diterima:

       CIR
       CIR:
       CIR :
       ===CIR====
       === CIR ===
       ---CIR---
       *** CIR ***
       ### CIR ###
       [CIR]
       CIR INFORMATION
       CIR DATA
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
             * Bersihkan separator.
             */

            const cleaned =
                line

                    .replace(
                        /^[=\-_*#:\[\](){}\s]+/,
                        ""
                    )

                    .replace(
                        /[=\-_*#:\[\](){}\s]+$/,
                        ""
                    )

                    .trim();


            /*
             * CIR persis.
             */

            if (
                /^CIR$/i.test(
                    cleaned
                )
            ) {

                return {

                    found: true,

                    index: index,

                    line: originalLine

                };

            }


            /*
             * CIR diikuti keterangan.
             *
             * Contoh:
             *
             * CIR DATA
             * CIR INFORMATION
             * CIR DETAIL
             */

            if (
                /^CIR\b/i.test(
                    cleaned
                )
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
       
       Tetap disediakan untuk kompatibilitas
       dengan sistem lama.
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


            /*
             * Section berikutnya.
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

            const normalized =
                normalizeLine(
                    line
                );


            const cleaned =
                normalized

                    .replace(
                        /^[=\-_*#:\[\](){}\s]+/,
                        ""
                    )

                    .replace(
                        /[=\-_*#:\[\](){}\s]+$/,
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

            found: true,

            headerIndex:
                header.index,

            endIndex:
                endIndex,

            lines:
                cirLines,

            text:
                cirLines.join(
                    "\n"
                )

        };

    }


    /* =====================================================
       FIND RELEASE LINE
       
       Fungsi lama tetap tersedia.
       
       Tetapi parser utama TIDAK lagi bergantung
       pada fungsi ini.
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
       FIND FIRST DATETIME AFTER CIR
       
       INI ADALAH LOGIKA UTAMA BARU.
       
       Contoh:

       ===CIR====


       26/08/2026 21.12 TT RELEASE

       27/08/2026 00.11 Team perjalanan

       27/08/2026 00.55 Team onsite


       Yang diambil:

       26/08/2026 21:12:00
    ===================================================== */

    function findFirstDateAfterCIR(text) {

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

                found: false,

                date: null,

                sourceLine: "",

                sourceIndex: -1

            };

        }


        /*
         * Mulai tepat di bawah CIR.
         */

        for (
            let index =
                header.index + 1;

            index < lines.length;

            index++
        ) {

            const originalLine =
                lines[index];


            /*
             * Jangan hilangkan isi.
             * Hanya untuk pengecekan.
             */

            const line =
                normalizeLine(
                    originalLine
                );


            /*
             * Baris kosong dilewati.
             */

            if (!line) {

                continue;

            }


            /*
             * Normalisasi format tanggal/jam.
             */

            const normalizedDateLine =
                normalizeDateString(
                    line
                );


            /*
             * Coba parse tanggal.
             */

            const date =
                parseDateTime(
                    normalizedDateLine
                );


            if (date) {

                return {

                    found: true,

                    date: date,

                    sourceLine:
                        originalLine,

                    sourceIndex:
                        index

                };

            }

        }


        return {

            found: false,

            date: null,

            sourceLine: "",

            sourceIndex: -1

        };

    }


    /* =====================================================
       FIND TT RELEASE IN CIR
       
       Sekarang:
       
       TT Release =
       DATETIME PALING AWAL SETELAH CIR
    ===================================================== */

    function findReleaseInCIR(
        text,
        settings
    ) {

        const cirSection =
            getCIRSection(
                text
            );


        /*
         * CIR tidak ditemukan.
         */

        if (
            !cirSection.found
        ) {

            return {

                cirFound: false,

                releaseFound: false,

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
                text
            );


        /*
         * Tidak ada tanggal.
         */

        if (
            !dateResult.found
        ) {

            return {

                cirFound: true,

                releaseFound: false,

                cirSection:
                    cirSection,

                releaseLine:
                    null,

                dateResult:
                    null

            };

        }


        /*
         * Jadikan baris tanggal sebagai
         * release line.
         */

        const releaseLine = {

            line:
                dateResult.sourceLine,

            normalizedLine:
                normalizeLine(
                    dateResult.sourceLine
                ),

            index:
                dateResult.sourceIndex,

            phrase:
                "CIR"

        };


        return {

            cirFound: true,

            releaseFound: true,

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
       
       Pemakaian:

       ReportCheckerCIR.parse(
           cirText,
           ttNumber
       );
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
         * TT Number wajib.
         */

        const cleanTTNumber =
            normalizeTTNumber(
                ttNumber
            );


        const settings =
            getSettings();


        const result = {

            found: false,

            status:
                "NOT FOUND",

            /*
             * Ticket = TT Number
             */

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
           RELEASE TIDAK DITEMUKAN
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

                    : "Tanggal dan jam tidak ditemukan setelah tulisan CIR.";


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
         * Source index global.
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
                "Tanggal dan jam setelah CIR tidak dapat dibaca.";

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


        result.sourceLine =
            dateResult.sourceLine;


        /*
         * Catatan hasil.
         */

        result.note =
            "Tanggal dan jam paling awal setelah CIR berhasil ditemukan.";


        return result;

    }


    /* =====================================================
       PARSE MULTIPLE CIR
       
       Support:

       {
           CIR: "...",
           "TT Number": "TT12345"
       }

       atau:

       {
           cir: "...",
           ttNumber: "TT12345"
       }
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
                     * CIR berdasarkan index.
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
                         * Fallback:
                         * field terakhir.
                         */

                        cir =
                            row[
                                row.length - 1
                            ];

                    }


                    /*
                     * TT Number.
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


                /*
                 * Normalisasi.
                 */

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
       
       Spreadsheet:

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


        /*
         * TT Number = kolom D.
         */

        const ttNumber =
            normalizeTTNumber(
                row[
                    DEFAULT_TT_NUMBER_COLUMN_INDEX
                ]
            );


        /*
         * CIR default = AF.
         */

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

        /*
         * Main parser.
         *
         * parse(
         *     CIR,
         *     TT Number
         * )
         */

        parse:
            parseCIR,


        /*
         * Parse banyak data.
         */

        parseMultiple:
            parseMultipleCIR,


        /*
         * Parse satu row spreadsheet.
         */

        parseRow:
            parseRow,


        /*
         * Parse banyak row spreadsheet.
         */

        parseSpreadsheetRows:
            parseSpreadsheetRows,


        /*
         * Ambil TT Number.
         */

        getTTNumber:
            getTTNumberFromRow,


        /*
         * Date parser.
         */

        parseDateTime:
            parseDateTime,


        /*
         * Format date.
         */

        formatDateTime:
            formatDateTime,


        /*
         * Normalize.
         */

        normalizeText:
            normalizeText,


        normalizeTTNumber:
            normalizeTTNumber,


        /*
         * CIR helpers.
         */

        findCIRHeader:
            findCIRHeader,


        getCIRSection:
            getCIRSection,


        findReleaseLine:
            findReleaseLine,


        /*
         * Fungsi baru:
         * mencari datetime pertama
         * setelah CIR.
         */

        findFirstDateAfterCIR:
            findFirstDateAfterCIR,


        /*
         * Fungsi utama pencarian release.
         */

        findReleaseInCIR:
            findReleaseInCIR

    };


})();
