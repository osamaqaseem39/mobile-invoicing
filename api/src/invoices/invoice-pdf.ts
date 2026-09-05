import PDFDocument from "pdfkit";
import { company, companyAddressLines } from "../common/company";
import { DEFAULT_GBP_TO_EUR_RATE, formatMoney, type PrintCurrency } from "../common/money";
import { formatDate, labelStatus } from "../common/status";
import { invoiceTotals } from "../common/invoice";
import { INVOICE_INVALID_UNTIL_PAID_NOTICE, INVOICE_MARGIN_NOTICE, INVOICE_TERMS } from "../common/invoice-terms";

export type InvoiceForPdf = {
  id: string;
  invoiceNumber: string;
  status: string;
  issuedAt: Date | string;
  shippingCostGbp: number;
  shippingLabel: string | null;
  paymentTerms: string | null;
  warrantyTerms: string | null;
  marginVatScheme: boolean;
  paidAmountGbp: number;
  notes: string | null;
  customer: {
    clientId: string;
    name: string;
    businessName: string | null;
    phone: string | null;
    email: string | null;
    vatNumber: string | null;
    address: string | null;
    shippingAddress: string | null;
  };
  lines: {
    qty: number;
    productName: string;
    color: string;
    network: string;
    grade: string;
    unitPriceGbp: number;
    imeis?: string[];
  }[];
  stockUnits: { imei: string | null }[];
};

const MARGIN = 40;
const PAGE_WIDTH = 595.28; // A4 pt

export type InvoicePdfOptions = {
  /** Currency the PDF is rendered in. Amounts are stored in GBP. */
  currency?: PrintCurrency;
  /** GBP -> EUR rate, used only when currency is EUR. */
  rate?: number;
};

export function buildInvoicePdf(
  invoice: InvoiceForPdf,
  options: InvoicePdfOptions = {},
): Promise<Buffer> {
  const currency = options.currency ?? "GBP";
  const rate = options.rate && options.rate > 0 ? options.rate : DEFAULT_GBP_TO_EUR_RATE;
  const money = (gbp: number) => formatMoney(gbp, currency, rate);
  const doc = new PDFDocument({ size: "A4", margin: MARGIN });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const contentWidth = PAGE_WIDTH - MARGIN * 2;
  const totals = invoiceTotals(invoice);

  doc.font("Helvetica-Bold").fontSize(16).text(company.tradingName, MARGIN, MARGIN);
  doc
    .font("Helvetica")
    .fontSize(9)
    .text(
      `${companyAddressLines().join(", ")}\nTelephone: ${company.phoneDisplay} · Whatsapp: ${company.whatsappDisplay}`,
      { width: contentWidth * 0.6 },
    );

  doc
    .font("Helvetica-Bold")
    .fontSize(20)
    .text("INVOICE", MARGIN, MARGIN, { width: contentWidth, align: "right" });
  doc
    .font("Helvetica")
    .fontSize(9)
    .text(
      [
        `Invoice No. ${invoice.invoiceNumber}`,
        `Invoice Date ${formatDate(invoice.issuedAt)}`,
        `Invoice Status: ${labelStatus(invoice.status)}`,
        `Client ID: ${invoice.customer.clientId}`,
      ].join("\n"),
      MARGIN,
      doc.y + 4,
      { width: contentWidth, align: "right" },
    );

  doc.moveDown(1.5);
  doc
    .moveTo(MARGIN, doc.y)
    .lineTo(PAGE_WIDTH - MARGIN, doc.y)
    .strokeColor("#cbd5e1")
    .stroke();
  doc.moveDown(0.8);

  if (invoice.marginVatScheme) {
    doc.font("Helvetica-Bold").fontSize(8).fillColor("#92400e").text(INVOICE_MARGIN_NOTICE, {
      width: contentWidth,
    });
    doc.fillColor("black");
    doc.moveDown(0.8);
  }

  const colWidth = contentWidth / 3;
  const detailsTop = doc.y;
  doc.font("Helvetica").fontSize(8).fillColor("#64748b").text("BILLING DETAILS", MARGIN, detailsTop);
  doc
    .fillColor("black")
    .fontSize(9)
    .text(
      [
        invoice.customer.name,
        invoice.customer.businessName ?? "",
        invoice.customer.address ?? "",
        invoice.customer.phone ?? "",
        invoice.customer.email ?? "",
        invoice.customer.vatNumber ? `VAT Number: ${invoice.customer.vatNumber}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
      MARGIN,
      detailsTop + 12,
      { width: colWidth - 10 },
    );

  doc
    .fontSize(8)
    .fillColor("#64748b")
    .text("SHIPPING DETAILS", MARGIN + colWidth, detailsTop);
  doc
    .fillColor("black")
    .fontSize(9)
    .text(
      [invoice.customer.name, invoice.customer.businessName ?? "", invoice.customer.shippingAddress || invoice.customer.address || "—"]
        .filter(Boolean)
        .join("\n"),
      MARGIN + colWidth,
      detailsTop + 12,
      { width: colWidth - 10 },
    );

  doc
    .fontSize(9)
    .fillColor("black")
    .text(
      [
        ...(currency === "EUR" ? [`Exchange rate: 1 GBP = ${rate} EUR`] : []),
        `Payment Terms: ${invoice.paymentTerms || "Immediate"}`,
        `Warranty Terms: ${invoice.warrantyTerms || "3 months"}`,
      ].join("\n"),
      MARGIN + colWidth * 2,
      detailsTop,
      { width: colWidth - 10 },
    );

  doc.y = Math.max(doc.y, detailsTop + 70);
  doc.moveDown(1);

  const cols = {
    qty: MARGIN,
    product: MARGIN + 30,
    color: MARGIN + 210,
    network: MARGIN + 280,
    grade: MARGIN + 350,
    price: MARGIN + 390,
    total: MARGIN + 460,
  };
  const tableWidth = contentWidth;

  function tableHeader() {
    const y = doc.y;
    doc.font("Helvetica-Bold").fontSize(8).fillColor("#64748b");
    doc.text("Qty", cols.qty, y, { width: 25 });
    doc.text("Product", cols.product, y, { width: 175 });
    doc.text("Color", cols.color, y, { width: 65 });
    doc.text("Network", cols.network, y, { width: 65 });
    doc.text("Grade", cols.grade, y, { width: 35 });
    doc.text("Unit price", cols.price, y, { width: 65, align: "right" });
    doc.text("Total", cols.total, y, { width: PAGE_WIDTH - MARGIN - cols.total, align: "right" });
    doc.fillColor("black");
    doc.moveDown(0.6);
    doc
      .moveTo(MARGIN, doc.y)
      .lineTo(MARGIN + tableWidth, doc.y)
      .strokeColor("#94a3b8")
      .stroke();
    doc.moveDown(0.4);
  }

  function ensureSpace(rowHeight: number, onNewPage?: () => void) {
    if (doc.y + rowHeight > doc.page.height - MARGIN - 60) {
      doc.addPage();
      doc.y = MARGIN;
      onNewPage?.();
    }
  }

  tableHeader();
  for (const line of invoice.lines) {
    ensureSpace(20, tableHeader);
    doc.font("Helvetica").fontSize(9).fillColor("black");
    const y = doc.y;
    doc.text(String(line.qty), cols.qty, y, { width: 25 });
    doc.text(line.productName, cols.product, y, { width: 175 });
    doc.text(line.color, cols.color, y, { width: 65 });
    doc.text(line.network, cols.network, y, { width: 65 });
    doc.text(line.grade, cols.grade, y, { width: 35, align: "center" });
    doc.text(money(line.unitPriceGbp), cols.price, y, { width: 65, align: "right" });
    doc.text(money(line.qty * line.unitPriceGbp), cols.total, y, {
      width: PAGE_WIDTH - MARGIN - cols.total,
      align: "right",
    });
    doc.moveDown(0.9);
  }
  if (invoice.shippingCostGbp > 0) {
    ensureSpace(20);
    const y = doc.y;
    doc.text("1", cols.qty, y, { width: 25 });
    doc.text(invoice.shippingLabel || "Shipping", cols.product, y, { width: 175 });
    doc.text(money(invoice.shippingCostGbp), cols.price, y, { width: 65, align: "right" });
    doc.text(money(invoice.shippingCostGbp), cols.total, y, {
      width: PAGE_WIDTH - MARGIN - cols.total,
      align: "right",
    });
    doc.moveDown(0.9);
  }

  doc
    .moveTo(MARGIN, doc.y)
    .lineTo(MARGIN + tableWidth, doc.y)
    .strokeColor("#e2e8f0")
    .stroke();
  doc.moveDown(0.6);

  ensureSpace(140);
  const summaryTop = doc.y;
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor("#64748b")
    .text("BANK DETAILS", MARGIN, summaryTop);
  doc
    .fillColor("black")
    .fontSize(9)
    .text(
      [
        `Bank Name: ${company.bank.bankName}`,
        `Account Name: ${company.bank.accountName}`,
        `Sort code: ${company.bank.sortCode}`,
        `Account: ${company.bank.accountNumber}`,
        "",
        `Payment Reference: ${invoice.invoiceNumber}`,
        `You must enter ${invoice.invoiceNumber} as your payment reference.`,
      ].join("\n"),
      MARGIN,
      summaryTop + 12,
      { width: contentWidth * 0.55 },
    );

  const summaryColX = MARGIN + contentWidth * 0.6;
  const summaryColWidth = contentWidth * 0.4;
  let sy = summaryTop;
  const summaryRow = (label: string, value: string, bold = false) => {
    doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(bold ? 11 : 9);
    doc.text(label, summaryColX, sy, { width: summaryColWidth * 0.5 });
    doc.text(value, summaryColX + summaryColWidth * 0.5, sy, {
      width: summaryColWidth * 0.5,
      align: "right",
    });
    sy += bold ? 20 : 16;
  };
  summaryRow("Subtotal", money(totals.subGbp));
  summaryRow("Shipping", money(totals.shippingGbp));
  doc
    .moveTo(summaryColX, sy)
    .lineTo(summaryColX + summaryColWidth, sy)
    .strokeColor("#94a3b8")
    .stroke();
  sy += 6;
  summaryRow("Grand Total", money(totals.totalGbp), true);
  summaryRow("Payment Due", money(totals.dueGbp));

  doc.y = Math.max(doc.y, sy) + 10;

  ensureSpace(30);
  doc.font("Helvetica").fontSize(7).fillColor("#64748b").text(INVOICE_INVALID_UNTIL_PAID_NOTICE, MARGIN, doc.y, {
    width: contentWidth,
  });
  doc.fillColor("black");

  doc.addPage();
  doc.font("Helvetica-Bold").fontSize(12).text("Invoice Notes", MARGIN, MARGIN);
  doc
    .font("Helvetica")
    .fontSize(8)
    .text(
      "Please read our terms before making the payment. By making payment you agree to below terms applied to sold stock on above invoice.",
      MARGIN,
      doc.y + 8,
      { width: contentWidth },
    );
  doc.moveDown(0.8);
  INVOICE_TERMS.forEach((term, index) => {
    ensureSpace(24);
    doc.font("Helvetica").fontSize(7.5).text(`${index + 1}. ${term}`, MARGIN, doc.y, {
      width: contentWidth,
    });
    doc.moveDown(0.4);
  });
  doc.moveDown(0.8);
  doc
    .fontSize(7.5)
    .text(`Company Registration number: ${company.companyNo}\nEORI Number: ${company.eoriNumber}`, MARGIN, doc.y, {
      width: contentWidth,
    });

  doc.end();
  return done;
}
