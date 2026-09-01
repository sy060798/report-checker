/* =========================================================
   REPORT CHECKER
   validator.js

   UPDATE:
   1. Ticket utama WAJIB diambil dari kolom "TT Number"
   2. Tidak lagi menggunakan Customer Ticket / Ref Ticket
   3. Membaca Datetime Receive dari Excel
   4. Membaca TT Release dari CIR
   5. Membandingkan tanggal release dengan tanggal receive
   6. Menentukan SESUAI / TIDAK SESUAI
   7. Mengambil waktu release
   8. Memastikan setiap hasil mempunyai TT Number
   9. Menyediakan data siap export

   ATURAN:

   TT Number:
      - Ambil hanya dari kolom "TT Number"
      - Jika kosong => INVALID

   TT Release:
      - Dicari di dalam CIR
      - Case insensitive
      - Format CIR fleksibel
      - TT Release boleh berada satu baris dengan tanggal
      - TT Release boleh berada sebelum / sesudah tanggal
      - Jarak tanggal maksimal 3 baris

   Jika TT Release ditemukan:
      - tanggal sama dengan Datetime Receive
        => SESUAI

      - tanggal berbeda
        => TIDAK SESUAI

   Jika TT Release tidak ditemukan:
      => TIDAK SESUAI
========================================================= */

(function () {

    "use strict";


    /* =====================================================
       DEFAULT SETTINGS
    ===================================================== */

    const DEFAULT_SETTINGS = {

        releaseKeywords: [
            "TT Release",
            "Ticket Release"
        ],

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
         * Cegah tanggal invalid seperti:
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
       CHECK RELEASE KEYWORD
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


        const settings =
            getSettings();


        const lowerText =
            value.toLowerCase();


        for (
            const keyword of
            settings.releaseKeywords || []
        ) {

            if (!keyword) {

                continue;

            }


            const lowerKeyword =
                String(keyword)
                    .toLowerCase()
                    .trim();


            if (!lowerKeyword) {

                continue;

            }


            if (
                lowerText.includes(
                    lowerKeyword
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
         * tetapi tanggal tidak ada di baris ini.
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
       
       Mendukung format CIR fleksibel.

       Contoh:

       ====CIR====
       21//08/2026 19:07 TT RELEASE

       =====CIR=====
       18/08/2026 19:35 TT release

       =====CIR=====

       12/08/2026 11:42 TT onsite

       Prinsip:
       - CIR harus ada
       - Setelah CIR, cari TT Release
       - Case insensitive
       - Tanggal boleh sebelum / sesudah TT Release
       - Jarak maksimal 3 baris
       - Ambil release terakhir jika ada beberapa
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
         * Cari semua baris yang mengandung
         * TT Release.
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
             * Coba ambil tanggal dari
             * baris TT Release itu sendiri.
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
             * Jika tanggal tidak berada di
             * baris yang sama, cari sekitar
             * TT Release.
             *
             * Maksimal 3 baris.
             */


            const maxDistance =
                3;


            let foundDate =
                null;


            /*
             * Prioritas:
             * 1. Setelah TT Release
             */

            for (
                let offset = 1;
                offset <= maxDistance;
                offset++
            ) {

                const index =
                    i + offset;


                if (
                    index >= lines.length
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
             * 2. Kalau belum ketemu,
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
         * Tidak ada TT Release.
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
            releaseDate.getFullYear() &&

            receiveDate.getMonth() ===
            releaseDate.getMonth() &&

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
       
       PENTING:
       Ticket sekarang HANYA dari:
       
       "TT Number"

       Tidak fallback ke:
       - Customer Ticket
       - Ref Ticket
       - Ticket
    ===================================================== */

    function getTTNumber(
        row
    ) {

        if (
            !row
        ) {

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

            /*
             * Ticket sekarang adalah TT Number
             */

            ticket:
                ticket,

            /*
             * Simpan juga secara eksplisit
             * supaya mudah digunakan oleh app/export.
             */

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
       
       Ticket = TT Number
    ===================================================== */

    function toExportRow(
        result
    ) {

        if (!result) {

            return null;

        }


        /*
         * Jangan export data tanpa TT Number.
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
         * Ambil TT Number
         */

        getTTNumber:
            getTTNumber,

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
