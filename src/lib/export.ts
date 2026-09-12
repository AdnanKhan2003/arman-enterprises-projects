import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';

// ==========================================
// Types & Interfaces
// ==========================================

export type ExportInvoiceItem = {
  id?: string;
  type: 'Income' | 'Expense' | 'General';
  amount: string | number;
  description?: string | null;
  issueDate: string;
  project?: { name?: string } | null;
  client?: { name?: string } | null;
  thirdPartyName?: string | null;
};

export type ExportOptions = {
  /** Project this document covers. Omitted for a general statement. */
  projectName?: string;
  /** ISO Currency code, defaults to 'USD' */
  currencyCode?: string;
  /** BCP 47 language tag, defaults to 'en-US' */
  locale?: string;
};

export type LedgerTotals = {
  totalIncome: number;
  totalExpense: number;
  net: number;
};

export interface XlsxCellStyle {
  font?: {
    bold?: boolean;
    sz?: number;
    color?: { rgb: string };
    name?: string;
  };
  fill?: {
    patternType?: string;
    fgColor?: { rgb: string };
  };
  alignment?: {
    vertical?: 'top' | 'center' | 'bottom';
    horizontal?: 'left' | 'center' | 'right';
    indent?: number;
    wrapText?: boolean;
  };
  border?: {
    top?: { style: string; color: { rgb: string } };
    bottom?: { style: string; color: { rgb: string } };
    left?: { style: string; color: { rgb: string } };
    right?: { style: string; color: { rgb: string } };
  };
  numFmt?: string;
}

// ==========================================
// Intl & Date Formatting Helpers
// ==========================================

/**
 * Parses YYYY-MM-DD strings safely in local time to avoid UTC timezone day-shift bugs.
 */
export function parseLocalDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  const raw = dateStr.split('T')[0];
  const parts = raw.split('-').map(Number);
  if (parts.length === 3 && !parts.some(Number.isNaN)) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  const fallback = new Date(dateStr);
  return Number.isNaN(fallback.getTime()) ? new Date() : fallback;
}

/**
 * Formats a number or string into a standardized localized currency string using Intl.
 */
export function formatCurrency(
  amount: number | string,
  locale: string = 'en-US',
  currency: string = 'USD',
): string {
  const num = typeof amount === 'number' ? amount : Number(amount) || 0;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Formats a Date or date string into a localized short date string using Intl.
 */
export function formatDate(
  date: Date | string,
  locale: string = 'en-US',
  options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' },
): string {
  const d = typeof date === 'string' ? parseLocalDate(date) : date;
  return new Intl.DateTimeFormat(locale, options).format(d);
}

/**
 * Sanitizes HTML to prevent XSS injection in generated document templates.
 */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Returns the entity/counterparty name for a given invoice item.
 */
export function entityOf(item: ExportInvoiceItem): string {
  return item.project?.name || item.client?.name || item.thirdPartyName || 'Uncategorized';
}

/**
 * Computes start and end dates from an array of invoice items.
 */
export function calculatePeriod(items: ExportInvoiceItem[]) {
  const times = items
    .map((i) => parseLocalDate(i.issueDate).getTime())
    .filter((t) => !Number.isNaN(t))
    .sort((a, b) => a - b);

  if (times.length === 0) return null;
  return { from: new Date(times[0]), to: new Date(times[times.length - 1]) };
}

/**
 * Generates a human-friendly invoice reference number.
 */
export function generateInvoiceNumber(generatedAt: Date): string {
  const year = generatedAt.getFullYear();
  const sequence = Math.floor((generatedAt.getTime() / 1000) % 100000)
    .toString()
    .padStart(5, '0');
  return `SL-${year}-${sequence}`;
}

/**
 * Calculates total income, expenses, and net balance.
 */
export function calculateLedgerTotals(items: ExportInvoiceItem[]): LedgerTotals {
  const totalIncome = items
    .filter((i) => i.type === 'Income')
    .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

  const totalExpense = items
    .filter((i) => i.type === 'Expense' || i.type === 'General')
    .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

  return {
    totalIncome,
    totalExpense,
    net: totalIncome - totalExpense,
  };
}

// ==========================================
// HTML Template Generation
// ==========================================

export function generateInvoiceHtml(
  items: ExportInvoiceItem[],
  contractorName: string,
  options: ExportOptions = {},
): string {
  const locale = options.locale || 'en-US';
  const currency = options.currencyCode || 'USD';
  const projectName = options.projectName;
  const generatedAt = new Date();
  const totals = calculateLedgerTotals(items);
  const period = calculatePeriod(items);
  const periodLabel = period
    ? `${formatDate(period.from, locale)} – ${formatDate(period.to, locale)}`
    : 'All time';

  const rowsHtml = items
    .map((item, index) => {
      const typeClass =
        item.type === 'Income' ? 'type-income' : item.type === 'Expense' ? 'type-expense' : 'type-general';
      const amountClass = item.type === 'Income' ? 'text-green' : 'text-red';
      const zebra = index % 2 === 1 ? ' class="zebra"' : '';

      return `
        <tr${zebra}>
          <td class="muted">${formatDate(item.issueDate, locale)}</td>
          <td><span class="type-badge ${typeClass}">${item.type}</span></td>
          <td class="entity">${escapeHtml(entityOf(item))}</td>
          <td class="muted">${item.description ? escapeHtml(item.description) : '—'}</td>
          <td class="amount ${amountClass}">${formatCurrency(item.amount, locale, currency)}</td>
        </tr>`;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html lang="${locale}">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>SiteLedger Invoice</title>
        <style>
          @page { margin: 40px; }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #334155;
            font-size: 12px;
            line-height: 1.6;
            margin: 0;
            padding: 0;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #0F172A;
            padding-bottom: 16px;
            margin-bottom: 22px;
          }
          .brand { display: flex; gap: 12px; align-items: center; }
          .logo {
            width: 40px;
            height: 40px;
            border-radius: 8px;
            background: #0F172A;
            color: #ffffff;
            text-align: center;
            line-height: 40px;
            font-size: 20px;
            font-weight: bold;
          }
          .brand-name { font-size: 17px; font-weight: 600; color: #0F172A; }
          .brand-sub { font-size: 11px; color: #64748B; }
          .meta { text-align: right; font-size: 11px; color: #64748B; }
          .meta strong { color: #0F172A; font-size: 12px; }
          .parties { display: flex; justify-content: space-between; margin-bottom: 22px; font-size: 11px; }
          .label { color: #94A3B8; text-transform: uppercase; letter-spacing: 0.04em; font-size: 10px; margin-bottom: 3px; }
          .party-name { font-weight: 600; color: #0F172A; font-size: 13px; }
          .summary { display: flex; gap: 12px; margin-bottom: 24px; }
          .summary-box { flex: 1; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px 14px; background: #FFFFFF; }
          .summary-box.net { background: #F8FAFC; border-color: #CBD5E1; }
          .summary-box h3 { margin: 0 0 4px 0; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; color: #64748B; font-weight: 600; }
          .summary-box p { margin: 0; font-size: 19px; font-weight: bold; }
          .text-green { color: #059669; }
          .text-red { color: #DC2626; }
          .text-dark { color: #0F172A; }
          table { width: 100%; border-collapse: collapse; }
          thead th {
            text-align: left;
            padding: 8px;
            color: #64748B;
            font-weight: 600;
            text-transform: uppercase;
            font-size: 10px;
            letter-spacing: 0.03em;
            border-bottom: 1.5px solid #CBD5E1;
          }
          thead th.amount { text-align: right; }
          tbody td { padding: 8px; border-bottom: 0.5px solid #EEF2F6; }
          tr.zebra { background: #FAFBFC; }
          td.muted { color: #64748B; }
          td.entity { color: #0F172A; }
          td.amount { text-align: right; font-weight: 600; }
          tfoot td { padding: 10px 8px; border-top: 1.5px solid #0F172A; font-weight: bold; color: #0F172A; }
          tfoot td.total-amount { text-align: right; font-size: 13px; }
          .type-badge { padding: 2px 7px; border-radius: 4px; font-size: 10px; font-weight: bold; }
          .type-income { background: #D1FAE5; color: #065F46; }
          .type-expense { background: #FEE2E2; color: #991B1B; }
          .type-general { background: #E0E7FF; color: #3730A3; }
          .footer {
            display: flex;
            justify-content: space-between;
            margin-top: 24px;
            padding-top: 12px;
            border-top: 0.5px solid #E2E8F0;
            font-size: 10px;
            color: #94A3B8;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="brand">
            <div class="logo">S</div>
            <div>
              <div class="brand-name">SiteLedger</div>
              <div class="brand-sub">${projectName ? escapeHtml(projectName) : 'Financial Statement'}</div>
            </div>
          </div>
          <div class="meta">
            <div><strong>Invoice ${generateInvoiceNumber(generatedAt)}</strong></div>
            <div>Issued ${formatDate(generatedAt, locale)}</div>
            <div>Period: ${periodLabel}</div>
          </div>
        </div>

        <div class="parties">
          <div>
            <div class="label">Prepared for</div>
            <div class="party-name">${escapeHtml(contractorName)}</div>
            <div style="color:#64748B;">Contractor</div>
          </div>
          <div style="text-align:right;">
            <div class="label">${projectName ? 'Project' : 'Summary'}</div>
            <div class="party-name">${projectName ? escapeHtml(projectName) : items.length + ' transactions'}</div>
            <div style="color:#64748B;">${items.length} transactions · ${currency}</div>
          </div>
        </div>

        <div class="summary">
          <div class="summary-box">
            <h3>Total income</h3>
            <p class="text-green">${formatCurrency(totals.totalIncome, locale, currency)}</p>
          </div>
          <div class="summary-box">
            <h3>Total expense</h3>
            <p class="text-red">${formatCurrency(totals.totalExpense, locale, currency)}</p>
          </div>
          <div class="summary-box net">
            <h3>Net balance</h3>
            <p class="${totals.net >= 0 ? 'text-dark' : 'text-red'}">${formatCurrency(totals.net, locale, currency)}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Project / client / party</th>
              <th>Description</th>
              <th class="amount">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="5" style="text-align:center;color:#94A3B8;padding:20px;">No transactions recorded.</td></tr>'}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="4" style="text-align:right;">Net balance</td>
              <td class="total-amount">${formatCurrency(totals.net, locale, currency)}</td>
            </tr>
          </tfoot>
        </table>

        <div class="footer">
          <span>Generated by SiteLedger · ${formatDate(generatedAt, locale)}</span>
          <span>Confidential</span>
        </div>
      </body>
    </html>
  `;
}

// ==========================================
// PDF Export Function
// ==========================================

export async function exportLedgerToPDF(
  items: ExportInvoiceItem[],
  contractorName: string,
  options: ExportOptions = {},
): Promise<void> {
  const html = generateInvoiceHtml(items, contractorName, options);

  try {
    const { uri } = await Print.printToFileAsync({ html });

    // Copy to unique cache file path and open system sharing sheet
    const dest = new File(Paths.cache, `SiteLedger_Invoice_${Date.now()}.pdf`);
    if (dest.exists) dest.delete();
    new File(uri).copy(dest);

    await Sharing.shareAsync(dest.uri, {
      UTI: 'com.adobe.pdf',
      mimeType: 'application/pdf',
      dialogTitle: 'Save Invoice PDF',
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}

// ==========================================
// Excel Export Function (xlsx-js-style)
// ==========================================

export async function exportLedgerToExcel(
  items: ExportInvoiceItem[],
  contractorName: string,
  options: ExportOptions = {},
): Promise<void> {
  const locale = options.locale || 'en-US';
  const currency = options.currencyCode || 'USD';
  const generatedAt = new Date();
  const totals = calculateLedgerTotals(items);
  const period = calculatePeriod(items);
  const periodLabel = period
    ? `${formatDate(period.from, locale)} – ${formatDate(period.to, locale)}`
    : 'All time';

  try {
    // xlsx-js-style is pure JS with no Node core deps (Hermes safe)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const XLSX = require('xlsx-js-style');
    const { encode_cell } = XLSX.utils;

    const THEME = {
      NAVY: '1E293B',
      HEADER: 'E8EAED',
      GREEN: '059669',
      RED: 'DC2626',
      INDIGO: '3730A3',
      SLATE: '475569',
      HAIR: 'EEF2F6',
      MONEY_FMT: '#,##0.00',
      XLSX_MIME: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };

    const hairBottom = { border: { bottom: { style: 'thin', color: { rgb: THEME.HAIR } } } };
    const navyTop = { top: { style: 'medium', color: { rgb: THEME.NAVY } } };

    const setCellStyle = (ws: any, row: number, col: number, style: XlsxCellStyle) => {
      const addr = encode_cell({ r: row, c: col });
      ws[addr] = ws[addr] || { t: 's', v: '' };
      ws[addr].s = style;
    };

    const workbook = XLSX.utils.book_new();

    // ------------------------------------------
    // Sheet 1: Transactions
    // ------------------------------------------
    const titleText = `${contractorName} — Financial Ledger (${periodLabel})`;
    const dataRows = items.map((inv) => [
      formatDate(inv.issueDate, locale),
      inv.type,
      entityOf(inv),
      inv.description || '',
      Number(inv.amount),
    ]);

    const aoa: (string | number)[][] = [
      [titleText, '', '', '', ''],
      ['Date', 'Type', 'Entity', 'Description', `Amount (${currency})`],
      ...dataRows,
      ['', '', '', 'Net balance', totals.net],
    ];

    const wsTransactions = XLSX.utils.aoa_to_sheet(aoa);
    wsTransactions['!cols'] = [{ wch: 14 }, { wch: 12 }, { wch: 26 }, { wch: 34 }, { wch: 18 }];
    wsTransactions['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }];
    wsTransactions['!rows'] = [{ hpt: 22 }];

    // Header Title Style
    setCellStyle(wsTransactions, 0, 0, {
      font: { bold: true, sz: 13, color: { rgb: 'FFFFFF' } },
      fill: { patternType: 'solid', fgColor: { rgb: THEME.NAVY } },
      alignment: { vertical: 'center', horizontal: 'left', indent: 1 },
    });

    // Column Headers Style
    for (let col = 0; col < 5; col++) {
      setCellStyle(wsTransactions, 1, col, {
        font: { bold: true, color: { rgb: THEME.NAVY } },
        fill: { patternType: 'solid', fgColor: { rgb: THEME.HEADER } },
        alignment: { vertical: 'center', horizontal: col === 4 ? 'right' : 'left' },
        border: { bottom: { style: 'thin', color: { rgb: 'CBD5E1' } } },
      });
    }

    // Row Data Styles
    items.forEach((inv, idx) => {
      const row = 2 + idx;
      const typeColor = inv.type === 'Income' ? THEME.GREEN : inv.type === 'Expense' ? THEME.RED : THEME.INDIGO;
      const amtColor = inv.type === 'Income' ? THEME.GREEN : THEME.RED;

      setCellStyle(wsTransactions, row, 0, hairBottom);
      setCellStyle(wsTransactions, row, 1, { font: { bold: true, color: { rgb: typeColor } }, ...hairBottom });
      setCellStyle(wsTransactions, row, 2, hairBottom);
      setCellStyle(wsTransactions, row, 3, hairBottom);
      setCellStyle(wsTransactions, row, 4, {
        font: { color: { rgb: amtColor } },
        numFmt: THEME.MONEY_FMT,
        alignment: { horizontal: 'right' },
        ...hairBottom,
      });
    });

    // Total Row & Excel SUMIF Formula
    const totalRow = 2 + items.length;
    setCellStyle(wsTransactions, totalRow, 0, { border: navyTop });
    setCellStyle(wsTransactions, totalRow, 1, { border: navyTop });
    setCellStyle(wsTransactions, totalRow, 2, { border: navyTop });
    setCellStyle(wsTransactions, totalRow, 3, { font: { bold: true }, alignment: { horizontal: 'right' }, border: navyTop });

    if (items.length > 0) {
      const firstRow = 3;
      const lastRow = 2 + items.length;
      wsTransactions[encode_cell({ r: totalRow, c: 4 })] = {
        t: 'n',
        v: totals.net,
        f: `SUMIF(B${firstRow}:B${lastRow},"Income",E${firstRow}:E${lastRow})-SUMIF(B${firstRow}:B${lastRow},"Expense",E${firstRow}:E${lastRow})-SUMIF(B${firstRow}:B${lastRow},"General",E${firstRow}:E${lastRow})`,
      };
      wsTransactions['!autofilter'] = { ref: `A2:E${lastRow}` };
    }

    setCellStyle(wsTransactions, totalRow, 4, {
      font: { bold: true },
      numFmt: THEME.MONEY_FMT,
      alignment: { horizontal: 'right' },
      border: navyTop,
    });

    XLSX.utils.book_append_sheet(workbook, wsTransactions, 'Transactions');

    // ------------------------------------------
    // Sheet 2: Summary
    // ------------------------------------------
    const summaryAoa = [
      ['Contractor', contractorName],
      ['Period', periodLabel],
      ['Transactions', items.length],
      ['Currency', currency],
      [],
      ['Total income', totals.totalIncome],
      ['Total expense', totals.totalExpense],
      ['Net balance', totals.net],
    ];

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryAoa);
    wsSummary['!cols'] = [{ wch: 22 }, { wch: 20 }];
    [0, 1, 2, 3, 5, 6, 7].forEach((r) =>
      setCellStyle(wsSummary, r, 0, { font: { color: { rgb: THEME.SLATE }, bold: r === 7 } }),
    );
    setCellStyle(wsSummary, 5, 1, { numFmt: THEME.MONEY_FMT, font: { bold: true, color: { rgb: THEME.GREEN } } });
    setCellStyle(wsSummary, 6, 1, { numFmt: THEME.MONEY_FMT, font: { bold: true, color: { rgb: THEME.RED } } });
    setCellStyle(wsSummary, 7, 1, { numFmt: THEME.MONEY_FMT, font: { bold: true } });

    XLSX.utils.book_append_sheet(workbook, wsSummary, 'Summary');

    // ------------------------------------------
    // Sheet 3: By project / entity
    // ------------------------------------------
    const byEntityMap = new Map<string, { income: number; expense: number }>();
    items.forEach((item) => {
      const key = entityOf(item);
      const current = byEntityMap.get(key) || { income: 0, expense: 0 };
      if (item.type === 'Income') current.income += Number(item.amount) || 0;
      else current.expense += Number(item.amount) || 0;
      byEntityMap.set(key, current);
    });

    const projectRows = Array.from(byEntityMap.entries())
      .sort((a, b) => b[1].income - b[1].expense - (a[1].income - a[1].expense))
      .map(([name, val]) => [name, val.income, val.expense, val.income - val.expense]);

    const projectAoa = [
      ['Project / client / party', 'Income', 'Expense', 'Net'],
      ...projectRows,
    ];

    const wsProject = XLSX.utils.aoa_to_sheet(projectAoa);
    wsProject['!cols'] = [{ wch: 28 }, { wch: 16 }, { wch: 16 }, { wch: 16 }];

    for (let col = 0; col < 4; col++) {
      setCellStyle(wsProject, 0, col, {
        font: { bold: true, color: { rgb: THEME.NAVY } },
        fill: { patternType: 'solid', fgColor: { rgb: THEME.HEADER } },
      });
    }

    projectRows.forEach((_, idx) => {
      [1, 2, 3].forEach((col) => setCellStyle(wsProject, idx + 1, col, { numFmt: THEME.MONEY_FMT }));
    });

    XLSX.utils.book_append_sheet(workbook, wsProject, 'By project');

    // ------------------------------------------
    // Write Binary & Share (SDK 57 File API)
    // ------------------------------------------
    const arrayBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
    const file = new File(Paths.cache, `SiteLedger_Invoice_${Date.now()}.xlsx`);
    if (file.exists) file.delete();
    file.create();
    file.write(new Uint8Array(arrayBuffer));

    await Sharing.shareAsync(file.uri, {
      mimeType: THEME.XLSX_MIME,
      UTI: 'org.openxmlformats.spreadsheetml.sheet',
      dialogTitle: 'Save Invoice Spreadsheet',
    });
  } catch (error) {
    console.error('Error generating Excel:', error);
    throw error;
  }
}
