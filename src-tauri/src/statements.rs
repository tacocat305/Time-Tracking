use std::{
    fs,
    path::{Path, PathBuf},
};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, Runtime};
use tauri_plugin_opener::OpenerExt;

use crate::storage::{InvoiceRecord, StatementProfile};

const PAGE_WIDTH: f32 = 612.0;
const PAGE_HEIGHT: f32 = 792.0;
const LEFT_MARGIN: f32 = 51.0;
const RIGHT_EDGE: f32 = 561.0;
const DESCRIPTION_RIGHT: f32 = 336.0;
const RATE_RIGHT: f32 = 411.0;
const QUANTITY_RIGHT: f32 = 486.0;
const INVOICE_BLUE: (f32, f32, f32) = (0.0784, 0.3765, 0.6667);
const TEXT_COLOR: (f32, f32, f32) = (0.0, 0.0, 0.0);
const RULE_COLOR: (f32, f32, f32) = (0.8, 0.8196, 0.851);
const LOGO_BYTES: &[u8] = include_bytes!("../../src/assets/krewson-law-logo.jpg");

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportInvoicePdfResponse {
    pub path: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportInvoicePdfPayload {
    pub invoice: InvoiceRecord,
    pub statement_profile: StatementProfile,
}

#[tauri::command]
pub fn export_invoice_pdf<R: Runtime>(
    app: AppHandle<R>,
    payload: ExportInvoicePdfPayload,
) -> Result<ExportInvoicePdfResponse, String> {
    let invoice = payload.invoice;
    let statement_profile = payload.statement_profile;
    let export_dir = resolve_export_dir(&app)?;
    fs::create_dir_all(&export_dir)
        .map_err(|error| format!("failed to create statement export directory: {error}"))?;

    let filename = build_statement_filename(&invoice);
    let output_path = export_dir.join(filename);
    let pdf_bytes = render_statement_pdf(&invoice, &statement_profile)?;

    fs::write(&output_path, pdf_bytes)
        .map_err(|error| format!("failed to write statement PDF: {error}"))?;

    Ok(ExportInvoicePdfResponse {
        path: output_path.to_string_lossy().to_string(),
    })
}

#[tauri::command]
pub fn open_invoice_pdf<R: Runtime>(app: AppHandle<R>, path: String) -> Result<(), String> {
    let validated_path = validate_exported_statement_path(&app, &path)?;
    let validated_path_string = validated_path.to_string_lossy().to_string();

    app.opener()
        .open_path(validated_path_string, None::<&str>)
        .map_err(|error| format!("failed to open statement PDF: {error}"))
}

#[tauri::command]
pub fn reveal_invoice_pdf<R: Runtime>(app: AppHandle<R>, path: String) -> Result<(), String> {
    let validated_path = validate_exported_statement_path(&app, &path)?;

    app.opener()
        .reveal_item_in_dir(validated_path)
        .map_err(|error| format!("failed to reveal statement PDF: {error}"))
}

fn resolve_export_dir<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    let base_dir = app
        .path()
        .document_dir()
        .or_else(|_| app.path().app_data_dir())
        .map_err(|error| format!("failed to resolve statement export directory: {error}"))?;

    Ok(base_dir.join("Legal Time Tracker").join("Statements"))
}

fn resolve_allowed_export_dirs<R: Runtime>(app: &AppHandle<R>) -> Result<Vec<PathBuf>, String> {
    let mut export_dirs = Vec::new();

    if let Ok(document_dir) = app.path().document_dir() {
        export_dirs.push(document_dir.join("Legal Time Tracker").join("Statements"));
    }

    if let Ok(app_data_dir) = app.path().app_data_dir() {
        let fallback_dir = app_data_dir.join("Legal Time Tracker").join("Statements");
        if !export_dirs.iter().any(|existing| existing == &fallback_dir) {
            export_dirs.push(fallback_dir);
        }
    }

    if export_dirs.is_empty() {
        return Err("failed to resolve allowed statement export directories".to_string());
    }

    Ok(export_dirs)
}

pub(crate) fn validate_exported_statement_path<R: Runtime>(
    app: &AppHandle<R>,
    path: &str,
) -> Result<PathBuf, String> {
    let trimmed_path = path.trim();
    if trimmed_path.is_empty() {
        return Err("missing statement PDF path".to_string());
    }

    let candidate_path = PathBuf::from(trimmed_path);
    if !candidate_path.is_absolute() {
        return Err("statement PDF path must be absolute".to_string());
    }

    if !matches_pdf_path(&candidate_path) {
        return Err("statement PDF path must point to a PDF file".to_string());
    }

    let allowed_dirs = resolve_allowed_export_dirs(app)?;
    let canonical_path = candidate_path
        .canonicalize()
        .map_err(|error| format!("failed to read statement PDF path: {error}"))?;

    if !matches_pdf_path(&canonical_path) {
        return Err("statement PDF path must resolve to a PDF file".to_string());
    }

    let is_allowed = allowed_dirs.iter().any(|allowed_dir| {
        candidate_path.starts_with(allowed_dir)
            || fs::canonicalize(allowed_dir)
                .map(|canonical_dir| canonical_path.starts_with(canonical_dir))
                .unwrap_or(false)
    });

    if !is_allowed {
        return Err("statement PDF path is outside the allowed export directories".to_string());
    }

    Ok(canonical_path)
}

fn matches_pdf_path(path: &Path) -> bool {
    path.extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| extension.eq_ignore_ascii_case("pdf"))
}

fn render_statement_pdf(
    invoice: &InvoiceRecord,
    statement_profile: &StatementProfile,
) -> Result<Vec<u8>, String> {
    let font = load_invoice_font()?;
    let mut composer = PdfComposer::new(&font);
    render_invoice_header(&mut composer, invoice, statement_profile);
    render_invoice_rows(&mut composer, invoice, statement_profile);
    render_invoice_totals(&mut composer, invoice);
    composer.finish_into_pdf()
}

fn render_invoice_header(
    composer: &mut PdfComposer<'_>,
    invoice: &InvoiceRecord,
    statement_profile: &StatementProfile,
) {
    composer.draw_logo();

    let firm_lines = build_firm_lines(statement_profile);
    for (index, line) in firm_lines.iter().take(4).enumerate() {
        composer.draw_right_text(
            RIGHT_EDGE,
            732.0 - index as f32 * 13.5,
            10.5,
            TEXT_COLOR,
            line,
        );
    }

    composer.draw_text(LEFT_MARGIN, 544.5, 10.5, INVOICE_BLUE, "Billed To");
    composer.draw_text(199.0, 544.5, 10.5, INVOICE_BLUE, "Date of Issue");
    composer.draw_text(311.5, 544.5, 10.5, INVOICE_BLUE, "Invoice Number");
    composer.draw_right_text(RIGHT_EDGE, 544.5, 10.5, INVOICE_BLUE, "Amount Due (USD)");

    let billed_to_lines = build_billed_to_lines(invoice);
    for (index, line) in billed_to_lines.iter().take(3).enumerate() {
        composer.draw_text(
            LEFT_MARGIN,
            515.5 - index as f32 * 13.5,
            10.5,
            TEXT_COLOR,
            line,
        );
    }

    composer.draw_text(
        199.0,
        515.5,
        10.5,
        TEXT_COLOR,
        &format_numeric_date(&invoice.issued_on),
    );
    composer.draw_text(199.0, 506.25, 10.5, INVOICE_BLUE, "Due Date");
    composer.draw_text(
        199.0,
        492.75,
        10.5,
        TEXT_COLOR,
        &format_numeric_date(&add_days_to_date(&invoice.issued_on, 14)),
    );
    composer.draw_text(311.5, 515.5, 10.5, TEXT_COLOR, &invoice.statement_number);
    composer.draw_right_text(
        RIGHT_EDGE,
        519.0,
        27.0,
        TEXT_COLOR,
        &format_currency(invoice.total_amount),
    );

    composer.draw_filled_rule(LEFT_MARGIN, RIGHT_EDGE, 449.25, 2.25, INVOICE_BLUE);
    composer.draw_text(LEFT_MARGIN, 431.25, 10.5, TEXT_COLOR, "Description");
    composer.draw_right_text(RATE_RIGHT, 431.25, 10.5, TEXT_COLOR, "Rate");
    composer.draw_right_text(QUANTITY_RIGHT, 431.25, 10.5, TEXT_COLOR, "Qty");
    composer.draw_right_text(RIGHT_EDGE, 431.25, 10.5, TEXT_COLOR, "Line Total");
    composer.y = 403.25;
}

fn render_invoice_rows(
    composer: &mut PdfComposer<'_>,
    invoice: &InvoiceRecord,
    statement_profile: &StatementProfile,
) {
    if invoice.line_items.is_empty() {
        composer.draw_text(
            LEFT_MARGIN,
            composer.y,
            10.5,
            TEXT_COLOR,
            "No billable activity was recorded for this invoice.",
        );
        composer.draw_filled_rule(LEFT_MARGIN, RIGHT_EDGE, composer.y - 17.5, 0.75, RULE_COLOR);
        composer.y -= 41.25;
        return;
    }

    let professional_name = if statement_profile.sender_name.trim().is_empty() {
        statement_profile.firm_name.trim()
    } else {
        statement_profile.sender_name.trim()
    };

    for line_item in &invoice.line_items {
        let narrative = if line_item.narrative.trim().is_empty() {
            "Billable activity"
        } else {
            line_item.narrative.trim()
        };
        let narrative_lines = wrap_text_to_width(
            narrative,
            composer.font,
            9.0,
            DESCRIPTION_RIGHT - LEFT_MARGIN,
        );
        let narrative_count = narrative_lines.len().max(1);
        let separator_delta = 23.75 + narrative_count as f32 * 12.0;

        if composer.y - separator_delta < 15.75 {
            composer.begin_continuation_page();
        }

        let heading = invoice_line_heading(line_item);
        let (rate, quantity) = invoice_line_rate_and_quantity(line_item);
        composer.draw_text(LEFT_MARGIN, composer.y, 10.5, TEXT_COLOR, &heading);
        composer.draw_right_text(
            RATE_RIGHT,
            composer.y,
            10.5,
            TEXT_COLOR,
            &format_currency(rate),
        );
        composer.draw_right_text(
            QUANTITY_RIGHT,
            composer.y,
            10.5,
            TEXT_COLOR,
            &format_quantity(quantity),
        );
        composer.draw_right_text(
            RIGHT_EDGE,
            composer.y,
            10.5,
            TEXT_COLOR,
            &format_currency(line_item.amount),
        );

        let date_label = format_long_date(&line_item.work_date);
        let attribution = if professional_name.is_empty() {
            date_label
        } else {
            format!("{professional_name} – {date_label}")
        };
        composer.draw_text(
            LEFT_MARGIN,
            composer.y - 12.5,
            9.0,
            TEXT_COLOR,
            &attribution,
        );

        for (index, narrative_line) in narrative_lines.iter().enumerate() {
            composer.draw_text(
                LEFT_MARGIN,
                composer.y - 24.5 - index as f32 * 12.0,
                9.0,
                TEXT_COLOR,
                narrative_line,
            );
        }

        composer.draw_filled_rule(
            LEFT_MARGIN,
            RIGHT_EDGE,
            composer.y - separator_delta,
            0.75,
            RULE_COLOR,
        );
        composer.y -= 41.25 + narrative_count as f32 * 12.0;
    }
}

fn render_invoice_totals(composer: &mut PdfComposer<'_>, invoice: &InvoiceRecord) {
    const TOTALS_HEIGHT: f32 = 112.0;
    if composer.y - TOTALS_HEIGHT < 18.0 {
        composer.begin_continuation_page();
    }

    let subtotal_y = composer.y - 14.25;
    let recorded_payments = invoice
        .payments
        .iter()
        .map(|payment| payment.amount)
        .sum::<f64>();
    let amount_paid = if recorded_payments > 0.0 {
        recorded_payments.min(invoice.total_amount)
    } else if invoice.status == "paid" {
        invoice.total_amount
    } else {
        0.0
    };
    let amount_due = (invoice.total_amount - amount_paid).max(0.0);

    composer.draw_right_text(455.0, subtotal_y, 10.5, TEXT_COLOR, "Subtotal");
    composer.draw_right_text(
        RIGHT_EDGE,
        subtotal_y,
        10.5,
        TEXT_COLOR,
        &format_currency_without_symbol(invoice.total_amount),
    );
    composer.draw_right_text(455.0, subtotal_y - 16.5, 10.5, TEXT_COLOR, "Tax");
    composer.draw_right_text(RIGHT_EDGE, subtotal_y - 16.5, 10.5, TEXT_COLOR, "0.00");
    composer.draw_filled_rule(306.0, RIGHT_EDGE, subtotal_y - 27.75, 0.75, RULE_COLOR);
    composer.draw_right_text(455.0, subtotal_y - 45.25, 10.5, TEXT_COLOR, "Total");
    composer.draw_right_text(
        RIGHT_EDGE,
        subtotal_y - 45.25,
        10.5,
        TEXT_COLOR,
        &format_currency_without_symbol(invoice.total_amount),
    );
    composer.draw_right_text(455.0, subtotal_y - 61.75, 10.5, TEXT_COLOR, "Amount Paid");
    composer.draw_right_text(
        RIGHT_EDGE,
        subtotal_y - 61.75,
        10.5,
        TEXT_COLOR,
        &format_currency_without_symbol(amount_paid),
    );
    composer.draw_filled_rule(306.0, RIGHT_EDGE, subtotal_y - 74.25, 0.75, RULE_COLOR);
    composer.draw_filled_rule(306.0, RIGHT_EDGE, subtotal_y - 75.75, 0.75, RULE_COLOR);
    composer.draw_right_text(
        455.0,
        subtotal_y - 91.0,
        10.5,
        INVOICE_BLUE,
        "Amount Due (USD)",
    );
    composer.draw_right_text(
        RIGHT_EDGE,
        subtotal_y - 91.0,
        10.5,
        INVOICE_BLUE,
        &format_currency(amount_due),
    );
}

struct PdfComposer<'a> {
    current_page: String,
    font: &'a InvoiceFont,
    pages: Vec<String>,
    y: f32,
}

impl<'a> PdfComposer<'a> {
    fn new(font: &'a InvoiceFont) -> Self {
        Self {
            current_page: String::new(),
            font,
            pages: Vec::new(),
            y: 403.25,
        }
    }

    fn begin_continuation_page(&mut self) {
        self.pages.push(std::mem::take(&mut self.current_page));
        self.y = 758.25;
    }

    fn draw_logo(&mut self) {
        self.current_page
            .push_str("q 150.00 0 0 150.00 51.00 592.50 cm /Logo Do Q\n");
    }

    fn draw_text(&mut self, x: f32, y: f32, size: f32, color: (f32, f32, f32), text: &str) {
        self.current_page.push_str(&format!(
            "BT /F1 {size:.2} Tf {r:.4} {g:.4} {b:.4} rg {x:.2} {y:.2} Td ({escaped}) Tj ET\n",
            escaped = escape_pdf_text(text),
            r = color.0,
            g = color.1,
            b = color.2,
        ));
    }

    fn draw_right_text(
        &mut self,
        right_x: f32,
        y: f32,
        size: f32,
        color: (f32, f32, f32),
        text: &str,
    ) {
        let width = self.font.text_width(text, size);
        self.draw_text(right_x - width, y, size, color, text);
    }

    fn draw_filled_rule(&mut self, x0: f32, x1: f32, y: f32, height: f32, color: (f32, f32, f32)) {
        self.current_page.push_str(&format!(
            "{r:.4} {g:.4} {b:.4} rg {x0:.2} {y:.2} {width:.2} {height:.2} re f\n",
            r = color.0,
            g = color.1,
            b = color.2,
            width = x1 - x0,
        ));
    }

    fn finish_into_pdf(mut self) -> Result<Vec<u8>, String> {
        if !self.current_page.is_empty() {
            self.pages.push(self.current_page);
        }
        if self.pages.is_empty() {
            return Err("invoice PDF could not be generated".to_string());
        }
        Ok(build_pdf_document(&self.pages, self.font))
    }
}

#[derive(Debug)]
struct InvoiceFont {
    ascent: i16,
    bbox: [i16; 4],
    bytes: Vec<u8>,
    descent: i16,
    units_per_em: u16,
    widths: Vec<u16>,
}

impl InvoiceFont {
    fn text_width(&self, text: &str, size: f32) -> f32 {
        encode_win_ansi(text)
            .iter()
            .map(|byte| self.widths[*byte as usize] as f32 / self.units_per_em as f32 * size)
            .sum()
    }
}

fn load_invoice_font() -> Result<InvoiceFont, String> {
    let candidates = if cfg!(target_os = "macos") {
        vec![
            PathBuf::from("/System/Library/Fonts/Supplemental/Arial.ttf"),
            PathBuf::from("/Library/Fonts/Arial.ttf"),
        ]
    } else if cfg!(target_os = "windows") {
        vec![PathBuf::from(r"C:\Windows\Fonts\arial.ttf")]
    } else {
        vec![
            PathBuf::from("/usr/share/fonts/truetype/msttcorefonts/Arial.ttf"),
            PathBuf::from("/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf"),
        ]
    };

    let font_path = candidates
        .into_iter()
        .find(|candidate| candidate.is_file())
        .ok_or_else(|| "Arial is required to create the reference invoice layout".to_string())?;
    let bytes = fs::read(&font_path)
        .map_err(|error| format!("failed to read Arial from {}: {error}", font_path.display()))?;
    parse_true_type_font(bytes)
}

fn parse_true_type_font(bytes: Vec<u8>) -> Result<InvoiceFont, String> {
    let num_tables = read_u16(&bytes, 4)? as usize;
    let mut tables = std::collections::HashMap::new();
    for index in 0..num_tables {
        let record = 12 + index * 16;
        let tag = bytes
            .get(record..record + 4)
            .ok_or_else(|| "Arial table directory is incomplete".to_string())?;
        let offset = read_u32(&bytes, record + 8)? as usize;
        let length = read_u32(&bytes, record + 12)? as usize;
        if offset
            .checked_add(length)
            .is_none_or(|end| end > bytes.len())
        {
            return Err("Arial contains an invalid table offset".to_string());
        }
        tables.insert(tag.to_vec(), (offset, length));
    }

    let head = table_offset(&tables, b"head")?;
    let hhea = table_offset(&tables, b"hhea")?;
    let hmtx = table_offset(&tables, b"hmtx")?;
    let cmap = table_offset(&tables, b"cmap")?;
    let units_per_em = read_u16(&bytes, head + 18)?;
    let bbox = [
        read_i16(&bytes, head + 36)?,
        read_i16(&bytes, head + 38)?,
        read_i16(&bytes, head + 40)?,
        read_i16(&bytes, head + 42)?,
    ];
    let ascent = read_i16(&bytes, hhea + 4)?;
    let descent = read_i16(&bytes, hhea + 6)?;
    let horizontal_metrics = read_u16(&bytes, hhea + 34)? as usize;
    let cmap4 = find_unicode_cmap4(&bytes, cmap)?;

    let mut widths = vec![units_per_em / 2; 256];
    for byte in 0u8..=255 {
        let glyph = cmap4_glyph_index(&bytes, cmap4, win_ansi_unicode(byte))? as usize;
        let metric_index = glyph.min(horizontal_metrics.saturating_sub(1));
        widths[byte as usize] = read_u16(&bytes, hmtx + metric_index * 4)?;
    }

    Ok(InvoiceFont {
        ascent,
        bbox,
        bytes,
        descent,
        units_per_em,
        widths,
    })
}

fn build_pdf_document(page_contents: &[String], font: &InvoiceFont) -> Vec<u8> {
    let widths = font.widths[32..=255]
        .iter()
        .map(|width| scale_font_metric(*width as i32, font.units_per_em).to_string())
        .collect::<Vec<_>>()
        .join(" ");
    let bbox = font
        .bbox
        .map(|value| scale_font_metric(value as i32, font.units_per_em));

    let mut objects: Vec<Vec<u8>> = vec![
        br#"<< /Type /Catalog /Pages 2 0 R >>"#.to_vec(),
        Vec::new(),
        format!(
            "<< /Type /Font /Subtype /TrueType /BaseFont /ArialMT /FirstChar 32 /LastChar 255 /Widths [{widths}] /FontDescriptor 4 0 R /Encoding /WinAnsiEncoding >>"
        )
        .into_bytes(),
        format!(
            "<< /Type /FontDescriptor /FontName /ArialMT /Flags 32 /Ascent {} /Descent {} /CapHeight 716 /ItalicAngle 0 /StemV 46 /FontBBox [{} {} {} {}] /FontFile2 5 0 R >>",
            scale_font_metric(font.ascent as i32, font.units_per_em),
            scale_font_metric(font.descent as i32, font.units_per_em),
            bbox[0], bbox[1], bbox[2], bbox[3],
        )
        .into_bytes(),
        stream_object(&font.bytes, Some(font.bytes.len())),
        image_object(LOGO_BYTES, 200, 200),
    ];

    let first_page_id = 7;
    let kids = (0..page_contents.len())
        .map(|index| format!("{} 0 R", first_page_id + index * 2))
        .collect::<Vec<_>>()
        .join(" ");
    objects[1] = format!(
        "<< /Type /Pages /Count {} /Kids [{}] >>",
        page_contents.len(),
        kids
    )
    .into_bytes();

    for (index, content) in page_contents.iter().enumerate() {
        let page_id = first_page_id + index * 2;
        let content_id = page_id + 1;
        objects.push(
            format!(
                "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {PAGE_WIDTH:.0} {PAGE_HEIGHT:.0}] /Resources << /Font << /F1 3 0 R >> /XObject << /Logo 6 0 R >> >> /Contents {content_id} 0 R >>"
            )
            .into_bytes(),
        );
        objects.push(stream_object(content.as_bytes(), None));
    }

    serialize_pdf_objects(objects)
}

fn stream_object(bytes: &[u8], length_one: Option<usize>) -> Vec<u8> {
    let length_one_entry = length_one
        .map(|length| format!(" /Length1 {length}"))
        .unwrap_or_default();
    let mut object = format!(
        "<< /Length {}{} >>\nstream\n",
        bytes.len(),
        length_one_entry
    )
    .into_bytes();
    object.extend_from_slice(bytes);
    object.extend_from_slice(b"\nendstream");
    object
}

fn image_object(bytes: &[u8], width: u32, height: u32) -> Vec<u8> {
    let mut object = format!(
        "<< /Type /XObject /Subtype /Image /Width {width} /Height {height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length {} >>\nstream\n",
        bytes.len()
    )
    .into_bytes();
    object.extend_from_slice(bytes);
    object.extend_from_slice(b"\nendstream");
    object
}

fn serialize_pdf_objects(objects: Vec<Vec<u8>>) -> Vec<u8> {
    let mut pdf = b"%PDF-1.4\n%\xE2\xE3\xCF\xD3\n".to_vec();
    let mut offsets = Vec::with_capacity(objects.len() + 1);
    offsets.push(0usize);

    for (index, object) in objects.iter().enumerate() {
        offsets.push(pdf.len());
        pdf.extend_from_slice(format!("{} 0 obj\n", index + 1).as_bytes());
        pdf.extend_from_slice(object);
        pdf.extend_from_slice(b"\nendobj\n");
    }

    let xref_offset = pdf.len();
    pdf.extend_from_slice(format!("xref\n0 {}\n", objects.len() + 1).as_bytes());
    pdf.extend_from_slice(b"0000000000 65535 f \n");
    for offset in offsets.iter().skip(1) {
        pdf.extend_from_slice(format!("{offset:010} 00000 n \n").as_bytes());
    }
    pdf.extend_from_slice(
        format!(
            "trailer\n<< /Size {} /Root 1 0 R >>\nstartxref\n{}\n%%EOF\n",
            objects.len() + 1,
            xref_offset
        )
        .as_bytes(),
    );
    pdf
}

fn build_statement_filename(invoice: &InvoiceRecord) -> String {
    let statement_number = slugify_filename_segment(&invoice.statement_number);
    if statement_number == "statement" {
        format!(
            "invoice_{}-{}.pdf",
            invoice.period_key,
            slugify_filename_segment(&invoice.client_name)
        )
    } else {
        format!("invoice_{statement_number}.pdf")
    }
}

fn build_firm_lines(statement_profile: &StatementProfile) -> Vec<String> {
    let firm_name = statement_profile.firm_name.trim();
    let mut lines = vec![if firm_name.is_empty() {
        "Krewson Law LLC".to_string()
    } else {
        firm_name.to_string()
    }];
    if !statement_profile.sender_phone.trim().is_empty() {
        lines.push(statement_profile.sender_phone.trim().to_string());
    }
    if !statement_profile.sender_address.trim().is_empty() {
        lines.extend(split_address_lines(&statement_profile.sender_address));
    }
    if lines.len() == 1 && !statement_profile.sender_email.trim().is_empty() {
        lines.push(statement_profile.sender_email.trim().to_string());
    }
    lines
}

fn build_billed_to_lines(invoice: &InvoiceRecord) -> Vec<String> {
    let mut lines = vec![invoice.client_name.trim().to_string()];
    if !invoice.client_address.trim().is_empty() {
        lines.extend(split_address_lines(&invoice.client_address));
    } else if !invoice.contact_name.trim().is_empty() {
        lines.push(invoice.contact_name.trim().to_string());
    }
    lines
}

fn split_address_lines(address: &str) -> Vec<String> {
    let explicit_lines = address
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .map(ToString::to_string)
        .collect::<Vec<_>>();
    if explicit_lines.len() > 1 {
        return explicit_lines;
    }

    let parts = address
        .split(',')
        .map(str::trim)
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>();
    if parts.len() >= 3 {
        vec![parts[0].to_string(), parts[1..].join(", ")]
    } else {
        explicit_lines
    }
}

fn invoice_line_heading(line_item: &crate::storage::InvoiceLineItem) -> String {
    if line_item.kind == "expense" {
        if line_item.category.trim().is_empty() {
            "Expense".to_string()
        } else {
            line_item.category.trim().to_string()
        }
    } else if line_item.matter_name.trim().is_empty() {
        "Time".to_string()
    } else {
        line_item.matter_name.trim().to_string()
    }
}

fn invoice_line_rate_and_quantity(line_item: &crate::storage::InvoiceLineItem) -> (f64, f64) {
    if line_item.kind == "expense" || line_item.billed_minutes == 0 {
        (line_item.amount, 1.0)
    } else {
        let quantity = line_item.billed_minutes as f64 / 60.0;
        (line_item.amount / quantity, quantity)
    }
}

fn slugify_filename_segment(value: &str) -> String {
    let mut output = String::new();
    let mut last_was_dash = false;

    for character in value.chars() {
        let normalized = character.to_ascii_lowercase();
        if normalized.is_ascii_alphanumeric() {
            output.push(normalized);
            last_was_dash = false;
            continue;
        }

        if !last_was_dash {
            output.push('-');
            last_was_dash = true;
        }
    }

    let trimmed = output.trim_matches('-');
    if trimmed.is_empty() {
        "statement".to_string()
    } else {
        trimmed.to_string()
    }
}

fn wrap_text_to_width(
    text: &str,
    font: &InvoiceFont,
    font_size: f32,
    max_width: f32,
) -> Vec<String> {
    let mut wrapped = Vec::new();
    for paragraph in text.split('\n') {
        let mut current = String::new();
        for word in paragraph.split_whitespace() {
            let candidate = if current.is_empty() {
                word.to_string()
            } else {
                format!("{current} {word}")
            };
            if font.text_width(&candidate, font_size) > max_width && !current.is_empty() {
                wrapped.push(current.clone());
                current.clear();
            }
            if !current.is_empty() {
                current.push(' ');
            }
            current.push_str(word);
        }
        if !current.is_empty() {
            wrapped.push(current);
        } else if paragraph.trim().is_empty() {
            wrapped.push(String::new());
        }
    }
    if wrapped.is_empty() {
        vec![String::new()]
    } else {
        wrapped
    }
}

fn encode_win_ansi(text: &str) -> Vec<u8> {
    text.chars()
        .map(|character| match character {
            '\u{20ac}' => 128,
            '\u{2018}' => 145,
            '\u{2019}' => 146,
            '\u{201c}' => 147,
            '\u{201d}' => 148,
            '\u{2022}' => 149,
            '\u{2013}' => 150,
            '\u{2014}' => 151,
            character if character.is_ascii() && !character.is_ascii_control() => character as u8,
            character if ('\u{a0}'..='\u{ff}').contains(&character) => character as u8,
            _ => b'?',
        })
        .collect()
}

fn escape_pdf_text(text: &str) -> String {
    let mut escaped = String::new();
    for byte in encode_win_ansi(text) {
        match byte {
            b'\\' | b'(' | b')' => {
                escaped.push('\\');
                escaped.push(byte as char);
            }
            32..=126 => escaped.push(byte as char),
            _ => escaped.push_str(&format!("\\{byte:03o}")),
        }
    }
    escaped
}

fn format_currency(amount: f64) -> String {
    let absolute = amount.abs();
    let cents = (absolute * 100.0).round() as u64;
    let dollars = cents / 100;
    let remainder = cents % 100;
    let dollars_with_commas = format_with_commas(dollars);
    let sign = if amount < 0.0 { "-" } else { "" };

    format!("{sign}${dollars_with_commas}.{remainder:02}")
}

fn format_currency_without_symbol(amount: f64) -> String {
    format_currency(amount).replace('$', "")
}

fn format_with_commas(value: u64) -> String {
    let digits = value.to_string();
    let mut output = String::new();

    for (index, character) in digits.chars().rev().enumerate() {
        if index > 0 && index % 3 == 0 {
            output.push(',');
        }
        output.push(character);
    }

    output.chars().rev().collect()
}

fn format_quantity(quantity: f64) -> String {
    let rounded = (quantity * 100.0).round() / 100.0;
    if rounded.fract().abs() < f64::EPSILON {
        format!("{rounded:.0}")
    } else if (rounded * 10.0).fract().abs() < f64::EPSILON {
        format!("{rounded:.1}")
    } else {
        format!("{rounded:.2}")
    }
}

fn format_numeric_date(date: &str) -> String {
    parse_date(date)
        .map(|(year, month, day)| format!("{month:02}/{day:02}/{year:04}"))
        .unwrap_or_else(|| date.to_string())
}

fn format_long_date(date: &str) -> String {
    const MONTHS: [&str; 12] = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    parse_date(date)
        .and_then(|(year, month, day)| {
            MONTHS
                .get(month.saturating_sub(1) as usize)
                .map(|name| format!("{name} {day}, {year}"))
        })
        .unwrap_or_else(|| date.to_string())
}

fn add_days_to_date(date: &str, days: u32) -> String {
    let Some((mut year, mut month, mut day)) = parse_date(date) else {
        return date.to_string();
    };
    for _ in 0..days {
        day += 1;
        if day > days_in_month(year, month) {
            day = 1;
            month += 1;
            if month > 12 {
                month = 1;
                year += 1;
            }
        }
    }
    format!("{year:04}-{month:02}-{day:02}")
}

fn parse_date(date: &str) -> Option<(u32, u32, u32)> {
    let mut parts = date.split('-');
    let year = parts.next()?.parse().ok()?;
    let month = parts.next()?.parse().ok()?;
    let day = parts.next()?.parse().ok()?;
    if parts.next().is_some()
        || !(1..=12).contains(&month)
        || day == 0
        || day > days_in_month(year, month)
    {
        return None;
    }
    Some((year, month, day))
}

fn days_in_month(year: u32, month: u32) -> u32 {
    match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 if year.is_multiple_of(400) || (year.is_multiple_of(4) && !year.is_multiple_of(100)) => {
            29
        }
        2 => 28,
        _ => 0,
    }
}

fn read_u16(bytes: &[u8], offset: usize) -> Result<u16, String> {
    let value = bytes
        .get(offset..offset + 2)
        .ok_or_else(|| "Arial ended unexpectedly".to_string())?;
    Ok(u16::from_be_bytes([value[0], value[1]]))
}

fn read_i16(bytes: &[u8], offset: usize) -> Result<i16, String> {
    Ok(read_u16(bytes, offset)? as i16)
}

fn read_u32(bytes: &[u8], offset: usize) -> Result<u32, String> {
    let value = bytes
        .get(offset..offset + 4)
        .ok_or_else(|| "Arial ended unexpectedly".to_string())?;
    Ok(u32::from_be_bytes([value[0], value[1], value[2], value[3]]))
}

fn table_offset(
    tables: &std::collections::HashMap<Vec<u8>, (usize, usize)>,
    tag: &[u8; 4],
) -> Result<usize, String> {
    tables
        .get(tag.as_slice())
        .map(|(offset, _)| *offset)
        .ok_or_else(|| {
            format!(
                "Arial is missing its {} table",
                String::from_utf8_lossy(tag)
            )
        })
}

fn find_unicode_cmap4(bytes: &[u8], cmap: usize) -> Result<usize, String> {
    let count = read_u16(bytes, cmap + 2)? as usize;
    let mut fallback = None;
    for index in 0..count {
        let record = cmap + 4 + index * 8;
        let platform = read_u16(bytes, record)?;
        let encoding = read_u16(bytes, record + 2)?;
        let subtable = cmap + read_u32(bytes, record + 4)? as usize;
        if read_u16(bytes, subtable)? != 4 {
            continue;
        }
        if platform == 3 && encoding == 1 {
            return Ok(subtable);
        }
        if platform == 0 {
            fallback = Some(subtable);
        }
    }
    fallback.ok_or_else(|| "Arial does not contain a usable Unicode character map".to_string())
}

fn cmap4_glyph_index(bytes: &[u8], cmap4: usize, codepoint: u16) -> Result<u16, String> {
    let segment_count = read_u16(bytes, cmap4 + 6)? as usize / 2;
    let end_codes = cmap4 + 14;
    let start_codes = end_codes + segment_count * 2 + 2;
    let deltas = start_codes + segment_count * 2;
    let range_offsets = deltas + segment_count * 2;

    for index in 0..segment_count {
        let end = read_u16(bytes, end_codes + index * 2)?;
        let start = read_u16(bytes, start_codes + index * 2)?;
        if codepoint < start || codepoint > end {
            continue;
        }
        let delta = read_i16(bytes, deltas + index * 2)? as i32;
        let range_offset_position = range_offsets + index * 2;
        let range_offset = read_u16(bytes, range_offset_position)? as usize;
        if range_offset == 0 {
            return Ok(((codepoint as i32 + delta) & 0xffff) as u16);
        }
        let glyph_position =
            range_offset_position + range_offset + (codepoint - start) as usize * 2;
        let glyph = read_u16(bytes, glyph_position)?;
        return if glyph == 0 {
            Ok(0)
        } else {
            Ok(((glyph as i32 + delta) & 0xffff) as u16)
        };
    }
    Ok(0)
}

fn win_ansi_unicode(byte: u8) -> u16 {
    match byte {
        128 => 0x20ac,
        145 => 0x2018,
        146 => 0x2019,
        147 => 0x201c,
        148 => 0x201d,
        149 => 0x2022,
        150 => 0x2013,
        151 => 0x2014,
        _ => byte as u16,
    }
}

fn scale_font_metric(value: i32, units_per_em: u16) -> i32 {
    (value as f64 * 1000.0 / units_per_em as f64).round() as i32
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::storage::{InvoiceLineItem, PaymentRecord};

    #[test]
    fn reference_invoice_pdf_embeds_arial_logo_and_paginates() {
        let line_items = (0..11)
            .map(|index| InvoiceLineItem {
                amount: 275.0,
                billed_minutes: 75,
                category: String::new(),
                entry_id: format!("entry-{index}"),
                kind: "time".to_string(),
                matter_id: None,
                matter_name: if index > 4 {
                    "Mongenel".to_string()
                } else {
                    String::new()
                },
                narrative: "Attend weekly employee relations meeting, review correspondence, and provide guidance regarding contract updates".to_string(),
                payee: String::new(),
                task_category: String::new(),
                work_date: format!("2026-06-{:02}", index + 2),
            })
            .collect::<Vec<_>>();
        let invoice = InvoiceRecord {
            billing_instructions: String::new(),
            client_address: "4242 State Rte. 306\nKirtland, OH 44094".to_string(),
            client_id: Some("client-1".to_string()),
            client_name: "Signature Health, Inc.".to_string(),
            contact_email: "billing@example.com".to_string(),
            contact_name: String::new(),
            deliveries: Vec::new(),
            excluded_expense_ids: Vec::new(),
            id: "invoice-1".to_string(),
            issued_on: "2026-07-01".to_string(),
            line_items,
            matter_summaries: Vec::new(),
            notes: String::new(),
            paid_on: None,
            payments: vec![PaymentRecord {
                amount: 250.0,
                created_at: "2026-07-10T12:00:00Z".to_string(),
                id: "payment-1".to_string(),
                method: "ach".to_string(),
                notes: String::new(),
                payment_date: "2026-07-10".to_string(),
                reference: "ACH-1001".to_string(),
            }],
            period_key: "2026-06".to_string(),
            period_label: "June 2026".to_string(),
            reviewed_count: 11,
            statement_exported_at: None,
            statement_pdf_path: None,
            statement_number: "26-006".to_string(),
            status: "partial".to_string(),
            total_amount: 3025.0,
            total_billed_minutes: 825,
            unreviewed_count: 0,
        };
        let profile = StatementProfile {
            firm_name: "Krewson Law LLC".to_string(),
            footer_note: String::new(),
            sender_address: "31918 Walker Rd\nAvon Lake, OH 44012".to_string(),
            sender_email: "patricia@krewsonlaw.com".to_string(),
            sender_name: "Patricia Krewson".to_string(),
            sender_phone: "216.210.4131".to_string(),
            sender_title: String::new(),
        };

        let pdf = render_statement_pdf(&invoice, &profile).expect("render reference invoice");
        assert!(pdf.starts_with(b"%PDF-1.4"));
        assert!(pdf.windows(8).any(|window| window == b"/ArialMT"));
        assert!(pdf.windows(13).any(|window| window == b"/DCTDecode /L"));
        assert!(pdf.windows(8).any(|window| window == b"2,775.00"));
        assert_eq!(
            pdf.windows(12)
                .filter(|window| *window == b"/Type /Page ")
                .count(),
            2
        );

        let fixture = std::env::temp_dir().join("legal-time-tracker-reference-layout.pdf");
        fs::write(&fixture, pdf).expect("write visual regression fixture");
    }

    #[test]
    fn invoice_dates_and_quantities_match_reference_format() {
        assert_eq!(format_numeric_date("2026-07-01"), "07/01/2026");
        assert_eq!(add_days_to_date("2026-12-25", 14), "2027-01-08");
        assert_eq!(format_long_date("2026-06-02"), "Jun 2, 2026");
        assert_eq!(format_quantity(1.25), "1.25");
        assert_eq!(format_quantity(1.5), "1.5");
        assert_eq!(format_quantity(1.0), "1");
    }
}
