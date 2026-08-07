import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {
  StorageAccessFramework,
  readAsStringAsync,
  writeAsStringAsync,
  documentDirectory,
} from 'expo-file-system/legacy';
import { Platform, Alert } from 'react-native';

type Invoice = {
  id: string;
  type: 'Income' | 'Expense' | 'General';
  amount: string | number;
  description?: string | null;
  issueDate: string;
  project?: { name?: string } | null;
  client?: { name?: string } | null;
  thirdPartyName?: string | null;
};

const money = (n: number) =>
  '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const entityOf = (i: Invoice) =>
  i.project?.name || i.client?.name || i.thirdPartyName || 'Uncategorized';

const shortDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });

function periodOf(invoices: Invoice[]) {
  const times = invoices
    .map((i) => new Date(i.issueDate).getTime())
    .filter((t) => !Number.isNaN(t))
    .sort((a, b) => a - b);
  if (times.length === 0) return null;
  return { from: new Date(times[0]), to: new Date(times[times.length - 1]) };
}

function statementNumber(generatedAt: Date) {
  const y = generatedAt.getFullYear();
  const seq = Math.floor((generatedAt.getTime() / 1000) % 100000)
    .toString()
    .padStart(5, '0');
  return `SL-${y}-${seq}`;
}

function totalsOf(invoices: Invoice[]) {
  const totalIncome = invoices
    .filter((i) => i.type === 'Income')
    .reduce((s, i) => s + Number(i.amount), 0);
  const totalExpense = invoices
    .filter((i) => i.type === 'Expense' || i.type === 'General')
    .reduce((s, i) => s + Number(i.amount), 0);
  return { totalIncome, totalExpense, net: totalIncome - totalExpense };
}

export async function exportLedgerToPDF(invoices: Invoice[], contractorName: string) {
  const generatedAt = new Date();
  const { totalIncome, totalExpense, net } = totalsOf(invoices);
  const period = periodOf(invoices);
  const periodLabel = period
    ? `${shortDate(period.from.toISOString())} – ${shortDate(period.to.toISOString())}`
    : 'All time';

  const rows = invoices
    .map((i, idx) => {
      const typeClass =
        i.type === 'Income' ? 'type-income' : i.type === 'Expense' ? 'type-expense' : 'type-general';
      const amountClass = i.type === 'Income' ? 'text-green' : 'text-red';
      const zebra = idx % 2 === 1 ? ' class="zebra"' : '';
      return `
        <tr${zebra}>
          <td class="muted">${shortDate(i.issueDate)}</td>
          <td><span class="type-badge ${typeClass}">${i.type}</span></td>
          <td class="entity">${entityOf(i)}</td>
          <td class="muted">${i.description || '—'}</td>
          <td class="amount ${amountClass}">${money(Number(i.amount))}</td>
        </tr>`;
    })
    .join('');

  const html = `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          @page { margin: 40px; }
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #334155; font-size: 12px; line-height: 1.6; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0F172A; padding-bottom: 16px; margin-bottom: 22px; }
          .brand { display: flex; gap: 12px; align-items: center; }
          .logo { width: 40px; height: 40px; border-radius: 8px; background: #0F172A; color: #fff; text-align: center; line-height: 40px; font-size: 20px; font-weight: bold; }
          .brand-name { font-size: 17px; font-weight: 600; color: #0F172A; }
          .brand-sub { font-size: 11px; color: #64748B; }
          .meta { text-align: right; font-size: 11px; color: #64748B; }
          .meta strong { color: #0F172A; font-size: 12px; }
          .parties { display: flex; justify-content: space-between; margin-bottom: 22px; font-size: 11px; }
          .label { color: #94A3B8; text-transform: uppercase; letter-spacing: 0.04em; font-size: 10px; margin-bottom: 3px; }
          .party-name { font-weight: 600; color: #0F172A; font-size: 13px; }
          .summary { display: flex; gap: 12px; margin-bottom: 24px; }
          .summary-box { flex: 1; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px 14px; }
          .summary-box.net { background: #F8FAFC; border-color: #CBD5E1; }
          .summary-box h3 { margin: 0 0 4px 0; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; color: #64748B; font-weight: 600; }
          .summary-box p { margin: 0; font-size: 19px; font-weight: bold; }
          .text-green { color: #059669; }
          .text-red { color: #DC2626; }
          .text-dark { color: #0F172A; }
          table { width: 100%; border-collapse: collapse; }
          thead th { text-align: left; padding: 8px; color: #64748B; font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing: 0.03em; border-bottom: 1.5px solid #CBD5E1; }
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
          .footer { display: flex; justify-content: space-between; margin-top: 24px; padding-top: 12px; border-top: 0.5px solid #E2E8F0; font-size: 10px; color: #94A3B8; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="brand">
            <div class="logo">S</div>
            <div>
              <div class="brand-name">SiteLedger</div>
              <div class="brand-sub">Financial ledger statement</div>
            </div>
          </div>
          <div class="meta">
            <div><strong>Statement ${statementNumber(generatedAt)}</strong></div>
            <div>Issued ${shortDate(generatedAt.toISOString())}</div>
            <div>Period: ${periodLabel}</div>
          </div>
        </div>

        <div class="parties">
          <div>
            <div class="label">Prepared for</div>
            <div class="party-name">${contractorName}</div>
            <div style="color:#64748B;">Contractor</div>
          </div>
          <div style="text-align:right;">
            <div class="label">Summary</div>
            <div class="party-name">${invoices.length} transactions</div>
            <div style="color:#64748B;">Currency: USD ($)</div>
          </div>
        </div>

        <div class="summary">
          <div class="summary-box">
            <h3>Total income</h3>
            <p class="text-green">${money(totalIncome)}</p>
          </div>
          <div class="summary-box">
            <h3>Total expense</h3>
            <p class="text-red">${money(totalExpense)}</p>
          </div>
          <div class="summary-box net">
            <h3>Net balance</h3>
            <p class="${net >= 0 ? 'text-dark' : 'text-red'}">${money(net)}</p>
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
            ${rows || '<tr><td colspan="5" style="text-align:center;color:#94A3B8;padding:20px;">No transactions recorded.</td></tr>'}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="4" style="text-align:right;">Net balance</td>
              <td class="total-amount">${money(net)}</td>
            </tr>
          </tfoot>
        </table>

        <div class="footer">
          <span>Generated by SiteLedger · ${generatedAt.toLocaleString()}</span>
          <span>Confidential</span>
        </div>
      </body>
    </html>
  `;

  try {
    const { uri } = await Print.printToFileAsync({ html });

    if (Platform.OS === 'android') {
      const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (permissions.granted) {
        const base64 = await readAsStringAsync(uri, { encoding: 'base64' });
        const fileUri = await StorageAccessFramework.createFileAsync(
          permissions.directoryUri,
          `SiteLedger_Statement_${Date.now()}`,
          'application/pdf',
        );
        await StorageAccessFramework.writeAsStringAsync(fileUri, base64, { encoding: 'base64' });
        Alert.alert('Success', 'PDF saved successfully!');
      }
    } else {
      await Sharing.shareAsync(uri, {
        UTI: 'com.adobe.pdf',
        mimeType: 'application/pdf',
        dialogTitle: 'Save ledger statement',
      });
    }
  } catch (error) {
    console.error('Error generating PDF', error);
    throw error;
  }
}

export async function exportLedgerToExcel(invoices: Invoice[], contractorName: string) {
  try {
    const generatedAt = new Date();
    const { totalIncome, totalExpense, net } = totalsOf(invoices);
    const period = periodOf(invoices);
    const periodLabel = period
      ? `${shortDate(period.from.toISOString())} – ${shortDate(period.to.toISOString())}`
      : 'All time';

    // Lazy-load. xlsx-js-style is pure JS with no Node core deps (its package
    // "browser" field stubs buffer/stream/process/fs), so it's Hermes-safe.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const XLSX = require('xlsx-js-style');
    const { encode_cell } = XLSX.utils;

    const NAVY = '1E293B';
    const HEADER = 'E8EAED';
    const GREEN = '059669';
    const RED = 'DC2626';
    const INDIGO = '3730A3';
    const SLATE = '475569';
    const HAIR = 'EEF2F6';
    const MONEY_FMT = '#,##0.00';
    const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    const hairBottom = { border: { bottom: { style: 'thin', color: { rgb: HAIR } } } };
    const navyTop = { top: { style: 'medium', color: { rgb: NAVY } } };
    const setStyle = (ws: any, r: number, c: number, s: any) => {
      const addr = encode_cell({ r, c });
      ws[addr] = ws[addr] || { t: 's', v: '' };
      ws[addr].s = s;
    };

    const wb = XLSX.utils.book_new();

    // ---- Sheet 1: Transactions ----
    const titleText = `${contractorName} — Financial Ledger  (${periodLabel})`;
    const dataAoa = invoices.map((inv) => [
      shortDate(inv.issueDate),
      inv.type,
      entityOf(inv),
      inv.description || '',
      Number(inv.amount),
    ]);
    const aoa: any[][] = [
      [titleText, '', '', '', ''],
      ['Date', 'Type', 'Entity', 'Description', 'Amount'],
      ...dataAoa,
      ['', '', '', 'Net balance', net],
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [{ wch: 14 }, { wch: 12 }, { wch: 26 }, { wch: 34 }, { wch: 16 }];
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }];
    ws['!rows'] = [{ hpt: 22 }];

    setStyle(ws, 0, 0, {
      font: { bold: true, sz: 13, color: { rgb: 'FFFFFF' } },
      fill: { patternType: 'solid', fgColor: { rgb: NAVY } },
      alignment: { vertical: 'center', horizontal: 'left', indent: 1 },
    });
    for (let c = 0; c < 5; c++) {
      setStyle(ws, 1, c, {
        font: { bold: true, color: { rgb: NAVY } },
        fill: { patternType: 'solid', fgColor: { rgb: HEADER } },
        alignment: { vertical: 'center', horizontal: c === 4 ? 'right' : 'left' },
        border: { bottom: { style: 'thin', color: { rgb: 'CBD5E1' } } },
      });
    }

    invoices.forEach((inv, idx) => {
      const r = 2 + idx;
      const typeColor = inv.type === 'Income' ? GREEN : inv.type === 'Expense' ? RED : INDIGO;
      const amtColor = inv.type === 'Income' ? GREEN : RED;
      setStyle(ws, r, 0, hairBottom);
      setStyle(ws, r, 1, { font: { bold: true, color: { rgb: typeColor } }, ...hairBottom });
      setStyle(ws, r, 2, hairBottom);
      setStyle(ws, r, 3, hairBottom);
      setStyle(ws, r, 4, {
        font: { color: { rgb: amtColor } },
        numFmt: MONEY_FMT,
        alignment: { horizontal: 'right' },
        ...hairBottom,
      });
    });

    const totalR = 2 + invoices.length;
    setStyle(ws, totalR, 0, { border: navyTop });
    setStyle(ws, totalR, 1, { border: navyTop });
    setStyle(ws, totalR, 2, { border: navyTop });
    setStyle(ws, totalR, 3, { font: { bold: true }, alignment: { horizontal: 'right' }, border: navyTop });
    if (invoices.length > 0) {
      const fr = 3;
      const lr = 2 + invoices.length;
      ws[encode_cell({ r: totalR, c: 4 })] = {
        t: 'n',
        v: net,
        f: `SUMIF(B${fr}:B${lr},"Income",E${fr}:E${lr})-SUMIF(B${fr}:B${lr},"Expense",E${fr}:E${lr})-SUMIF(B${fr}:B${lr},"General",E${fr}:E${lr})`,
      };
      ws['!autofilter'] = { ref: `A2:E${lr}` };
    }
    setStyle(ws, totalR, 4, { font: { bold: true }, numFmt: MONEY_FMT, alignment: { horizontal: 'right' }, border: navyTop });

    XLSX.utils.book_append_sheet(wb, ws, 'Transactions');

    // ---- Sheet 2: Summary ----
    const sumWs = XLSX.utils.aoa_to_sheet([
      ['Contractor', contractorName],
      ['Period', periodLabel],
      ['Transactions', invoices.length],
      [],
      ['Total income', totalIncome],
      ['Total expense', totalExpense],
      ['Net balance', net],
    ]);
    sumWs['!cols'] = [{ wch: 22 }, { wch: 18 }];
    [0, 1, 2, 4, 5, 6].forEach((r) =>
      setStyle(sumWs, r, 0, { font: { color: { rgb: SLATE }, bold: r === 6 } }),
    );
    setStyle(sumWs, 4, 1, { numFmt: MONEY_FMT, font: { bold: true, color: { rgb: GREEN } } });
    setStyle(sumWs, 5, 1, { numFmt: MONEY_FMT, font: { bold: true, color: { rgb: RED } } });
    setStyle(sumWs, 6, 1, { numFmt: MONEY_FMT, font: { bold: true } });
    XLSX.utils.book_append_sheet(wb, sumWs, 'Summary');

    // ---- Sheet 3: By project / entity ----
    const byEntity = new Map<string, { income: number; expense: number }>();
    invoices.forEach((inv) => {
      const key = entityOf(inv);
      const cur = byEntity.get(key) || { income: 0, expense: 0 };
      if (inv.type === 'Income') cur.income += Number(inv.amount);
      else cur.expense += Number(inv.amount);
      byEntity.set(key, cur);
    });
    const projRows = Array.from(byEntity.entries())
      .sort((a, b) => b[1].income - b[1].expense - (a[1].income - a[1].expense))
      .map(([name, v]) => [name, v.income, v.expense, v.income - v.expense]);
    const projWs = XLSX.utils.aoa_to_sheet([
      ['Project / client / party', 'Income', 'Expense', 'Net'],
      ...projRows,
    ]);
    projWs['!cols'] = [{ wch: 28 }, { wch: 16 }, { wch: 16 }, { wch: 16 }];
    for (let c = 0; c < 4; c++) {
      setStyle(projWs, 0, c, {
        font: { bold: true, color: { rgb: NAVY } },
        fill: { patternType: 'solid', fgColor: { rgb: HEADER } },
      });
    }
    projRows.forEach((_, i) =>
      [1, 2, 3].forEach((c) => setStyle(projWs, i + 1, c, { numFmt: MONEY_FMT })),
    );
    XLSX.utils.book_append_sheet(wb, projWs, 'By project');

    // ---- Write & save ----
    const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
    const fileName = `SiteLedger_Ledger_${Date.now()}`;

    if (Platform.OS === 'android') {
      const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (permissions.granted) {
        const fileUri = await StorageAccessFramework.createFileAsync(
          permissions.directoryUri,
          fileName,
          XLSX_MIME,
        );
        await StorageAccessFramework.writeAsStringAsync(fileUri, base64, { encoding: 'base64' });
        Alert.alert('Success', 'Excel workbook saved successfully!');
      }
    } else {
      const fileUri = `${documentDirectory}${fileName}.xlsx`;
      await writeAsStringAsync(fileUri, base64, { encoding: 'base64' });
      await Sharing.shareAsync(fileUri, {
        mimeType: XLSX_MIME,
        UTI: 'org.openxmlformats.spreadsheetml.sheet',
        dialogTitle: 'Save ledger workbook',
      });
    }
  } catch (error) {
    console.error('Error generating Excel', error);
    throw error;
  }
}
