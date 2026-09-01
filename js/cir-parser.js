/* =========================================================
   REPORT CHECKER
   cir-parser.js

   UPDATE FINAL

   - CIR header fleksibel:
       CIR
       ===CIR===
       =====CIR=====
       --- CIR ---
       ***CIR***
       CIR : 
       CIR anything

   - Tidak peduli blank line / gap setelah CIR
   - Setelah CIR ditemukan, scan semua baris di bawahnya
   - Ambil tanggal + jam PALING AWAL setelah CIR
   - Tidak harus ada tulisan TT Release
   - Mendukung:
       21/08/2026 15:59
       21/08/2026 15.59
       21/08/2026 15:59:30
       21/08/2026 15.59.30
       21//08//2026 15.59
       2026-08-21 15:59
       21-08-2026 15:59

   - TT RELEASE / TT RELESAE / TT RELASE
     tetap dikenali
   - Ticket = TT Number dari kolom D
   - Support parse(CIR, TT Number)
   - Support parseRow()
   - Support parseSpreadsheetRows()
========================================================= */

(function () {

    "use strict";


    /* =====================================================
       CONSTANTS
    ===================================================== */

    const DEFAULT_TT_NUMBER_COLUMN_INDEX = 3;

    /*
     * Berdasarkan struktur:
     *
     * D  = TT Number
     * AF = CIR
     *
     * A = index 0
     * D = index 3
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

            "tt_number",

            "Ticket",

            "ticket"

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
                normalizedKey === "ttnumber"
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


            return {

                releasePhrases:
                    Array.isArray(
                        settings.releasePhrases
                    )
                        ? settings.releasePhrases
                        : [],

                notFoundPhrases:
                    Array.isArray(
                        settings.notFoundPhrases
                    )
                        ? settings.notFoundPhrases
                        : [],

                materialStartPhrases:
                    Array.isArray(
                        settings.materialStartPhrases
                    )
                        ? settings.materialStartPhrases
                        : [],

                materialEndPhrases:
                    Array.isArray(
                        settings.materialEndPhrases
                    )
                        ? settings.materialEndPhrases
                        : []

            };

        }


        /*
         * Default.
         */

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
                "N/A"

            ],

            materialStartPhrases: [

                "Material :",
                "Material",
                "MATERIAL :",
                "Material yang digunakan :",
                "Material digunakan :",
                "List Material :"

            ],

            materialEndPhrases: [

                "Tim QN",
                "Team QN",
                "PIC FS",
                "PIC",
                "RFO",
                "Action",
                "Act:",
                "==="

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
       
       Support:
       
       21//08//2026
       21/08/2026
       21-08-2026
       21.08.2026
    ===================================================== */

    function normalizeDateSeparators(value) {

        return String(value || "")
            .replace(
                /\/{2,}/g,
                "/"
            )
            .replace(
                /(\d)\.(\d)/g,
                "$1/$2"
            );

    }


    /* =====================================================
       DATE PARSER
       
       IMPORTANT:
       
       Mendukung jam dengan:
       
       15:59
       15.59
       15:59:30
       15.59.30
       
       Jadi:
       
       21/08/2026 15.59
       
       tidak lagi menjadi:
       
       21/08/2026 00:00
    ===================================================== */

    function parseDateTime(text) {

        if (!text) {

            return null;

        }


        let value =
            normalizeLine(text);


        if (!value) {

            return null;

        }


        /*
         * Normalisasi:
         *
         * 21//08//2026
         * menjadi
         * 21/08/2026
         */

        value =
            value.replace(
                /\/{2,}/g,
                "/"
            );


        /*
         * =================================================
         * DD/MM/YYYY HH:mm
         * DD/MM/YYYY HH.mm
         * =================================================
         */

        let match =
            value.match(
                /(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})\s+(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?/
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
         * =================================================
         * YYYY-MM-DD HH:mm
         * YYYY-MM-DD HH.mm
         * =================================================
         */

        match =
            value.match(
                /(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?/
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


        /*
         * =================================================
         * DD/MM/YYYY
         * =================================================
         */

        match =
            value.match(
                /(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/
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


        /*
         * =================================================
         * YYYY-MM-DD
         * =================================================
         */

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
            year > 2100 ||
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
                    .padStart(2, "0");


        return (

            pad(
                date.getDate()
            ) +

            "/" +

            pad(
                date.getMonth() + 1
            ) +

            "/" +

            date.getFullYear() +

            " " +

            pad(
                date.getHours()
            ) +

            ":" +

            pad(
                date.getMinutes()
            ) +

            ":" +

            pad(
                date.getSeconds()
            )

        );

    }


    /* =====================================================
       FIND CIR HEADER
       
       INI DIBUAT LEBIH LONGGAR.
       
       Semua bentuk berikut valid:
       
       CIR
       ===CIR===
       =====CIR=====
       ---CIR---
       ***CIR***
       CIR :
       CIR====
       ==== CIR ====
       
       Yang penting terdapat kata CIR sebagai token.
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
             * Hilangkan separator.
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
             * CIR harus menjadi kata.
             *
             * Valid:
             *
             * CIR
             * CIR :
             * CIR==== 
             *
             * Tidak valid:
             *
             * CIRCULAR
             * CIRCUIT
             */

            if (
                /\bCIR\b/i.test(
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
       IS MATERIAL / NEXT SECTION
    ===================================================== */

    function isNextSection(line) {

        const value =
            normalizeLine(
                line
            );


        if (!value) {

            return false;

        }


        const patterns = [

            /^Material\s*:?\s*$/i,

            /^MATERIAL\s*:?\s*$/i,

            /^Material\s*$/i,

            /^Tim\s+QN\s*:?\s*$/i,

            /^Team\s+QN\s*:?\s*$/i,

            /^PIC\s+FS\s*:?\s*$/i,

            /^PIC\s*:?\s*$/i,

            /^RFO\s*:?\s*$/i,

            /^Action\s*:?\s*$/i,

            /^Act\s*:?\s*$/i,

            /^Description\s*:?\s*$/i,

            /^Impact\s*:?\s*$/i,

            /^TIKOR\s*:?\s*$/i,

            /^TIM\s*:?\s*$/i

        ];


        return patterns.some(
            pattern =>
                pattern.test(
                    value
                )
        );

    }


    /* =====================================================
       GET CIR SECTION
       
       PERUBAHAN PENTING:
       
       Tidak lagi bergantung pada jarak tertentu.
       
       Setelah CIR:
       - semua baris dibaca
       - blank line diabaikan
       - tanggal pertama ditemukan akan diambil
       
       Tetapi jika Material / RFO / ACT / TIM sudah
       dimulai sebelum ada tanggal, scan dihentikan.
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
             * Jangan berhenti karena blank line.
             */

            /*
             * Section material / RFO / ACT / TIM.
             *
             * Tapi jika line kosong, tetap lanjut.
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
                        /^[=\-_*#:\s]+/,
                        ""
                    )
                    .replace(
                        /[=\-_*#:\s]+$/,
                        ""
                    )
                    .trim();


            if (
                /\bCIR\b/i.test(
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
       FIND RELEASE PHRASE
       
       Fungsi ini sekarang lebih fleksibel.
       
       Contoh:
       
       TT RELEASE
       TT Relase
       TT Releae
       TT Releas
       TT RELESAE
       
       semuanya dapat dianggap sebagai release
       jika terdapat kata TT dan kata yang mirip RELEASE.
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


            const lower =
                line.toLowerCase();


            /*
             * =================================================
             * 1. Settings phrase normal
             * =================================================
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
             * =================================================
             * 2. FLEXIBLE TT RELEASE
             *
             * TT + release typo.
             *
             * Contoh:
             *
             * TT RELEASE
             * TT RELESAE
             * TT RELASE
             * TT RELESE
             * TT RELASEE
             * =================================================
             */

            if (
                /\bTT\b/i.test(line) &&
                /\bRELE[A-Z]*\b/i.test(line)
            ) {

                /*
                 * Cari kata yang dimulai dengan RELE.
                 */

                const releaseMatch =
                    line.match(
                        /\bRELE[A-Z]*\b/i
                    );


                if (releaseMatch) {

                    return {

                        line:
                            originalLine,

                        normalizedLine:
                            line,

                        index:
                            index,

                        phrase:
                            releaseMatch[0]

                    };

                }

            }


            /*
             * =================================================
             * 3. TYPO "RELAS..."
             *
             * Contoh:
             *
             * TT RELASE
             * TT RELASEE
             * TT RELAESE
             * =================================================
             */

            if (
                /\bTT\b/i.test(line) &&
                /\bRELA[A-Z]*\b/i.test(line)
            ) {

                return {

                    line:
                        originalLine,

                    normalizedLine:
                        line,

                    index:
                        index,

                    phrase:
                        "TT RELEASE (FLEXIBLE)"

                };

            }

        }


        return null;

    }


    /* =====================================================
       FIND ALL DATES AFTER CIR
       
       INI BAGIAN PALING PENTING.
       
       Kita tidak lagi hanya mencari tanggal di sekitar
       baris TT Release.
       
       Semua tanggal setelah CIR discan.
       
       Contoh:
       
       ===CIR====
       
       [blank]
       
       [blank]
       
       26/08/2026 21.12 TT RELEASE
       
       [blank]
       
       27/08/2026 00.11 Team...
       
       Maka yang dipilih:
       
       26/08/2026 21:12
       
       BUKAN:
       
       26/08/2026 00:00
    ===================================================== */

    function findEarliestDateAfterCIR(
        lines
    ) {

        const results = [];


        for (
            let index = 0;
            index < lines.length;
            index++
        ) {

            const line =
                normalizeLine(
                    lines[index]
                );


            if (!line) {

                continue;

            }


            /*
             * parseDateTime bisa membaca tanggal + jam
             * walaupun tanggal berada di tengah kalimat.
             */

            const date =
                parseDateTime(
                    line
                );


            if (!date) {

                continue;

            }


            /*
             * Simpan.
             */

            results.push({

                date:
                    date,

                sourceLine:
                    lines[index],

                sourceIndex:
                    index

            });

        }


        if (
            !results.length
        ) {

            return null;

        }


        /*
         * Ambil tanggal PALING AWAL berdasarkan
         * posisi di report, bukan tanggal kalender.
         *
         * Karena kebutuhan user:
         *
         * "paling awal / paling di bawah tulisan CIR"
         */

        return results[0];

    }


    /* =====================================================
       FIND TT RELEASE IN CIR
       
       PRIORITAS:
       
       1. Temukan CIR
       2. Cari release phrase
       3. Cari tanggal pertama setelah CIR
       
       Jika release phrase tidak ketemu tetapi tanggal
       pertama ada, tanggal tetap digunakan.
       
       Ini membuat parser lebih tahan typo.
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
         * Cari tulisan TT Release.
         */

        const releaseLine =
            findReleaseLine(
                cirSection.text,
                settings.releasePhrases
            );


        /*
         * Cari tanggal PALING AWAL setelah CIR.
         */

        const dateResult =
            findEarliestDateAfterCIR(
                cirSection.lines
            );


        /*
         * Kalau tanggal ada, anggap release ditemukan.
         *
         * Ini sengaja.
         *
         * Karena user ingin:
         *
         * ===CIR====
         *
         * 19/08/2026 09:39 TT Relase
         *
         * tetap terbaca.
         */

        if (
            dateResult
        ) {

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


        /*
         * Tidak ada tanggal.
         */

        return {

            cirFound:
                true,

            releaseFound:
                Boolean(
                    releaseLine
                ),

            cirSection:
                cirSection,

            releaseLine:
                releaseLine,

            dateResult:
                null

        };

    }


    /* =====================================================
       CONTAINS NOT FOUND
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
           SEARCH
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
           TIDAK ADA TANGGAL
        ================================================= */

        if (
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

                    ? "Ditemukan indikasi data belum tersedia pada section CIR."

                    : "Tanggal dan jam tidak ditemukan setelah section CIR.";


            return result;

        }


        /* =================================================
           RELEASE LINE
        ================================================= */

        if (
            searchResult.releaseLine
        ) {

            result.matchedPhrase =
                searchResult
                    .releaseLine
                    .phrase;


            result.sourceLine =
                searchResult
                    .releaseLine
                    .line;

        } else {

            /*
             * Jika typo / format aneh dan release phrase
             * tidak dikenali, tetap ambil tanggal.
             */

            result.matchedPhrase =
                "DATE AFTER CIR";

            result.sourceLine =
                searchResult
                    .dateResult
                    .sourceLine;

        }


        /* =================================================
           DATE
        ================================================= */

        const dateResult =
            searchResult.dateResult;


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
         * sourceIndex adalah posisi tanggal
         * terhadap seluruh report.
         */

        result.sourceIndex =
            cirSection.headerIndex +
            1 +
            dateResult.sourceIndex;


        /* =================================================
           NOTE
        ================================================= */

        if (
            searchResult.releaseLine
        ) {

            if (
                dateResult.sourceIndex ===
                searchResult.releaseLine.index
            ) {

                result.note =
                    "TT Release dan tanggal ditemukan pada baris yang sama setelah CIR.";

            } else {

                result.note =
                    "Tanggal release diambil dari tanggal paling awal setelah CIR.";

            }

        } else {

            result.note =
                "Tanggal paling awal setelah CIR digunakan sebagai TT Release.";

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
                   ARRAY
                ========================================= */

                if (
                    Array.isArray(row)
                ) {

                    /*
                     * CIR.
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
                         * kolom terakhir.
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
       DEBUG HELPER
       
       Bisa dipakai dari browser:
       
       ReportCheckerCIR.debug(cirText, "TT123")
    ===================================================== */

    function debug(
        cirText,
        ttNumber
    ) {

        const result =
            parseCIR(
                cirText,
                ttNumber
            );


        console.log(
            "===== REPORT CHECKER CIR DEBUG ====="
        );

        console.log(
            "TT Number:",
            result.ttNumber
        );

        console.log(
            "Status:",
            result.status
        );

        console.log(
            "Release Date:",
            result.releaseDateText
        );

        console.log(
            "Matched Phrase:",
            result.matchedPhrase
        );

        console.log(
            "Source Line:",
            result.sourceLine
        );

        console.log(
            "Note:",
            result.note
        );

        console.log(
            "Full Result:",
            result
        );


        return result;

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

        findEarliestDateAfterCIR:
            findEarliestDateAfterCIR,

        debug:
            debug

    };


})();
