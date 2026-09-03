/* =========================================================
   REPORT CHECKER
   validator.js

   SESUAI DENGAN settings.js

   ATURAN:

   1. Ticket utama WAJIB diambil dari kolom "TT Number"
   2. Tidak menggunakan Customer Ticket / Ref Ticket
   3. Datetime Receive dibaca dari Excel
   4. TT Release dicari dari CIR
   5. Keyword TT Release mengikuti settings.js
      -> releasePhrases
   6. Tidak membuat daftar release keyword sendiri
   7. TT Release boleh satu baris dengan tanggal
   8. TT Release boleh sebelum / sesudah tanggal
   9. Jarak tanggal maksimal 3 baris
   10. Tanggal Receive dan Release harus sama
   11. Jika TT Release tidak ditemukan => TIDAK SESUAI
   12. Jika TT Number kosong => INVALID
   13. Menyediakan data siap export

   ========================================================= */

(function () {

    "use strict";


    /* =====================================================
       DEFAULT SETTINGS
       
       HANYA fallback jika settings.js belum tersedia.
       
       Pengaturan utama tetap dari:
       
       window.ReportCheckerSettings.get()
    ===================================================== */

    const DEFAULT_SETTINGS = {

        releasePhrases: [

            "TT Release",
            "TT release",
            "TT RELEASE",
            "Ticket Release",
            "Ticket release",
            "TICKET RELEASE"

        ],

        validationType:
            "release-after-receive",

        maxReleaseMinutes:
            0

    };


    /* =====================================================
       GET SETTINGS
       
       Semua pengaturan utama diambil dari settings.js
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

                ...DEFAULT_SETTINGS,

                ...settings

            };

        }


        return {

            ...DEFAULT_SETTINGS

        };

    }


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
       EXCEL DATE CONVERSION
       
       Support:
       - Date object
       - Excel serial number
       - YYYY-MM-DD HH:mm:ss
       - DD/MM/YYYY HH:mm:ss
       - DD-MM-YYYY HH:mm:ss
    ===================================================== */

    function parseExcelDate(
        value
    ) {

        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {

            return null;

        }


        /*
         * JS Date object
         */

        if (
            value instanceof Date
        ) {

            if (
                isNaN(
                    value.getTime()
                )
            ) {

                return null;

            }


            return value;

        }


        /*
         * Excel serial number
         *
         * Excel epoch:
         * 1899-12-30
         */

        if (
            typeof value === "number"
        ) {

            const excelEpoch =
                new Date(
                    Date.UTC(
                        1899,
                        11,
                        30
                    )
                );


            const milliseconds =
                value *
                24 *
                60 *
                60 *
                1000;


            const result =
                new Date(
                    excelEpoch.getTime() +
                    milliseconds
                );


            if (
                isNaN(
                    result.getTime()
                )
            ) {

                return null;

            }


            return result;

        }


        const text =
            String(value)
                .trim();


        if (!text) {

            return null;

        }


        /*
         * YYYY-MM-DD
         */

        let match =
            text.match(
                /^(\d{4})-(\d{1,2})-(\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/
            );


        if (match) {

            return createValidDate(

                Number(match[1]),
                Number(match[2]),
                Number(match[3]),
                Number(match[4] || 0),
                Number(match[5] || 0),
                Number(match[6] || 0)

            );

        }


        /*
         * DD/MM/YYYY
         */

        match =
            text.match(
                /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/
            );


        if (match) {

            return createValidDate(

                Number(match[3]),
                Number(match[2]),
                Number(match[1]),
                Number(match[4] || 0),
                Number(match[5] || 0),
                Number(match[6] || 0)

            );

        }


        /*
         * DD-MM-YYYY
         */

        match =
            text.match(
                /^(\d{1,2})-(\d{1,2})-(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/
            );


        if (match) {

            return createValidDate(

                Number(match[3]),
                Number(match[2]),
                Number(match[1]),
                Number(match[4] || 0),
                Number(match[5] || 0),
                Number(match[6] || 0)

            );

        }


        /*
         * Fallback native Date
         */

        const fallback =
            new Date(text);


        if (
            !isNaN(
                fallback.getTime()
            )
        ) {

            return fallback;

        }


        return null;

    }


    /* =====================================================
       CREATE VALID DATE
    ===================================================== */

    function createValidDate(
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
            isNaN(
                date.getTime()
            )
        ) {

            return null;

        }


        /*
         * Cegah tanggal invalid:
         *
         * 31/02/2026
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

    function formatDate(
        date
    ) {

        if (
            !date ||
            isNaN(
                date.getTime()
            )
        ) {

            return "";

        }


        const day =
            String(
                date.getDate()
            ).padStart(
                2,
                "0"
            );


        const month =
            String(
                date.getMonth() + 1
            ).padStart(
                2,
                "0"
            );


        const year =
            date.getFullYear();


        return (
            `${year}-${month}-${day}`
        );

    }


    /* =====================================================
       FORMAT DATETIME
    ===================================================== */

    function formatDateTime(
        date
    ) {

        if (
            !date ||
            isNaN(
                date.getTime()
            )
        ) {

            return "";

        }


        const datePart =
            formatDate(
                date
            );


        const hour =
            String(
                date.getHours()
            ).padStart(
                2,
                "0"
            );


        const minute =
            String(
                date.getMinutes()
            ).padStart(
                2,
                "0"
            );


        const second =
            String(
                date.getSeconds()
            ).padStart(
                2,
                "0"
            );


        return (
            `${datePart} ${hour}:${minute}:${second}`
        );

    }


    /* =====================================================
       GET RELEASE PHRASES
       
       PENTING:
       
       Validator TIDAK lagi menggunakan:
       
       releaseKeywords
       
       Validator menggunakan:
       
       settings.js
       -> releasePhrases
       
       Contoh setting:

       releasePhrases: [
           "TT Release",
           "Ticket Release"
       ]

       Kalau user menambahkan:

       "TT RELEASE :"
       "TT Release Number"

       validator otomatis mengikuti.
    ===================================================== */

    function getReleasePhrases() {

        const settings =
            getSettings();


        /*
         * Ambil dari settings.js
         */

        let phrases =
            settings.releasePhrases;


        /*
         * Pastikan array.
         */

        if (
            !Array.isArray(
                phrases
            )
        ) {

            phrases =
                DEFAULT_SETTINGS
                    .releasePhrases;

        }


        /*
         * Bersihkan phrase kosong.
         */

        phrases =
            phrases

                .map(
                    function (item) {

                        return String(
                            item || ""
                        )
                            .trim();

                    }
                )

                .filter(
                    function (item) {

                        return item.length > 0;

                    }
                );


        /*
         * Jika setting kosong,
         * gunakan default.
         */

        if (
            phrases.length === 0
        ) {

            return DEFAULT_SETTINGS
                .releasePhrases
                .slice();

        }


        return phrases;

    }


    /* =====================================================
       CHECK RELEASE PHRASE
       
       Case insensitive.
    ===================================================== */

    function hasReleaseKeyword(
        text
    ) {

        const value =
            normalizeLine(
                text
            );


        if (!value) {

            return false;

        }


        const lowerText =
            value.toLowerCase();


        const releasePhrases =
            getReleasePhrases();


        for (
            const phrase
            of releasePhrases
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
       PARSE RELEASE FROM LINE
       
       Contoh:

       31/08/2026 11:43 TT Release

       TT Release
       31/08/2026 11:43

       31/08/2026 11:43
       TT Release

       TT RELEASE

       31-08-2026 11:43 TT release
    ===================================================== */

    function parseReleaseFromLine(
        line
    ) {

        const text =
            normalizeLine(
                line
            );


        if (!text) {

            return null;

        }


        if (
            !hasReleaseKeyword(
                text
            )
        ) {

            return null;

        }


        /*
         * DD/MM/YYYY HH:mm:ss
         */

        let match =
            text.match(
                /(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/i
            );


        if (match) {

            return {

                date:
                    createValidDate(

                        Number(match[3]),
                        Number(match[2]),
                        Number(match[1]),
                        Number(match[4]),
                        Number(match[5]),
                        Number(match[6] || 0)

                    ),

                raw:
                    text

            };

        }


        /*
         * DD-MM-YYYY HH:mm:ss
         */

        match =
            text.match(
                /(\d{1,2})-(\d{1,2})-(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/i
            );


        if (match) {

            return {

                date:
                    createValidDate(

                        Number(match[3]),
                        Number(match[2]),
                        Number(match[1]),
                        Number(match[4]),
                        Number(match[5]),
                        Number(match[6] || 0)

                    ),

                raw:
                    text

            };

        }


        /*
         * YYYY-MM-DD HH:mm:ss
         */

        match =
            text.match(
                /(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/i
            );


        if (match) {

            return {

                date:
                    createValidDate(

                        Number(match[1]),
                        Number(match[2]),
                        Number(match[3]),
                        Number(match[4]),
                        Number(match[5]),
                        Number(match[6] || 0)

                    ),

                raw:
                    text

            };

        }


        /*
         * TT Release ditemukan,
         * tetapi tanggal tidak ada
         * pada baris ini.
         */

        return {

            date:
                null,

            raw:
                text

        };

    }


    /* =====================================================
       FIND RELEASE IN CIR
       
       Prinsip:

       - CIR harus ada
       - Setelah CIR, cari TT Release
       - Keyword mengikuti settings.js
       - Case insensitive
       - Tanggal boleh sebelum / sesudah TT Release
       - Jarak maksimal 3 baris
       - Ambil release terakhir
    ===================================================== */

    function findReleaseInCir(
        cirText
    ) {

        const text =
            normalizeText(
                cirText
            );


        if (!text) {

            return {

                found:
                    false,

                date:
                    null,

                raw:
                    "",

                line:
                    "",

                all:
                    []

            };

        }


        const lines =
            text.split("\n");


        const releases = [];


        /*
         * Cari semua baris yang
         * mengandung release phrase.
         */

        for (
            let i = 0;
            i < lines.length;
            i++
        ) {

            const line =
                lines[i];


            if (
                !hasReleaseKeyword(
                    line
                )
            ) {

                continue;

            }


            /*
             * Coba tanggal pada
             * baris yang sama.
             */

            let parsed =
                parseReleaseFromLine(
                    line
                );


            if (
                parsed &&
                parsed.date
            ) {

                releases.push({

                    ...parsed,

                    lineIndex:
                        i,

                    line:
                        line

                });

                continue;

            }


            /*
             * Jika tanggal tidak ada
             * pada baris release,
             * cari maksimal 3 baris.
             */

            const maxDistance =
                3;


            let foundDate =
                null;


            /*
             * 1. Cari setelah TT Release
             */

            for (
                let offset = 1;
                offset <= maxDistance;
                offset++
            ) {

                const index =
                    i + offset;


                if (
                    index >=
                    lines.length
                ) {

                    break;

                }


                const candidate =
                    parseExcelDate(
                        lines[index]
                    );


                if (candidate) {

                    foundDate = {

                        date:
                            candidate,

                        sourceIndex:
                            index,

                        sourceLine:
                            lines[index]

                    };

                    break;

                }

            }


            /*
             * 2. Kalau tidak ditemukan,
             *    cari sebelum TT Release.
             */

            if (!foundDate) {

                for (
                    let offset = 1;
                    offset <= maxDistance;
                    offset++
                ) {

                    const index =
                        i - offset;


                    if (
                        index < 0
                    ) {

                        break;

                    }


                    const candidate =
                        parseExcelDate(
                            lines[index]
                        );


                    if (candidate) {

                        foundDate = {

                            date:
                                candidate,

                            sourceIndex:
                                index,

                            sourceLine:
                                lines[index]

                        };

                        break;

                    }

                }

            }


            releases.push({

                date:
                    foundDate
                        ? foundDate.date
                        : null,

                raw:
                    normalizeLine(
                        line
                    ),

                lineIndex:
                    i,

                line:
                    line,

                dateSourceIndex:
                    foundDate
                        ? foundDate.sourceIndex
                        : -1,

                dateSourceLine:
                    foundDate
                        ? foundDate.sourceLine
                        : ""

            });

        }


        /*
         * Tidak ada release.
         */

        if (
            releases.length === 0
        ) {

            return {

                found:
                    false,

                date:
                    null,

                raw:
                    "",

                line:
                    "",

                all:
                    []

            };

        }


        /*
         * Ambil release terakhir.
         */

        const selected =
            releases[
                releases.length - 1
            ];


        return {

            found:
                true,

            date:
                selected.date,

            raw:
                selected.raw,

            line:
                selected.line,

            lineIndex:
                selected.lineIndex,

            dateSourceIndex:
                selected.dateSourceIndex ??
                selected.lineIndex,

            dateSourceLine:
                selected.dateSourceLine ||
                selected.line,

            all:
                releases

        };

    }


    /* =====================================================
       COMPARE DATE ONLY
    ===================================================== */

    function compareDateOnly(
        receiveDate,
        releaseDate
    ) {

        if (
            !receiveDate ||
            !releaseDate
        ) {

            return false;

        }


        return (

            receiveDate.getFullYear() ===
            releaseDate.getFullYear()

            &&

            receiveDate.getMonth() ===
            releaseDate.getMonth()

            &&

            receiveDate.getDate() ===
            releaseDate.getDate()

        );

    }


    /* =====================================================
       COMPARE DATETIME
    ===================================================== */

    function compareDateTime(
        receiveDate,
        releaseDate
    ) {

        if (
            !receiveDate ||
            !releaseDate
        ) {

            return false;

        }


        return (

            receiveDate.getTime() ===
            releaseDate.getTime()

        );

    }


    /* =====================================================
       GET TT NUMBER
       
       HANYA:
       
       row["TT Number"]
       
       Tidak fallback ke:
       - Customer Ticket
       - Ref Ticket
       - Ticket
    ===================================================== */

    function getTTNumber(
        row
    ) {

        if (!row) {

            return "";

        }


        const value =
            row["TT Number"];


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
       VALIDATE ONE ROW
    ===================================================== */

    function validateRow(
        row,
        options
    ) {

        options =
            options || {};


        /*
         * =================================================
         * TICKET = TT NUMBER
         * =================================================
         */

        const ticket =
            getTTNumber(
                row
            );


        const cir =
            row?.["CIR"] ||
            "";


        const datetimeReceiveValue =
            row?.["Datetime Receive"] ||
            "";


        const result = {

            ticket:
                ticket,

            ttNumber:
                ticket,

            datetimeReceive:
                datetimeReceiveValue,

            receiveDate:
                null,

            receiveDateFormatted:
                "",

            releaseFound:
                false,

            releaseDate:
                null,

            releaseDateFormatted:
                "",

            releaseDateTime:
                "",

            releaseRaw:
                "",

            status:
                "",

            reason:
                "",

            original:
                row

        };


        /* =================================================
           TT NUMBER CHECK
        ================================================= */

        if (!ticket) {

            result.status =
                "INVALID";

            result.reason =
                "TT Number tidak ditemukan.";

            return result;

        }


        /* =================================================
           RECEIVE DATE
        ================================================= */

        const receiveDate =
            parseExcelDate(
                datetimeReceiveValue
            );


        result.receiveDate =
            receiveDate;


        result.receiveDateFormatted =
            formatDateTime(
                receiveDate
            );


        if (!receiveDate) {

            result.status =
                "TIDAK SESUAI";

            result.reason =
                "Datetime Receive tidak dapat dibaca.";

            return result;

        }


        /* =================================================
           FIND TT RELEASE DI CIR
        ================================================= */

        const release =
            findReleaseInCir(
                cir
            );


        result.releaseFound =
            release.found;


        result.releaseDate =
            release.date;


        result.releaseDateFormatted =
            formatDate(
                release.date
            );


        result.releaseDateTime =
            formatDateTime(
                release.date
            );


        result.releaseRaw =
            release.raw;


        /* =================================================
           RELEASE NOT FOUND
        ================================================= */

        if (!release.found) {

            result.status =
                "TIDAK SESUAI";

            result.reason =
                "TT Release tidak ditemukan di CIR.";

            return result;

        }


        /* =================================================
           RELEASE ADA TAPI TANGGAL TIDAK ADA
        ================================================= */

        if (!release.date) {

            result.status =
                "TIDAK SESUAI";

            result.reason =
                "TT Release ditemukan tetapi tanggal tidak dapat dibaca.";

            return result;

        }


        /* =================================================
           COMPARE DATE
        ================================================= */

        const dateSame =
            compareDateOnly(
                receiveDate,
                release.date
            );


        /*
         * Default:
         * tanggal harus sama.
         */

        if (dateSame) {

            result.status =
                "SESUAI";

            result.reason =
                "Tanggal Datetime Receive dan TT Release sama.";

        } else {

            result.status =
                "TIDAK SESUAI";

            result.reason =
                "Tanggal Datetime Receive dan TT Release berbeda.";

        }


        return result;

    }


    /* =====================================================
       VALIDATE MULTIPLE ROWS
    ===================================================== */

    function validateRows(
        rows,
        options
    ) {

        if (
            !Array.isArray(rows)
        ) {

            return [];

        }


        return rows.map(
            function (row) {

                return validateRow(
                    row,
                    options
                );

            }
        );

    }


    /* =====================================================
       SPLIT RESULT
    ===================================================== */

    function splitResults(
        results
    ) {

        const output = {

            sesuai:
                [],

            tidakSesuai:
                [],

            invalid:
                [],

            summary: {

                total:
                    0,

                sesuai:
                    0,

                tidakSesuai:
                    0,

                invalid:
                    0

            }

        };


        if (
            !Array.isArray(
                results
            )
        ) {

            return output;

        }


        for (
            const result
            of results
        ) {

            if (!result) {

                continue;

            }


            output.summary.total++;


            if (
                result.status ===
                "SESUAI"
            ) {

                output.sesuai.push(
                    result
                );

                output.summary.sesuai++;

            }

            else if (
                result.status ===
                "TIDAK SESUAI"
            ) {

                output.tidakSesuai.push(
                    result
                );

                output.summary.tidakSesuai++;

            }

            else {

                output.invalid.push(
                    result
                );

                output.summary.invalid++;

            }

        }


        return output;

    }


    /* =====================================================
       CREATE EXPORT ROW
       
       Ticket = TT Number
    ===================================================== */

    function toExportRow(
        result
    ) {

        if (!result) {

            return null;

        }


        /*
         * Jangan export tanpa TT Number.
         */

        if (
            !result.ticket ||
            !String(
                result.ticket
            ).trim()
        ) {

            return null;

        }


        return {

            "TT Number":
                result.ticket,

            "Datetime Receive":
                result.receiveDateFormatted,

            "TT Release":
                result.releaseDateTime,

            "Release Raw":
                result.releaseRaw,

            "Status":
                result.status,

            "Keterangan":
                result.reason

        };

    }


    /* =====================================================
       EXPORT SESUAI
    ===================================================== */

    function exportSesuaiRows(
        results
    ) {

        if (
            !Array.isArray(
                results
            )
        ) {

            return [];

        }


        return results

            .filter(
                function (item) {

                    return (

                        item &&

                        item.status ===
                        "SESUAI"

                        &&

                        item.ticket

                    );

                }
            )

            .map(
                toExportRow
            )

            .filter(Boolean);

    }


    /* =====================================================
       EXPORT TIDAK SESUAI
    ===================================================== */

    function exportTidakSesuaiRows(
        results
    ) {

        if (
            !Array.isArray(
                results
            )
        ) {

            return [];

        }


        return results

            .filter(
                function (item) {

                    return (

                        item &&

                        item.status ===
                        "TIDAK SESUAI"

                        &&

                        item.ticket

                    );

                }
            )

            .map(
                toExportRow
            )

            .filter(Boolean);

    }


    /* =====================================================
       GET SUMMARY
    ===================================================== */

    function getSummary(
        results
    ) {

        const split =
            splitResults(
                results
            );


        return split.summary;

    }


    /* =====================================================
       PUBLIC API
    ===================================================== */

    window.ReportCheckerValidator = {

        /*
         * Main validation
         */

        validate:
            validateRow,


        /*
         * Multiple rows
         */

        validateRows:
            validateRows,


        /*
         * Cari TT Release
         */

        findRelease:
            findReleaseInCir,


        /*
         * Parse Excel date
         */

        parseDate:
            parseExcelDate,


        /*
         * Format date
         */

        formatDate:
            formatDate,


        /*
         * Format datetime
         */

        formatDateTime:
            formatDateTime,


        /*
         * Compare date
         */

        compareDate:
            compareDateOnly,


        /*
         * Compare datetime
         */

        compareDateTime:
            compareDateTime,


        /*
         * Ambil TT Number
         */

        getTTNumber:
            getTTNumber,


        /*
         * Ambil release phrases
         */

        getReleasePhrases:
            getReleasePhrases,


        /*
         * Check release keyword
         */

        hasReleaseKeyword:
            hasReleaseKeyword,


        /*
         * Pisahkan hasil
         */

        split:
            splitResults,


        /*
         * Summary
         */

        summary:
            getSummary,


        /*
         * Export rows
         */

        exportSesuai:
            exportSesuaiRows,

        exportTidakSesuai:
            exportTidakSesuaiRows,


        /*
         * Default settings
         */

        settings:
            DEFAULT_SETTINGS

    };


    /* =====================================================
       DEBUG
    ===================================================== */

    console.log(
        "ReportCheckerValidator loaded.",
        {

            releasePhrases:
                getReleasePhrases(),

            validationType:
                getSettings()
                    .validationType,

            maxReleaseMinutes:
                getSettings()
                    .maxReleaseMinutes,

            ticketSource:
                'row["TT Number"]'

        }
    );


})();
