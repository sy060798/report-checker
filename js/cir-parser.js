/* =========================================================
   REPORT CHECKER
   cir-parser.js

   UPDATE:
   - CIR header fleksibel
   - ===CIR=== / =====CIR===== / --- CIR --- / CIR :
   - Setelah CIR, gap/baris kosong tidak menjadi masalah
   - Mencari tanggal + jam paling awal SETELAH CIR
   - TT Release diprioritaskan jika ditemukan
   - Typo "TT Relase" tetap bisa diproses berdasarkan tanggal
   - Tidak mencari tanggal sebelum CIR
   - TT Onsite tidak dipilih jika ada tanggal release lebih awal
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
     * Array index:
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


    /*
     * Maksimal jumlah baris yang diperiksa
     * setelah CIR.
     *
     * null = sampai section berikutnya.
     *
     * Kita gunakan tanpa batas praktis sampai
     * section berikutnya agar gap panjang tetap aman.
     */
    const RELEASE_SEARCH_MAX_DISTANCE = null;


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
       GET TT NUMBER DARI ROW
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
         * ARRAY
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
         * OBJECT
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

            const settings =
                window.ReportCheckerSettings.get();


            return settings || {};

        }


        return {

            releasePhrases: [

                "TT Release",

                "TT release",

                "TT RELEASE",

                "Ticket Release",

                "Ticket release",

                "TICKET RELEASE",

                /*
                 * Support typo umum.
                 */

                "TT Relase",

                "TT relase",

                "TT RELASE",

                "Ticket Relase",

                "Ticket relase",

                "TICKET RELASE"

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
       DATE PARSING
       
       Support:

       21/08/2026 19:07
       21//08/2026 19:07

       18/08/2026 19:35
       18-08-2026 19:35

       2026-08-18 19:35

       18/08/2026
       2026-08-18

       19.08/2026 09.39
       19/08/2026 09.39
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
         * 26//08//2026
         * menjadi
         * 26/08/2026
         */

        value =
            value.replace(
                /\/{2,}/g,
                "/"
            );


        /*
         * Normalisasi titik pada JAM.
         *
         * 09.39 -> 09:39
         * 21.12 -> 21:12
         */

        value =
            value.replace(
                /(\d{1,2})\.(\d{2})(?::(\d{2}))?/g,
                "$1:$2$3"
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
       FIND DATE IN LINE
       
       Berbeda dengan parseDateTime(),
       fungsi ini mencari tanggal + jam di mana pun
       posisinya di dalam kalimat.

       Contoh:

       19/08/2026 09:39 TT Relase

       akan menghasilkan tanggal tersebut.
    ===================================================== */

    function findDateTimeInLine(
        line
    ) {

        if (!line) {

            return null;

        }


        const normalized =
            normalizeLine(
                line
            );


        /*
         * Format tanggal + jam.
         *
         * Diberi toleransi:
         * / atau -
         *
         * Jam:
         * :
         * atau .
         */

        const patterns = [

            /*
             * DD/MM/YYYY HH:mm
             */

            /(\d{1,2})\/{1,2}(\d{1,2})\/(\d{4})\s+(\d{1,2})[:.](\d{2})(?::(\d{2}))?/,

            /*
             * DD-MM-YYYY HH:mm
             */

            /(\d{1,2})-(\d{1,2})-(\d{4})\s+(\d{1,2})[:.](\d{2})(?::(\d{2}))?/,

            /*
             * YYYY-MM-DD HH:mm
             */

            /(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2})[:.](\d{2})(?::(\d{2}))?/

        ];


        for (
            const pattern of patterns
        ) {

            const match =
                normalized.match(
                    pattern
                );


            if (!match) {

                continue;

            }


            let date;


            /*
             * YYYY-MM-DD
             */

            if (
                pattern ===
                patterns[2]
            ) {

                date =
                    createDate(

                        Number(match[1]),

                        Number(match[2]),

                        Number(match[3]),

                        Number(match[4]),

                        Number(match[5]),

                        Number(match[6] || 0)

                    );

            } else {

                /*
                 * DD/MM/YYYY
                 * DD-MM-YYYY
                 */

                date =
                    createDate(

                        Number(match[3]),

                        Number(match[2]),

                        Number(match[1]),

                        Number(match[4]),

                        Number(match[5]),

                        Number(match[6] || 0)

                    );

            }


            if (date) {

                return {

                    date:
                        date,

                    match:
                        match[0],

                    index:
                        match.index

                };

            }

        }


        /*
         * Fallback menggunakan parser lama.
         */

        const fallback =
            parseDateTime(
                normalized
            );


        if (fallback) {

            return {

                date:
                    fallback,

                match:
                    normalized,

                index:
                    0

            };

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
       NORMALIZE CIR HEADER
       
       Tujuan:
       
       ===CIR===
       =====CIR=====
       ---CIR---
       *** CIR ***
       CIR
       CIR :
       CIR=====
       
       semuanya dianggap CIR.
    ===================================================== */

    function normalizeCIRHeader(
        line
    ) {

        if (!line) {

            return "";

        }


        let value =
            String(line)
                .replace(
                    /\u00A0/g,
                    " "
                )
                .trim();


        /*
         * Hapus separator di kiri.
         */

        value =
            value.replace(
                /^[=\-_*#~:.\s]+/,
                ""
            );


        /*
         * Hapus separator di kanan.
         */

        value =
            value.replace(
                /[=\-_*#~:.\s]+$/,
                ""
            );


        return value.trim();

    }


    /* =====================================================
       IS CIR HEADER
       
       Penting:
       
       "CIR"
       "===CIR==="
       "=====CIR====="
       "CIR :"
       
       valid.

       "CIR Report"
       juga valid karena dimulai dengan CIR.
    ===================================================== */

    function isCIRHeader(
        line
    ) {

        const cleaned =
            normalizeCIRHeader(
                line
            );


        if (!cleaned) {

            return false;

        }


        return /^CIR\b/i.test(
            cleaned
        );

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


            if (
                isCIRHeader(
                    originalLine
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
       
       Jangan gunakan CIR di sini karena CIR kedua
       akan ditangani terpisah.
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

            /^Material\s+yang\s+digunakan\s*:?\s*$/i,

            /^Material\s+digunakan\s*:?\s*$/i,

            /^List\s+Material\s*:?\s*$/i,

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
       
       Setelah CIR:
       - baris kosong boleh
       - gap boleh
       - separator boleh
       - tetap dibaca

       Berhenti hanya ketika:
       - section lain ditemukan
       - CIR berikutnya ditemukan
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
             * CIR berikutnya.
             */

            if (
                isCIRHeader(
                    line
                )
            ) {

                endIndex =
                    index;

                break;

            }


            /*
             * SEMUA baris setelah CIR tetap dimasukkan,
             * termasuk baris kosong.
             */

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
       
       Cari tulisan TT Release.
       
       Case insensitive.
       
       Support:
       TT Release
       TT release
       TT RELEASE
       TT Relase
       Ticket Release
       Ticket Relase
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
       FIND FIRST DATE AFTER CIR
       
       INI LOGIKA UTAMA BARU.
       
       Contoh:

       =====CIR=====

       19/08/2026 09:39 TT Relase

       Maka:
       19/08/2026 09:39
       
       langsung diambil.

       Gap berapa pun tidak masalah:

       =====CIR=====


       [gap]


       [gap]


       19/08/2026 09:39 TT Relase

       tetap diambil.
    ===================================================== */

    function findFirstDateAfterCIR(
        lines
    ) {

        if (
            !Array.isArray(lines)
        ) {

            return null;

        }


        /*
         * Periksa dari baris pertama setelah CIR.
         */

        for (
            let index = 0;
            index < lines.length;
            index++
        ) {

            const line =
                lines[index];


            /*
             * Baris kosong dilewati.
             */

            if (
                !normalizeLine(
                    line
                )
            ) {

                continue;

            }


            /*
             * Kalau section lain sudah muncul,
             * jangan ambil tanggal dari section lain.
             */

            if (
                isNextSection(
                    line
                )
            ) {

                break;

            }


            /*
             * Cari tanggal + jam di baris.
             */

            const dateResult =
                findDateTimeInLine(
                    line
                );


            if (dateResult) {

                return {

                    date:
                        dateResult.date,

                    sourceLine:
                        line,

                    sourceIndex:
                        index,

                    matchedText:
                        dateResult.match

                };

            }

        }


        return null;

    }


    /* =====================================================
       FIND RELEASE IN CIR
       
       PRIORITAS:

       1. Cari CIR
       2. Ambil section setelah CIR
       3. Cari TT Release
       4. Cari tanggal di baris TT Release
       5. Jika tidak ada tanggal di baris release,
          cari tanggal pertama setelah CIR
       6. Gap tidak berpengaruh
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
         * =================================================
         * LANGKAH 1
         *
         * Cari baris yang mengandung TT Release.
         * =================================================
         */

        const releaseLine =
            findReleaseLine(
                cirSection.text,
                settings.releasePhrases || []
            );


        /*
         * =================================================
         * LANGKAH 2
         *
         * Kalau TT Release ditemukan,
         * cari tanggal pada baris tersebut.
         * =================================================
         */

        if (releaseLine) {

            const directDate =
                findDateTimeInLine(
                    releaseLine.line
                );


            if (directDate) {

                return {

                    cirFound:
                        true,

                    releaseFound:
                        true,

                    cirSection:
                        cirSection,

                    releaseLine:
                        releaseLine,

                    dateResult: {

                        date:
                            directDate.date,

                        sourceLine:
                            releaseLine.line,

                        sourceIndex:
                            releaseLine.index,

                        matchedText:
                            directDate.match

                    }

                };

            }


            /*
             * TT Release ada tetapi tanggal tidak
             * berada di baris yang sama.
             *
             * Cari tanggal mulai dari baris tersebut
             * ke bawah.
             */

            for (
                let index =
                    releaseLine.index;

                index <
                    cirSection.lines.length;

                index++
            ) {

                const line =
                    cirSection.lines[index];


                /*
                 * Gap/baris kosong dilewati.
                 */

                if (
                    !normalizeLine(
                        line
                    )
                ) {

                    continue;

                }


                if (
                    isNextSection(
                        line
                    )
                ) {

                    break;

                }


                const dateResult =
                    findDateTimeInLine(
                        line
                    );


                if (dateResult) {

                    return {

                        cirFound:
                            true,

                        releaseFound:
                            true,

                        cirSection:
                            cirSection,

                        releaseLine:
                            releaseLine,

                        dateResult: {

                            date:
                                dateResult.date,

                            sourceLine:
                                line,

                            sourceIndex:
                                index,

                            matchedText:
                                dateResult.match

                        }

                    };

                }

            }

        }


        /*
         * =================================================
         * LANGKAH 3
         *
         * Tidak ada TT Release yang cocok,
         * tetapi ada tanggal setelah CIR.
         *
         * Ambil tanggal PALING AWAL setelah CIR.
         * =================================================
         */

        const firstDate =
            findFirstDateAfterCIR(
                cirSection.lines
            );


        if (firstDate) {

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
                    firstDate

            };

        }


        /*
         * Tidak ditemukan tanggal.
         */

        return {

            cirFound:
                true,

            releaseFound:
                false,

            cirSection:
                cirSection,

            releaseLine:
                releaseLine,

            dateResult:
                null

        };

    }


    /* =====================================================
       MAIN PARSER
       
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
           CARI RELEASE DI CIR
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
           RELEASE / TANGGAL TIDAK ADA
        ================================================= */

        if (
            !searchResult.releaseFound ||
            !searchResult.dateResult
        ) {

            const notFound =
                containsNotFoundPhrase(
                    cirSection.text,
                    settings.notFoundPhrases || []
                );


            result.status =
                notFound
                    ? "NOT YET"
                    : "NOT FOUND";


            result.note =
                notFound

                    ? "Ditemukan indikasi data belum tersedia pada section CIR."

                    : "Tidak ditemukan tanggal dan jam setelah section CIR.";


            return result;

        }


        /* =================================================
           RELEASE LINE
        ================================================= */

        const releaseLine =
            searchResult.releaseLine;


        if (releaseLine) {

            result.matchedPhrase =
                releaseLine.phrase;

            result.sourceLine =
                releaseLine.line;

        } else {

            result.sourceLine =
                searchResult
                    .dateResult
                    .sourceLine;

        }


        /*
         * Index global terhadap report.
         */

        result.sourceIndex =
            cirSection.headerIndex +
            1 +
            searchResult
                .dateResult
                .sourceIndex;


        /* =================================================
           DATE RESULT
        ================================================= */

        const dateResult =
            searchResult.dateResult;


        if (!dateResult) {

            result.status =
                "NOT FOUND";

            result.note =
                "Tanggal/jam Ticket Release tidak dapat dibaca.";

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


        /*
         * Keterangan.
         */

        if (releaseLine) {

            if (
                dateResult.sourceIndex ===
                releaseLine.index
            ) {

                result.note =
                    "TT Release ditemukan pada section CIR dan tanggal/jam berhasil dibaca.";

            } else {

                result.note =
                    "TT Release ditemukan pada section CIR dan tanggal/jam ditemukan setelah baris TT Release.";

            }

        } else {

            result.note =
                "Tanggal/jam paling awal setelah tulisan CIR digunakan sebagai Ticket Release.";

        }


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
                     * CIR berdasarkan index.
                     */

                    if (
                        typeof cirField ===
                        "number"
                    ) {

                        cir =
                            row[cirField];

                    } else {

                        /*
                         * Default CIR = AF = index 31.
                         */

                        cir =
                            row[
                                DEFAULT_CIR_COLUMN_INDEX
                            ];

                    }


                    /*
                     * TT Number.
                     *
                     * Default D = index 3.
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

                    /*
                     * CIR.
                     */

                    if (
                        cirField
                    ) {

                        cir =
                            row[cirField];

                    } else {

                        /*
                         * Coba cari field CIR.
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
                                "cir"
                            ) {

                                cir =
                                    row[key];

                                break;

                            }

                        }

                    }


                    /*
                     * TT Number.
                     */

                    if (
                        ttNumberField
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
       
       Khusus spreadsheet.

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
            row[cirIndex];


        return parseCIR(
            cir,
            ttNumber
        );

    }


    /* =====================================================
       PARSE MULTIPLE SPREADSHEET ROWS
       
       D  = TT Number
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
         * Spreadsheet row.
         */

        parseRow:
            parseRow,


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


        findDateTimeInLine:
            findDateTimeInLine,


        formatDateTime:
            formatDateTime,


        normalizeText:
            normalizeText,


        normalizeTTNumber:
            normalizeTTNumber,


        /*
         * CIR.
         */

        findCIRHeader:
            findCIRHeader,


        getCIRSection:
            getCIRSection,


        isCIRHeader:
            isCIRHeader,


        /*
         * Release.
         */

        findReleaseLine:
            findReleaseLine,


        findFirstDateAfterCIR:
            findFirstDateAfterCIR

    };


})();
