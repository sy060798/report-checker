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
   - TICKET menggunakan TT NUMBER
   - TT Number berasal dari KOLOM D
   - Support parse(text, ttNumber)
   - Support parseMultiple(rows, cirField, ttNumberField)
========================================================= */

(function () {

    "use strict";


    /* =====================================================
       CONSTANTS
    ===================================================== */

    const DEFAULT_TIMEZONE = "Asia/Jakarta";

    /*
     * Kolom D = TT Number
     *
     * Jika data berupa array:
     * index 3 = kolom D
     *
     * Jika data berupa object:
     * gunakan nama field TT Number / TTNumber / ttNumber.
     */
    const DEFAULT_TT_NUMBER_COLUMN_INDEX = 3;


    /*
     * Maksimal jarak tanggal dari baris TT Release.
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
       GET TT NUMBER DARI ROW
       
       Prioritas:
       1. Field ttNumber
       2. Field TT Number
       3. Field TTNumber
       4. Field TT NUMBER
       5. Array index 3 = kolom D
    ===================================================== */

    function getTTNumberFromRow(
        row
    ) {

        if (
            row === null ||
            row === undefined
        ) {

            return "";

        }


        /*
         * Jika row berupa array.
         *
         * Kolom D = index 3.
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
         * Jika row berupa object.
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
         * Fallback berdasarkan key
         * secara case-insensitive.
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
             * CIR normal.
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
             * CIR dengan separator.
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
             * Section lain.
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
             * CIR header kedua.
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
       
       Hanya pada CIR section.
       
       TT Onsite tidak dianggap TT Release.
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
       SEARCH DATE AROUND RELEASE LINE
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
       FIND TT RELEASE IN CIR
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
       
       ticket sekarang = TT Number
       
       Pemakaian:
       
       parse(cirText, ttNumber)
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
         * TT Number wajib digunakan.
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

            /*
             * Ticket = TT Number.
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
       
       Support object:

       {
           CIR: "...",
           "TT Number": "TT12345"
       }

       atau:

       {
           cir: "...",
           ttNumber: "TT12345"
       }

       atau array:

       [
           ...,
           ...,
           CIR,
           TT Number
       ]

       Dengan TT Number = kolom D / index 3.
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
                     * Jika cirField adalah angka,
                     * langsung ambil berdasarkan index.
                     */

                    if (
                        typeof cirField ===
                        "number"
                    ) {

                        cir =
                            row[cirField];

                    } else {

                        /*
                         * Default CIR:
                         *
                         * Cari field index terakhir
                         * jika diberikan.
                         */

                        cir =
                            row[
                                row.length - 1
                            ];

                    }


                    /*
                     * TT Number selalu kolom D
                     * jika tidak diberikan field khusus.
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
                            row[cirField];

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
                 * Normalisasi TT Number.
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
       
       Helper khusus spreadsheet.
       
       Kolom D = TT Number.
       
       Parameter:
       
       row[3] = TT Number
       row[31] = CIR
       
       Berdasarkan header user:
       
       A = Datetime Receive
       B = Customer Ticket
       C = Ref Ticket
       D = TT Number
       ...
       AF = CIR
       
       Jadi:
       TT Number = index 3
       CIR       = index 31
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


        /*
         * CIR default = kolom AF
         * berdasarkan struktur yang diberikan.
         *
         * Tetapi bisa diubah dengan parameter.
         */

        const cirIndex =
            typeof cirColumnIndex ===
            "number"

                ? cirColumnIndex

                : 31;


        const cir =
            row[cirIndex];


        return parseCIR(
            cir,
            ttNumber
        );

    }


    /* =====================================================
       PARSE MULTIPLE SPREADSHEET ROWS
       
       Khusus format:
       
       D = TT Number
       AF = CIR
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
         * parse(CIR, TT Number)
         */
        parse:
            parseCIR,


        /*
         * Parse banyak row.
         */
        parseMultiple:
            parseMultipleCIR,


        /*
         * Khusus spreadsheet.
         *
         * D = TT Number
         * AF = CIR
         */
        parseRow:
            parseRow,


        parseSpreadsheetRows:
            parseSpreadsheetRows,


        /*
         * Ambil TT Number dari object row.
         */
        getTTNumber:
            getTTNumberFromRow,


        /*
         * Date parser.
         */
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
            findReleaseLine

    };


       /* =====================================================
       PAGINATION
       
       Default:
       10 data per halaman.
       
       Pagination hanya mengatur tampilan.
       Data asli tetap lengkap.
    ===================================================== */

    const PAGINATION_DEFAULT_LIMIT = 10;


    function paginate(
        data,
        page,
        perPage
    ) {

        if (
            !Array.isArray(data)
        ) {

            return {

                data: [],

                page: 1,

                perPage:
                    PAGINATION_DEFAULT_LIMIT,

                totalData: 0,

                totalPages: 0,

                start: 0,

                end: 0

            };

        }


        const limit =
            Number(perPage) > 0

                ? Number(perPage)

                : PAGINATION_DEFAULT_LIMIT;


        const totalData =
            data.length;


        const totalPages =
            Math.ceil(
                totalData /
                limit
            );


        let currentPage =
            Number(page) || 1;


        if (
            currentPage < 1
        ) {

            currentPage = 1;

        }


        if (
            totalPages > 0 &&
            currentPage > totalPages
        ) {

            currentPage =
                totalPages;

        }


        const start =
            (
                currentPage - 1
            ) *
            limit;


        const end =
            Math.min(
                start + limit,
                totalData
            );


        return {

            /*
             * Data yang ditampilkan
             * pada halaman aktif.
             */
            data:
                data.slice(
                    start,
                    end
                ),

            /*
             * Halaman aktif.
             */
            page:
                currentPage,

            /*
             * Jumlah data per halaman.
             */
            perPage:
                limit,

            /*
             * Total semua data.
             */
            totalData:
                totalData,

            /*
             * Total halaman.
             */
            totalPages:
                totalPages,

            /*
             * Index awal.
             */
            start:
                totalData > 0
                    ? start + 1
                    : 0,

            /*
             * Index akhir.
             */
            end:
                end

        };

    }


    /* =====================================================
       PAGINATION HELPER
       
       Contoh:
       
       const result =
           ReportCheckerCIR.paginate(
               data,
               1,
               10
           );
       
       result.data
       = data halaman 1
       
       result.totalPages
       = jumlah halaman
    ===================================================== */


    function getPaginationPages(
        currentPage,
        totalPages
    ) {

        const pages = [];


        if (
            totalPages <= 0
        ) {

            return pages;

        }


        /*
         * Jika halaman sedikit,
         * tampilkan semuanya.
         */
        if (
            totalPages <= 7
        ) {

            for (
                let i = 1;
                i <= totalPages;
                i++
            ) {

                pages.push(i);

            }

            return pages;

        }


        /*
         * Selalu tampilkan halaman 1.
         */
        pages.push(1);


        /*
         * Ellipsis.
         */
        if (
            currentPage > 4
        ) {

            pages.push("...");

        }


        const start =
            Math.max(
                2,
                currentPage - 1
            );


        const end =
            Math.min(
                totalPages - 1,
                currentPage + 1
            );


        for (
            let i = start;
            i <= end;
            i++
        ) {

            if (
                !pages.includes(i)
            ) {

                pages.push(i);

            }

        }


        /*
         * Ellipsis sebelum halaman terakhir.
         */
        if (
            currentPage <
            totalPages - 3
        ) {

            pages.push("...");

        }


        /*
         * Halaman terakhir.
         */
        if (
            !pages.includes(
                totalPages
            )
        ) {

            pages.push(
                totalPages
            );

        }


        return pages;

    }


    /* =====================================================
       PUBLIC PAGINATION API
    ===================================================== */

    window.ReportCheckerCIR.paginate =
        paginate;


    window.ReportCheckerCIR
        .getPaginationPages =
        getPaginationPages;


})();
