/* =========================================================
   REPORT CHECKER
   validator.js

   Fungsi utama:
   1. Membaca Datetime Receive dari Excel
   2. Membaca TT Release dari CIR
   3. Membandingkan tanggal release dengan tanggal receive
   4. Menentukan SESUAI / TIDAK SESUAI
   5. Mengambil waktu release
   6. Memastikan setiap hasil mempunyai Ticket
   7. Menyediakan data siap export

   ATURAN DEFAULT:

   Jika TT Release ditemukan:
      - tanggal sama dengan Datetime Receive
        => SESUAI

      - tanggal berbeda
        => TIDAK SESUAI

   Jika TT Release tidak ditemukan:
      => TIDAK SESUAI

   Jika Ticket kosong:
      => INVALID / NO TICKET
========================================================= */

(function () {

    "use strict";


    /* =====================================================
       DEFAULT SETTINGS
    ===================================================== */

    const DEFAULT_SETTINGS = {

        releaseKeywords: [
            "TT Release",
            "TT release",
            "TT RELEASE",
            "TT Release :",
            "TT Release:"
        ],

        /*
         * Format tanggal yang didukung:
         *
         * 31/08/2026 11:43 TT Release
         * 31-08-2026 11:43 TT Release
         * 2026-08-31 11:43 TT Release
         */

        timezone:
            "Asia/Jakarta"

    };


    /* =====================================================
       GET SETTINGS
    ===================================================== */

    function getSettings() {

        if (
            window.ReportCheckerSettings &&
            typeof window.ReportCheckerSettings.get ===
                "function"
        ) {

            return {

                ...DEFAULT_SETTINGS,

                ...window.ReportCheckerSettings.get()

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
            typeof value ===
            "number"
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


            return new Date(
                excelEpoch.getTime() +
                milliseconds
            );

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

            return new Date(
                Number(match[1]),
                Number(match[2]) - 1,
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

            return new Date(
                Number(match[3]),
                Number(match[2]) - 1,
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
                /^(\d{1,2})-(\d{1,2})-(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2})?)?)?/
            );


        if (match) {

            return new Date(
                Number(match[3]),
                Number(match[2]) - 1,
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
       PARSE CIR RELEASE DATETIME
       
       Contoh:

       31/08/2026 11:43 TT Release

       31/08/2026 11:43 TT Release
       TT Release

       31-08-2026 11:43 TT Release
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


        const settings =
            getSettings();


        let hasReleaseKeyword =
            false;


        for (
            const keyword of
            settings.releaseKeywords || []
        ) {

            if (
                text
                    .toLowerCase()
                    .includes(
                        String(keyword)
                            .toLowerCase()
                    )
            ) {

                hasReleaseKeyword =
                    true;

                break;

            }

        }


        if (
            !hasReleaseKeyword
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
                    new Date(
                        Number(match[3]),
                        Number(match[2]) - 1,
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
                    new Date(
                        Number(match[3]),
                        Number(match[2]) - 1,
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
                    new Date(
                        Number(match[1]),
                        Number(match[2]) - 1,
                        Number(match[3]),
                        Number(match[4]),
                        Number(match[5]),
                        Number(match[6] || 0)
                    ),

                raw:
                    text

            };

        }


        return {

            date:
                null,

            raw:
                text

        };

    }


    /* =====================================================
       FIND RELEASE IN CIR
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
                    ""

            };

        }


        const lines =
            text.split("\n");


        /*
         * Cari semua release.
         */

        const releases = [];


        for (
            let i = 0;
            i < lines.length;
            i++
        ) {

            const parsed =
                parseReleaseFromLine(
                    lines[i]
                );


            if (
                parsed
            ) {

                releases.push({

                    ...parsed,

                    lineIndex:
                        i,

                    line:
                        lines[i]

                });

            }

        }


        /*
         * Tidak ditemukan.
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
         * Jika ada beberapa TT Release,
         * gunakan release terakhir.
         *
         * Ini biasanya paling aman untuk report
         * yang mengalami update berkali-kali.
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
            releaseDate.getFullYear() &&

            receiveDate.getMonth() ===
            releaseDate.getMonth() &&

            receiveDate.getDate() ===
            releaseDate.getDate()
        );

    }


    /* =====================================================
       COMPARE DATETIME
       
       Optional helper.
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
       VALIDATE ONE ROW
    ===================================================== */

    function validateRow(
        row,
        options
    ) {

        options =
            options || {};


        const ticket =
            String(
                row?.["Customer Ticket"] ||
                row?.["TT Number"] ||
                row?.["Ticket"] ||
                ""
            ).trim();


        const cir =
            row?.["CIR"] ||
            "";


        const datetimeReceiveValue =
            row?.["Datetime Receive"] ||
            "";


        const result = {

            ticket:
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
           TICKET CHECK
        ================================================= */

        if (!ticket) {

            result.status =
                "INVALID";

            result.reason =
                "Ticket tidak ditemukan.";

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
           FIND TT RELEASE
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


        if (!release.date) {

            result.status =
                "TIDAK SESUAI";

            result.reason =
                "TT Release ditemukan tetapi tanggal tidak dapat dibaca.";

            return result;

        }


        /* =================================================
           COMPARE
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
            !Array.isArray(results)
        ) {

            return output;

        }


        for (
            const result of results
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
       
       Dipakai nanti oleh Excel exporter.
    ===================================================== */

    function toExportRow(
        result
    ) {

        if (!result) {

            return null;

        }


        /*
         * Jangan export data tanpa Ticket.
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

            "Ticket":
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
            !Array.isArray(results)
        ) {

            return [];

        }


        return results
            .filter(
                function (item) {

                    return (
                        item &&
                        item.status ===
                        "SESUAI" &&
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
            !Array.isArray(results)
        ) {

            return [];

        }


        return results
            .filter(
                function (item) {

                    return (
                        item &&
                        item.status ===
                        "TIDAK SESUAI" &&
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


})();
