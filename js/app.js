/* =========================================================
   REPORT CHECKER
   app.js
   ---------------------------------------------------------
   UPDATE:
   - MATERIAL / MATRIAL / MATERRIAL / MATREIAL mengikuti
     settings.js -> materialKeywords
   - Material diambil dari blok setelah header MATERIAL
   - Tidak hard-code keyword MATERIAL
   - Sinkron dengan material-parser.js
   - Ticket utama = TT Number
   - Validasi menggunakan validator.js
   - Material ditampilkan di tab Material
   - Material error ditampilkan di tab Material Error
   - Pagination
   - Download Excel
========================================================= */

(function () {

    "use strict";


    /* =====================================================
       STATE
    ====================================================== */

    let selectedFile = null;

    let currentRows = [];

    let validationResults = [];

    let materialResults = [];

    let materialErrorResults = [];

    const PAGE_SIZE = 25;

    const pages = {
        valid: 1,
        invalid: 1,
        material: 1,
        materialError: 1
    };


    /* =====================================================
       ELEMENT
    ====================================================== */

    const $ = function (id) {
        return document.getElementById(id);
    };


    /* =====================================================
       TEXT HELPER
    ====================================================== */

    function cleanText(value) {

        if (
            value === null ||
            value === undefined
        ) {
            return "";
        }

        return String(value)
            .replace(/\u00A0/g, " ")
            .replace(/\r/g, "")
            .trim();

    }


    function normalizeText(value) {

        return cleanText(value)
            .replace(/\s+/g, " ")
            .toLowerCase();

    }


    /* =====================================================
       SETTINGS
    ====================================================== */

    function getSettings() {

        if (
            window.ReportCheckerSettings &&
            typeof window.ReportCheckerSettings.get ===
                "function"
        ) {

            return window.ReportCheckerSettings.get();

        }


        if (
            window.getParserSettings &&
            typeof window.getParserSettings ===
                "function"
        ) {

            return window.getParserSettings();

        }


        return {

            materialNames: [],

            materialKeywords: []

        };

    }


    /* =====================================================
       MATERIAL HEADER
       
       CONTOH YANG BISA DIKENALI:
       
       MATERIAL
       MATERIAL :
       MATERIAL;
       MATERIAL ;
       MATRIAL
       MATRIAL :
       MATERRIAL
       MATERRIAL :
       MATREIAL
       
       Semua mengikuti materialKeywords
       dari settings.js.
    ====================================================== */

    function isMaterialHeader(line) {

        const text =
            normalizeText(line)
                .replace(/[;:]+$/g, "")
                .trim();


        if (!text) {
            return false;
        }


        const settings =
            getSettings();


        const keywords =
            Array.isArray(
                settings.materialKeywords
            )
                ? settings.materialKeywords
                : [];


        for (
            const keyword
            of keywords
        ) {

            const normalizedKeyword =
                normalizeText(keyword)
                    .replace(/[;:]+$/g, "")
                    .trim();


            if (!normalizedKeyword) {
                continue;
            }


            if (
                text ===
                normalizedKeyword
            ) {

                return true;

            }

        }


        return false;

    }


    /* =====================================================
       EXTRACT MATERIAL BLOCKS
       
       Fungsi ini mencari semua header MATERIAL
       dan mengambil baris di bawahnya.
       
       Berhenti jika menemukan header section berikutnya.
    ====================================================== */

    function extractMaterialBlocks(cirText) {

        const text =
            cleanText(cirText);


        if (!text) {
            return [];
        }


        const lines =
            text.split(/\r?\n/);


        const blocks = [];

        let currentBlock = null;


        for (
            let i = 0;
            i < lines.length;
            i++
        ) {

            const rawLine =
                lines[i];


            const line =
                cleanText(rawLine);


            if (
                isMaterialHeader(line)
            ) {

                if (currentBlock) {

                    blocks.push(
                        currentBlock
                    );

                }


                currentBlock = {

                    header:
                        line,

                    headerIndex:
                        i,

                    lines: []

                };


                continue;

            }


            if (!currentBlock) {
                continue;
            }


            /*
             * Baris kosong tetap boleh berada
             * di dalam blok MATERIAL.
             */

            if (!line) {

                currentBlock.lines.push(
                    ""
                );

                continue;

            }


            /*
             * Jika bertemu header umum lain,
             * blok material selesai.
             */

            const normalized =
                normalizeText(line);


            const sectionHeaders = [

                "customer",
                "customer information",
                "ticket",
                "ticket information",
                "problem",
                "problem description",
                "action",
                "action taken",
                "solution",
                "remark",
                "remarks",
                "evidence",
                "history",
                "attachment",
                "status"

            ];


            if (
                sectionHeaders.includes(
                    normalized
                )
            ) {

                blocks.push(
                    currentBlock
                );

                currentBlock = null;

                continue;

            }


            currentBlock.lines.push(
                line
            );

        }


        if (currentBlock) {

            blocks.push(
                currentBlock
            );

        }


        return blocks;

    }


    /* =====================================================
       PARSE MATERIAL BARIS
       
       Contoh:
       
       PROTEC : 24 PCS
       TIES : 6 PCS
       KABEL 48 F : 102 M
       JB NEW : 2 PCS
       DEAT AND : 2 PCS
       
       Hasil sementara:
       
       {
           raw: "PROTEC : 24 PCS",
           name: "PROTEC",
           qty: 24,
           unit: "PCS"
       }
    ====================================================== */

    function parseMaterialLine(line) {

        const text =
            cleanText(line);


        if (!text) {
            return null;
        }


        /*
         * Baris SN tidak dianggap material
         * kecuali material parser yang menentukan.
         */

        if (
            /^SN\s*:/i.test(text)
        ) {

            return null;

        }


        /*
         * AWAL / AKHIR biasanya bukan material.
         */

        if (
            /^(AWAL|AKHIR)\s*:/i.test(text)
        ) {

            return null;

        }


        /*
         * Format:
         *
         * NAME : QTY UNIT
         */

        let match =
            text.match(
                /^(.+?)\s*:\s*([0-9]+(?:[.,][0-9]+)?)\s*([A-Za-z]+)?\s*$/i
            );


        if (!match) {

            /*
             * Format tanpa ":":
             *
             * PROTEC 24 PCS
             */

            match =
                text.match(
                    /^(.+?)\s+([0-9]+(?:[.,][0-9]+)?)\s*([A-Za-z]+)?\s*$/i
                );

        }


        if (!match) {

            return {

                raw:
                    text,

                name:
                    text,

                qty:
                    null,

                unit:
                    "",

                code:
                    "",

                parsed:
                    false

            };

        }


        let name;

        let qty;

        let unit;


        /*
         * Karena regex pertama:
         *
         * group 1 = name
         * group 2 = qty
         * group 3 = unit
         */

        name =
            cleanText(
                match[1]
            );


        qty =
            Number(
                String(
                    match[2]
                ).replace(
                    ",",
                    "."
                )
            );


        unit =
            cleanText(
                match[3] || ""
            ).toUpperCase();


        return {

            raw:
                text,

            name:
                name,

            qty:
                Number.isNaN(qty)
                    ? null
                    : qty,

            unit:
                unit,

            code:
                "",

            parsed:
                true

        };

    }


    /* =====================================================
       FALLBACK MATERIAL PARSER
       
       Dipakai jika material-parser.js belum menyediakan
       API yang sesuai.
    ====================================================== */

    function fallbackParseMaterial(
        ticket,
        cirText
    ) {

        const blocks =
            extractMaterialBlocks(
                cirText
            );


        const results = [];


        const settings =
            getSettings();


        const materialNames =
            Array.isArray(
                settings.materialNames
            )
                ? settings.materialNames
                : [];


        /*
         * Ambil frasa dari HTML.
         *
         * Format:
         *
         * Pigtail : pigtail, pigtal
         */

        const phraseMap =
            buildMaterialPhraseMap(
                settings
            );


        for (
            const block
            of blocks
        ) {

            for (
                const line
                of block.lines
            ) {

                const parsed =
                    parseMaterialLine(
                        line
                    );


                if (!parsed) {
                    continue;
                }


                /*
                 * Cari material resmi.
                 */

                const matched =
                    matchMaterialName(
                        parsed.name,
                        materialNames,
                        phraseMap
                    );


                if (matched) {

                    results.push({

                        ticket:
                            ticket,

                        material:
                            matched,

                        qty:
                            parsed.qty,

                        satuan:
                            parsed.unit,

                        unit:
                            parsed.unit,

                        kode:
                            parsed.code,

                        code:
                            parsed.code,

                        raw:
                            parsed.raw,

                        error:
                            ""

                    });

                }
                else {

                    /*
                     * Jangan masukkan AWAL,
                     * AKHIR, SN, atau baris non-material
                     * sebagai Material Error.
                     */

                    if (
                        isIgnorableMaterialLine(
                            parsed.name
                        )
                    ) {

                        continue;

                    }


                    results.push({

                        ticket:
                            ticket,

                        material:
                            parsed.name,

                        qty:
                            parsed.qty,

                        satuan:
                            parsed.unit,

                        unit:
                            parsed.unit,

                        kode:
                            parsed.code,

                        code:
                            parsed.code,

                        raw:
                            parsed.raw,

                        error:
                            "Material tidak ditemukan di Daftar Nama Material / Frasa."

                    });

                }

            }

        }


        return results;

    }


    /* =====================================================
       BUILD MATERIAL PHRASE MAP
       
       HTML:
       
       Pigtail : pigtail, pigtal, pigtel
       Patchcord : patch cord, patchcord
    ====================================================== */

    function buildMaterialPhraseMap(
        settings
    ) {

        const map = [];


        /*
         * Ambil textarea langsung.
         */

        const textarea =
            $("materialPhrases");


        let lines = [];


        if (textarea) {

            lines =
                textarea.value
                    .split(/\r?\n/)
                    .map(cleanText)
                    .filter(Boolean);

        }


        /*
         * Jika textarea kosong,
         * coba ambil dari settings.
         */

        if (
            lines.length === 0 &&
            Array.isArray(
                settings.materialPhrases
            )
        ) {

            lines =
                settings.materialPhrases
                    .map(cleanText)
                    .filter(Boolean);

        }


        for (
            const line
            of lines
        ) {

            const separatorIndex =
                line.indexOf(":");


            if (
                separatorIndex < 0
            ) {

                continue;

            }


            const officialName =
                cleanText(
                    line.slice(
                        0,
                        separatorIndex
                    )
                );


            const phrasesText =
                cleanText(
                    line.slice(
                        separatorIndex + 1
                    )
                );


            if (
                !officialName ||
                !phrasesText
            ) {

                continue;

            }


            const phrases =
                phrasesText
                    .split(",")
                    .map(cleanText)
                    .filter(Boolean);


            map.push({

                official:
                    officialName,

                phrases:
                    [
                        officialName,
                        ...phrases
                    ]

            });

        }


        return map;

    }


    /* =====================================================
       MATCH MATERIAL
    ====================================================== */

    function matchMaterialName(
        input,
        materialNames,
        phraseMap
    ) {

        const value =
            normalizeText(
                input
            );


        if (!value) {
            return null;
        }


        /*
         * 1. Exact official name
         */

        for (
            const official
            of materialNames
        ) {

            if (
                normalizeText(
                    official
                ) === value
            ) {

                return official;

            }

        }


        /*
         * 2. Phrase map
         */

        for (
            const item
            of phraseMap
        ) {

            for (
                const phrase
                of item.phrases
            ) {

                if (
                    normalizeText(
                        phrase
                    ) === value
                ) {

                    return item.official;

                }

            }

        }


        /*
         * 3. Contains phrase
         *
         * Berguna untuk:
         *
         * DEAT AND
         * Dead End
         *
         * jika phrase sudah diatur.
         */

        for (
            const item
            of phraseMap
        ) {

            for (
                const phrase
                of item.phrases
            ) {

                const normalizedPhrase =
                    normalizeText(
                        phrase
                    );


                if (
                    normalizedPhrase &&
                    value.includes(
                        normalizedPhrase
                    )
                ) {

                    return item.official;

                }

            }

        }


        /*
         * 4. Fuzzy sederhana
         *
         * Hanya jika material resmi cukup dekat.
         */

        let best =
            null;

        let bestScore =
            0;


        for (
            const official
            of materialNames
        ) {

            const score =
                similarityScore(
                    value,
                    normalizeText(
                        official
                    )
                );


            if (
                score > bestScore
            ) {

                bestScore =
                    score;

                best =
                    official;

            }

        }


        if (
            best &&
            bestScore >= 0.82
        ) {

            return best;

        }


        return null;

    }


    /* =====================================================
       SIMPLE SIMILARITY
    ====================================================== */

    function similarityScore(
        a,
        b
    ) {

        if (!a || !b) {
            return 0;
        }


        if (a === b) {
            return 1;
        }


        const maxLength =
            Math.max(
                a.length,
                b.length
            );


        if (!maxLength) {
            return 1;
        }


        const distance =
            levenshteinDistance(
                a,
                b
            );


        return (
            1 -
            distance /
            maxLength
        );

    }


    function levenshteinDistance(
        a,
        b
    ) {

        const matrix = [];


        for (
            let i = 0;
            i <= b.length;
            i++
        ) {

            matrix[i] = [i];

        }


        for (
            let j = 0;
            j <= a.length;
            j++
        ) {

            matrix[0][j] =
                j;

        }


        for (
            let i = 1;
            i <= b.length;
            i++
        ) {

            for (
                let j = 1;
                j <= a.length;
                j++
            ) {

                if (
                    b.charAt(i - 1) ===
                    a.charAt(j - 1)
                ) {

                    matrix[i][j] =
                        matrix[i - 1][j - 1];

                }
                else {

                    matrix[i][j] =
                        Math.min(

                            matrix[i - 1][j - 1] + 1,

                            matrix[i][j - 1] + 1,

                            matrix[i - 1][j] + 1

                        );

                }

            }

        }


        return matrix[
            b.length
        ][
            a.length
        ];

    }


    /* =====================================================
       IGNORE NON MATERIAL
    ====================================================== */

    function isIgnorableMaterialLine(
        name
    ) {

        const value =
            normalizeText(
                name
            );


        if (!value) {
            return true;
        }


        const ignored = [

            "awal",
            "akhir",
            "sn",
            "serial number",
            "serial no",
            "no sn",
            "keterangan",
            "remark",
            "remarks"

        ];


        return ignored.includes(
            value
        );

    }


    /* =====================================================
       CALL MATERIAL PARSER
       
       Jika material-parser.js punya API,
       gunakan API tersebut terlebih dahulu.
    ====================================================== */

    function parseMaterials(
        ticket,
        cirText,
        row
    ) {

        const parser =
            window.ReportCheckerMaterialParser;


        /*
         * API umum.
         */

        if (
            parser &&
            typeof parser.parse ===
                "function"
        ) {

            try {

                const result =
                    parser.parse(
                        cirText,
                        row,
                        getSettings()
                    );


                if (
                    Array.isArray(result)
                ) {

                    return normalizeMaterialResults(
                        result,
                        ticket
                    );

                }


            }
            catch (error) {

                console.warn(
                    "Material parser gagal, menggunakan fallback:",
                    error
                );

            }

        }


        /*
         * API alternatif.
         */

        if (
            parser &&
            typeof parser.parseMaterial ===
                "function"
        ) {

            try {

                const result =
                    parser.parseMaterial(
                        cirText,
                        row,
                        getSettings()
                    );


                if (
                    Array.isArray(result)
                ) {

                    return normalizeMaterialResults(
                        result,
                        ticket
                    );

                }

            }
            catch (error) {

                console.warn(
                    "parseMaterial gagal:",
                    error
                );

            }

        }


        /*
         * Fallback.
         */

        return fallbackParseMaterial(
            ticket,
            cirText
        );

    }


    /* =====================================================
       NORMALIZE MATERIAL RESULTS
    ====================================================== */

    function normalizeMaterialResults(
        results,
        ticket
    ) {

        return results.map(
            function (item) {

                const material =
                    item.material ||
                    item.name ||
                    item.nama ||
                    "";


                const qty =
                    item.qty ??
                    item.quantity ??
                    item.jumlah ??
                    "";


                const satuan =
                    item.satuan ||
                    item.unit ||
                    item.uom ||
                    "";


                const kode =
                    item.kode ||
                    item.code ||
                    "";


                const error =
                    item.error ||
                    item.message ||
                    "";


                return {

                    ticket:
                        item.ticket ||
                        ticket,

                    material:
                        cleanText(
                            material
                        ),

                    qty:
                        qty,

                    satuan:
                        cleanText(
                            satuan
                        ),

                    unit:
                        cleanText(
                            satuan
                        ),

                    kode:
                        cleanText(
                            kode
                        ),

                    code:
                        cleanText(
                            kode
                        ),

                    raw:
                        item.raw ||
                        item.original ||
                        "",

                    error:
                        cleanText(
                            error
                        )

                };

            }
        );

    }


    /* =====================================================
       PROCESS MATERIALS
    ====================================================== */

    function processAllMaterials(
        rows
    ) {

        const success = [];

        const errors = [];


        if (
            !Array.isArray(rows)
        ) {

            return {

                success,
                errors

            };

        }


        for (
            const row
            of rows
        ) {

            const ticket =
                getTicket(
                    row
                );


            const cir =
                row?.["CIR"] ||
                "";


            if (!cir) {
                continue;
            }


            const parsed =
                parseMaterials(
                    ticket,
                    cir,
                    row
                );


            if (
                !Array.isArray(
                    parsed
                )
            ) {

                continue;

            }


            for (
                const item
                of parsed
            ) {

                if (!item) {
                    continue;
                }


                /*
                 * Material error jika parser
                 * mengisi error.
                 */

                if (
                    item.error
                ) {

                    errors.push(
                        item
                    );

                }
                else if (
                    item.material
                ) {

                    success.push(
                        item
                    );

                }

            }

        }


        return {

            success,
            errors

        };

    }


    /* =====================================================
       GET TICKET
       
       WAJIB TT Number.
    ====================================================== */

    function getTicket(row) {

        if (!row) {
            return "";
        }


        if (
            window.ReportCheckerValidator &&
            typeof window.ReportCheckerValidator
                .getTTNumber === "function"
        ) {

            return window.ReportCheckerValidator
                .getTTNumber(row);

        }


        return cleanText(
            row["TT Number"]
        );

    }


    /* =====================================================
       EXCEL READ
    ====================================================== */

    function readExcel(
        file
    ) {

        return new Promise(
            function (resolve, reject) {

                if (
                    typeof XLSX ===
                    "undefined"
                ) {

                    reject(
                        new Error(
                            "Library XLSX belum tersedia."
                        )
                    );

                    return;

                }


                const reader =
                    new FileReader();


                reader.onload =
                    function (event) {

                        try {

                            const data =
                                new Uint8Array(
                                    event.target.result
                                );


                            const workbook =
                                XLSX.read(
                                    data,
                                    {
                                        type:
                                            "array",
                                        cellDates:
                                            true
                                    }
                                );


                            const sheetName =
                                workbook
                                    .SheetNames[0];


                            const sheet =
                                workbook
                                    .Sheets[
                                        sheetName
                                    ];


                            const rows =
                                XLSX.utils
                                    .sheet_to_json(
                                        sheet,
                                        {
                                            defval:
                                                "",
                                            raw:
                                                true
                                        }
                                    );


                            resolve(
                                rows
                            );

                        }
                        catch (error) {

                            reject(
                                error
                            );

                        }

                    };


                reader.onerror =
                    function () {

                        reject(
                            new Error(
                                "Gagal membaca file."
                            )
                        );

                    };


                reader.readAsArrayBuffer(
                    file
                );

            }
        );

    }


    /* =====================================================
       VALIDATE
    ====================================================== */

    function validateData(
        rows
    ) {

        if (
            window.ReportCheckerValidator &&
            typeof window.ReportCheckerValidator
                .validateRows === "function"
        ) {

            return window.ReportCheckerValidator
                .validateRows(
                    rows
                );

        }


        console.error(
            "ReportCheckerValidator tidak ditemukan."
        );


        return [];

    }


    /* =====================================================
       UI FILE
    ====================================================== */

    function showSelectedFile(
        file
    ) {

        const selected =
            $("selectedFile");


        const name =
            $("fileName");


        const size =
            $("fileSize");


        if (selected) {

            selected.classList.remove(
                "hidden"
            );

        }


        if (name) {

            name.textContent =
                file.name;

        }


        if (size) {

            size.textContent =
                formatFileSize(
                    file.size
                );

        }

    }


    function hideSelectedFile() {

        const selected =
            $("selectedFile");


        if (selected) {

            selected.classList.add(
                "hidden"
            );

        }

    }


    function formatFileSize(
        bytes
    ) {

        if (!bytes) {
            return "0 B";
        }


        const units = [
            "B",
            "KB",
            "MB",
            "GB"
        ];


        const index =
            Math.floor(
                Math.log(bytes) /
                Math.log(1024)
            );


        return (
            (
                bytes /
                Math.pow(
                    1024,
                    index
                )
            ).toFixed(
                index === 0
                    ? 0
                    : 2
            ) +
            " " +
            units[
                index
            ]
        );

    }


    /* =====================================================
       PROCESSING UI
    ====================================================== */

    function showProcessing(
        title,
        text,
        progress
    ) {

        const box =
            $("processingStatus");


        if (box) {

            box.classList.remove(
                "hidden"
            );

        }


        if ($("processingTitle")) {

            $("processingTitle")
                .textContent =
                title || "Sedang memproses...";

        }


        if ($("processingText")) {

            $("processingText")
                .textContent =
                text || "Memproses data...";

        }


        if ($("processingProgress")) {

            $("processingProgress")
                .textContent =
                (
                    Number(
                        progress || 0
                    )
                ) +
                "%";

        }

    }


    function hideProcessing() {

        const box =
            $("processingStatus");


        if (box) {

            box.classList.add(
                "hidden"
            );

        }

    }


    /* =====================================================
       SYSTEM STATUS
    ====================================================== */

    function setSystemStatus(
        text,
        type
    ) {

        const status =
            $("systemStatus");


        if (!status) {
            return;
        }


        status.textContent =
            text;


        status.classList.remove(
            "offline",
            "online",
            "warning"
        );


        status.classList.add(
            type || "online"
        );

    }


    /* =====================================================
       DASHBOARD
    ====================================================== */

    function showDashboard() {

        const section =
            $("dashboardSection");


        if (section) {

            section.classList.remove(
                "hidden"
            );

        }

    }


    function updateDashboard() {

        const valid =
            validationResults.filter(
                item =>
                    item &&
                    item.status ===
                    "SESUAI"
            );


        const invalid =
            validationResults.filter(
                item =>
                    item &&
                    item.status ===
                    "TIDAK SESUAI"
            );


        setText(
            "totalCount",
            validationResults.length
        );


        setText(
            "validCount",
            valid.length
        );


        setText(
            "invalidCount",
            invalid.length
        );


        setText(
            "materialCount",
            materialResults.length
        );


        setText(
            "materialErrorCount",
            materialErrorResults.length
        );


        setText(
            "validTabCount",
            valid.length
        );


        setText(
            "invalidTabCount",
            invalid.length
        );


        setText(
            "materialTabCount",
            materialResults.length
        );


        setText(
            "materialErrorTabCount",
            materialErrorResults.length
        );


        const summary =
            `${validationResults.length} data diperiksa • ` +
            `${valid.length} sesuai • ` +
            `${invalid.length} tidak sesuai • ` +
            `${materialResults.length} material`;


        setText(
            "resultSummary",
            summary
        );

    }


    function setText(
        id,
        value
    ) {

        const element =
            $(id);


        if (element) {

            element.textContent =
                value;

        }

    }


    /* =====================================================
       TABLE RENDER
    ====================================================== */

    function renderTables() {

        renderValidationTable(
            "valid",
            validationResults.filter(
                item =>
                    item.status ===
                    "SESUAI"
            )
        );


        renderValidationTable(
            "invalid",
            validationResults.filter(
                item =>
                    item.status ===
                    "TIDAK SESUAI"
            )
        );


        renderMaterialTable(
            "material",
            materialResults
        );


        renderMaterialTable(
            "materialError",
            materialErrorResults
        );

    }


    function renderValidationTable(
        type,
        data
    ) {

        const body =
            type === "valid"
                ? $("validTableBody")
                : $("invalidTableBody");


        const empty =
            type === "valid"
                ? $("validEmpty")
                : $("invalidEmpty");


        const page =
            pages[
                type
            ];


        const totalPages =
            Math.max(
                1,
                Math.ceil(
                    data.length /
                    PAGE_SIZE
                )
            );


        const currentPage =
            Math.min(
                page,
                totalPages
            );


        pages[type] =
            currentPage;


        if (body) {

            body.innerHTML = "";

        }


        const start =
            (
                currentPage - 1
            ) *
            PAGE_SIZE;


        const visible =
            data.slice(
                start,
                start +
                PAGE_SIZE
            );


        if (
            empty
        ) {

            empty.classList.toggle(
                "hidden",
                data.length > 0
            );

        }


        if (body) {

            visible.forEach(
                function (item) {

                    const tr =
                        document.createElement(
                            "tr"
                        );


                    addCell(
                        tr,
                        item.ticket
                    );


                    addCell(
                        tr,
                        item.receiveDateFormatted
                    );


                    addCell(
                        tr,
                        item.releaseDateTime
                    );


                    const statusCell =
                        addCell(
                            tr,
                            item.status
                        );


                    if (
                        item.status ===
                        "SESUAI"
                    ) {

                        statusCell.classList.add(
                            "status-success"
                        );

                    }
                    else {

                        statusCell.classList.add(
                            "status-danger"
                        );

                    }


                    addCell(
                        tr,
                        item.reason
                    );


                    body.appendChild(
                        tr
                    );

                }
            );

        }


        updatePagination(
            type,
            currentPage,
            totalPages
        );

    }


    function renderMaterialTable(
        type,
        data
    ) {

        const body =
            type === "material"
                ? $("materialTableBody")
                : $("materialErrorTableBody");


        const empty =
            type === "material"
                ? $("materialEmpty")
                : $("materialErrorEmpty");


        const pageKey =
            type === "material"
                ? "material"
                : "materialError";


        const page =
            pages[
                pageKey
            ];


        const totalPages =
            Math.max(
                1,
                Math.ceil(
                    data.length /
                    PAGE_SIZE
                )
            );


        const currentPage =
            Math.min(
                page,
                totalPages
            );


        pages[
            pageKey
        ] =
            currentPage;


        if (body) {

            body.innerHTML = "";

        }


        const start =
            (
                currentPage - 1
            ) *
            PAGE_SIZE;


        const visible =
            data.slice(
                start,
                start +
                PAGE_SIZE
            );


        if (empty) {

            empty.classList.toggle(
                "hidden",
                data.length > 0
            );

        }


        if (body) {

            visible.forEach(
                function (item) {

                    const tr =
                        document.createElement(
                            "tr"
                        );


                    addCell(
                        tr,
                        item.ticket
                    );


                    addCell(
                        tr,
                        item.material
                    );


                    addCell(
                        tr,
                        item.qty
                    );


                    addCell(
                        tr,
                        item.satuan ||
                        item.unit
                    );


                    addCell(
                        tr,
                        item.kode ||
                        item.code
                    );


                    if (
                        type ===
                        "materialError"
                    ) {

                        addCell(
                            tr,
                            item.error
                        );

                    }


                    body.appendChild(
                        tr
                    );

                }
            );

        }


        updatePagination(
            pageKey,
            currentPage,
            totalPages
        );

    }


    function addCell(
        tr,
        value
    ) {

        const td =
            document.createElement(
                "td"
            );


        td.textContent =
            value === null ||
            value === undefined
                ? ""
                : String(value);


        tr.appendChild(
            td
        );


        return td;

    }


    /* =====================================================
       PAGINATION
    ====================================================== */

    function updatePagination(
        type,
        page,
        totalPages
    ) {

        let prefix;


        if (
            type === "valid"
        ) {

            prefix =
                "valid";

        }
        else if (
            type === "invalid"
        ) {

            prefix =
                "invalid";

        }
        else if (
            type === "material"
        ) {

            prefix =
                "material";

        }
        else {

            prefix =
                "materialError";

        }


        setText(
            prefix +
            "PageNumber",
            page
        );


        setText(
            prefix +
            "PageTotal",
            totalPages
        );


        const prev =
            $(
                prefix +
                "PrevBtn"
            );


        const next =
            $(
                prefix +
                "NextBtn"
            );


        if (prev) {

            prev.disabled =
                page <= 1;

        }


        if (next) {

            next.disabled =
                page >= totalPages;

        }

    }


    function changePage(
        type,
        direction
    ) {

        pages[type] +=
            direction;


        if (
            pages[type] < 1
        ) {

            pages[type] = 1;

        }


        renderTables();

    }


    /* =====================================================
       TABS
    ====================================================== */

    function initializeTabs() {

        const buttons =
            document.querySelectorAll(
                ".tab-button"
            );


        buttons.forEach(
            function (button) {

                button.addEventListener(
                    "click",
                    function () {

                        const tab =
                            button.dataset.tab;


                        document
                            .querySelectorAll(
                                ".tab-button"
                            )
                            .forEach(
                                function (item) {

                                    item.classList
                                        .remove(
                                            "active"
                                        );

                                }
                            );


                        document
                            .querySelectorAll(
                                ".tab-content"
                            )
                            .forEach(
                                function (item) {

                                    item.classList
                                        .remove(
                                            "active"
                                        );

                                }
                            );


                        button.classList.add(
                            "active"
                        );


                        const content =
                            $(
                                "tab-" +
                                tab
                            );


                        if (content) {

                            content.classList.add(
                                "active"
                            );

                        }

                    }
                );

            }
        );

    }


    /* =====================================================
       DOWNLOAD EXCEL
    ====================================================== */

    function downloadExcel(
        rows,
        filename
    ) {

        if (
            typeof XLSX ===
            "undefined"
        ) {

            alert(
                "Library Excel belum tersedia."
            );

            return;

        }


        if (
            !Array.isArray(rows) ||
            rows.length === 0
        ) {

            alert(
                "Tidak ada data untuk di-download."
            );

            return;

        }


        const worksheet =
            XLSX.utils
                .json_to_sheet(
                    rows
                );


        const workbook =
            XLSX.utils.book_new();


        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            "Report"
        );


        XLSX.writeFile(
            workbook,
            filename
        );

    }


    /* =====================================================
       EXPORT VALID
    ====================================================== */

    function exportValid() {

        const rows =
            validationResults
                .filter(
                    item =>
                        item.status ===
                        "SESUAI" &&
                        item.ticket
                )
                .map(
                    function (item) {

                        return {

                            "TT Number":
                                item.ticket,

                            "Datetime Receive":
                                item.receiveDateFormatted,

                            "TT Release":
                                item.releaseDateTime,

                            "Release Raw":
                                item.releaseRaw,

                            "Status":
                                item.status,

                            "Keterangan":
                                item.reason

                        };

                    }
                );


        downloadExcel(
            rows,
            "Sesuai.xlsx"
        );

    }


    /* =====================================================
       EXPORT INVALID
    ====================================================== */

    function exportInvalid() {

        const rows =
            validationResults
                .filter(
                    item =>
                        item.status ===
                        "TIDAK SESUAI" &&
                        item.ticket
                )
                .map(
                    function (item) {

                        return {

                            "TT Number":
                                item.ticket,

                            "Datetime Receive":
                                item.receiveDateFormatted,

                            "TT Release":
                                item.releaseDateTime,

                            "Release Raw":
                                item.releaseRaw,

                            "Status":
                                item.status,

                            "Keterangan":
                                item.reason

                        };

                    }
                );


        downloadExcel(
            rows,
            "Tidak Sesuai.xlsx"
        );

    }


    /* =====================================================
       EXPORT MATERIAL
    ====================================================== */

    function exportMaterials() {

        const rows =
            materialResults.map(
                function (item) {

                    return {

                        "TT Number":
                            item.ticket,

                        "Material":
                            item.material,

                        "Qty":
                            item.qty,

                        "Satuan":
                            item.satuan ||
                            item.unit,

                        "Kode":
                            item.kode ||
                            item.code

                    };

                }
            );


        downloadExcel(
            rows,
            "Material.xlsx"
        );

    }


    /* =====================================================
       EXPORT MATERIAL ERROR
    ====================================================== */

    function exportMaterialErrors() {

        const rows =
            materialErrorResults.map(
                function (item) {

                    return {

                        "TT Number":
                            item.ticket,

                        "Material":
                            item.material,

                        "Qty":
                            item.qty,

                        "Satuan":
                            item.satuan ||
                            item.unit,

                        "Kode":
                            item.kode ||
                            item.code,

                        "Error":
                            item.error

                    };

                }
            );


        downloadExcel(
            rows,
            "Material Error.xlsx"
        );

    }


    /* =====================================================
       BUTTON STATE
    ====================================================== */

    function updateDownloadButtons() {

        const validButton =
            $("downloadValidBtn");


        const invalidButton =
            $("downloadInvalidBtn");


        const materialButton =
            $("downloadMaterialBtn");


        const materialErrorButton =
            $("downloadMaterialErrorBtn");


        if (validButton) {

            validButton.disabled =
                !validationResults.some(
                    item =>
                        item.status ===
                        "SESUAI"
                );

        }


        if (invalidButton) {

            invalidButton.disabled =
                !validationResults.some(
                    item =>
                        item.status ===
                        "TIDAK SESUAI"
                );

        }


        if (materialButton) {

            materialButton.disabled =
                materialResults.length === 0;

        }


        if (materialErrorButton) {

            materialErrorButton.disabled =
                materialErrorResults.length === 0;

        }

    }


    /* =====================================================
       PROCESS FILE
    ====================================================== */

    async function processFile() {

        if (!selectedFile) {

            alert(
                "Silakan pilih file Excel terlebih dahulu."
            );

            return;

        }


        const processButton =
            $("processBtn");


        if (processButton) {

            processButton.disabled =
                true;

        }


        try {

            setSystemStatus(
                "Processing",
                "warning"
            );


            showProcessing(
                "Membaca Excel...",
                "Membaca data dari file.",
                10
            );


            currentRows =
                await readExcel(
                    selectedFile
                );


            showProcessing(
                "Validasi Ticket...",
                "Memeriksa TT Number, Datetime Receive dan TT Release.",
                40
            );


            validationResults =
                validateData(
                    currentRows
                );


            showProcessing(
                "Parsing Material...",
                "Mencari blok MATERIAL dan membaca material di bawahnya.",
                60
            );


            const materialOutput =
                processAllMaterials(
                    currentRows
                );


            materialResults =
                materialOutput.success;


            materialErrorResults =
                materialOutput.errors;


            showProcessing(
                "Menyiapkan hasil...",
                "Menyusun tabel dan summary.",
                90
            );


            pages.valid = 1;
            pages.invalid = 1;
            pages.material = 1;
            pages.materialError = 1;


            updateDashboard();

            renderTables();

            updateDownloadButtons();

            showDashboard();


            showProcessing(
                "Selesai",
                "Semua data berhasil diproses.",
                100
            );


            setTimeout(
                hideProcessing,
                500
            );


            setSystemStatus(
                "Ready",
                "online"
            );


        }
        catch (error) {

            console.error(
                "Process error:",
                error
            );


            hideProcessing();


            setSystemStatus(
                "Error",
                "offline"
            );


            alert(
                "Gagal memproses Excel:\n\n" +
                (
                    error.message ||
                    error
                )
            );

        }
        finally {

            if (processButton) {

                processButton.disabled =
                    !selectedFile;

            }

        }

    }


    /* =====================================================
       RESET APP
    ====================================================== */

    function resetApp() {

        selectedFile =
            null;


        currentRows =
            [];


        validationResults =
            [];


        materialResults =
            [];


        materialErrorResults =
            [];


        pages.valid = 1;
        pages.invalid = 1;
        pages.material = 1;
        pages.materialError = 1;


        const fileInput =
            $("excelFile");


        if (fileInput) {

            fileInput.value =
                "";

        }


        hideSelectedFile();


        const dashboard =
            $("dashboardSection");


        if (dashboard) {

            dashboard.classList.add(
                "hidden"
            );

        }


        const processButton =
            $("processBtn");


        if (processButton) {

            processButton.disabled =
                true;

        }


        updateDashboard();

        renderTables();

        updateDownloadButtons();


        setSystemStatus(
            "Ready",
            "offline"
        );

    }


    /* =====================================================
       FILE SELECT
    ====================================================== */

    function handleFile(
        file
    ) {

        if (!file) {
            return;
        }


        const validExtensions = [
            ".xlsx",
            ".xls",
            ".xlsm"
        ];


        const name =
            file.name.toLowerCase();


        const valid =
            validExtensions.some(
                extension =>
                    name.endsWith(
                        extension
                    )
            );


        if (!valid) {

            alert(
                "File harus berupa .xlsx, .xls, atau .xlsm."
            );

            return;

        }


        selectedFile =
            file;


        showSelectedFile(
            file
        );


        const processButton =
            $("processBtn");


        if (processButton) {

            processButton.disabled =
                false;

        }


        setSystemStatus(
            "File Ready",
            "online"
        );

    }


    /* =====================================================
       INITIALIZE FILE INPUT
    ====================================================== */

    function initializeFileUpload() {

        const input =
            $("excelFile");


        const dropZone =
            $("dropZone");


        if (input) {

            input.addEventListener(
                "change",
                function (event) {

                    const file =
                        event.target.files[0];


                    handleFile(
                        file
                    );

                }
            );

        }


        if (dropZone) {

            dropZone.addEventListener(
                "click",
                function () {

                    if (input) {

                        input.click();

                    }

                }
            );


            dropZone.addEventListener(
                "dragover",
                function (event) {

                    event.preventDefault();

                    dropZone.classList.add(
                        "drag-over"
                    );

                }
            );


            dropZone.addEventListener(
                "dragleave",
                function () {

                    dropZone.classList.remove(
                        "drag-over"
                    );

                }
            );


            dropZone.addEventListener(
                "drop",
                function (event) {

                    event.preventDefault();


                    dropZone.classList.remove(
                        "drag-over"
                    );


                    const file =
                        event.dataTransfer
                            .files[0];


                    handleFile(
                        file
                    );

                }
            );

        }


        const removeButton =
            $("removeFileBtn");


        if (removeButton) {

            removeButton.addEventListener(
                "click",
                resetApp
            );

        }


        const processButton =
            $("processBtn");


        if (processButton) {

            processButton.addEventListener(
                "click",
                processFile
            );

        }


        const resetButton =
            $("resetBtn");


        if (resetButton) {

            resetButton.addEventListener(
                "click",
                resetApp
            );

        }

    }


    /* =====================================================
       PAGINATION BUTTONS
    ====================================================== */

    function initializePagination() {

        const mapping = [

            [
                "validPrevBtn",
                "valid",
                -1
            ],

            [
                "validNextBtn",
                "valid",
                1
            ],

            [
                "invalidPrevBtn",
                "invalid",
                -1
            ],

            [
                "invalidNextBtn",
                "invalid",
                1
            ],

            [
                "materialPrevBtn",
                "material",
                -1
            ],

            [
                "materialNextBtn",
                "material",
                1
            ],

            [
                "materialErrorPrevBtn",
                "materialError",
                -1
            ],

            [
                "materialErrorNextBtn",
                "materialError",
                1
            ]

        ];


        mapping.forEach(
            function (item) {

                const button =
                    $(
                        item[0]
                    );


                if (!button) {
                    return;
                }


                button.addEventListener(
                    "click",
                    function () {

                        changePage(
                            item[1],
                            item[2]
                        );

                    }
                );

            }
        );

    }


    /* =====================================================
       DOWNLOAD BUTTONS
    ====================================================== */

    function initializeDownloads() {

        const valid =
            $("downloadValidBtn");


        const invalid =
            $("downloadInvalidBtn");


        const material =
            $("downloadMaterialBtn");


        const materialError =
            $("downloadMaterialErrorBtn");


        if (valid) {

            valid.addEventListener(
                "click",
                exportValid
            );

        }


        if (invalid) {

            invalid.addEventListener(
                "click",
                exportInvalid
            );

        }


        if (material) {

            material.addEventListener(
                "click",
                exportMaterials
            );

        }


        if (materialError) {

            materialError.addEventListener(
                "click",
                exportMaterialErrors
            );

        }

    }


    /* =====================================================
       PUBLIC API
    ====================================================== */

    window.ReportCheckerApp = {

        process:
            processFile,

        reset:
            resetApp,

        getRows:
            function () {
                return currentRows;
            },

        getValidationResults:
            function () {
                return validationResults;
            },

        getMaterials:
            function () {
                return materialResults;
            },

        getMaterialErrors:
            function () {
                return materialErrorResults;
            },

        isMaterialHeader:
            isMaterialHeader,

        extractMaterialBlocks:
            extractMaterialBlocks,

        parseMaterialLine:
            parseMaterialLine,

        processAllMaterials:
            processAllMaterials

    };


    /* =====================================================
       DOM READY
    ====================================================== */

    document.addEventListener(
        "DOMContentLoaded",
        function () {

            initializeFileUpload();

            initializePagination();

            initializeDownloads();

            initializeTabs();


            setSystemStatus(
                "Ready",
                "offline"
            );


            console.log(
                "ReportCheckerApp loaded."
            );


            console.log(
                "Material settings:",
                getSettings()
            );


            console.log(
                "Material keywords:",
                getSettings()
                    .materialKeywords
            );

        }
    );


})();
