import { membership, areaName, today } from './shared.js';

const xml = value => String(value ?? '')
  .replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;'
  }[character]))
  .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');

const encoder = new TextEncoder();

function column(index) {
  let result = '';

  for (index++; index; index = Math.floor((index - 1) / 26)) {
    result = String.fromCharCode(65 + ((index - 1) % 26)) + result;
  }

  return result;
}

function worksheet(rows) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetViews>
    <sheetView workbookViewId="0">
      <pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>
    </sheetView>
  </sheetViews>
  <cols>
    ${rows[0].map((_, index) =>
      `<col min="${index + 1}" max="${index + 1}" width="${index === 1 ? 32 : 22}" customWidth="1"/>`
    ).join('')}
  </cols>
  <sheetData>
    ${rows.map((row, rowIndex) =>
      `<row r="${rowIndex + 1}">${
        row.map((value, columnIndex) => {
          const cell = `${column(columnIndex)}${rowIndex + 1}`;

          if (typeof value === 'number' && Number.isFinite(value)) {
            return `<c r="${cell}" s="${rowIndex === 0 ? 1 : 0}" t="n"><v>${value}</v></c>`;
          }

          return `<c r="${cell}" s="${rowIndex === 0 ? 1 : 0}" t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`;
        }).join('')
      }</row>`
    ).join('')}
  </sheetData>
  <autoFilter ref="A1:${column(rows[0].length - 1)}${rows.length}"/>
</worksheet>`;
}

function crc32(bytes) {
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc ^= byte;

    for (let bit = 0; bit < 8; bit++) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function zip(files) {
  const parts = [];
  const centralDirectory = [];
  let offset = 0;
  let centralSize = 0;

  for (const [name, content] of Object.entries(files)) {
    const nameBytes = encoder.encode(name);
    const contentBytes = encoder.encode(content);
    const checksum = crc32(contentBytes);

    const header = new Uint8Array(30 + nameBytes.length);
    const headerView = new DataView(header.buffer);

    headerView.setUint32(0, 0x04034b50, true);
    headerView.setUint16(4, 20, true);
    headerView.setUint32(14, checksum, true);
    headerView.setUint32(18, contentBytes.length, true);
    headerView.setUint32(22, contentBytes.length, true);
    headerView.setUint16(26, nameBytes.length, true);
    header.set(nameBytes, 30);

    parts.push(header, contentBytes);

    const directoryEntry = new Uint8Array(46 + nameBytes.length);
    const directoryView = new DataView(directoryEntry.buffer);

    directoryView.setUint32(0, 0x02014b50, true);
    directoryView.setUint16(4, 20, true);
    directoryView.setUint16(6, 20, true);
    directoryView.setUint32(16, checksum, true);
    directoryView.setUint32(20, contentBytes.length, true);
    directoryView.setUint32(24, contentBytes.length, true);
    directoryView.setUint16(28, nameBytes.length, true);
    directoryView.setUint32(42, offset, true);
    directoryEntry.set(nameBytes, 46);

    centralDirectory.push(directoryEntry);
    centralSize += directoryEntry.length;
    offset += header.length + contentBytes.length;
  }

  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);

  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, centralDirectory.length, true);
  endView.setUint16(10, centralDirectory.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);

  return new Blob(
    [...parts, ...centralDirectory, end],
    { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
  );
}

export function createRegisterWorkbook(members, payments, comments) {
  const sheets = [
    [
      'Miembros',
      [
        ['Número', 'Nombre completo', 'Edad', 'Modalidad', 'Inicio', 'Meses', 'Vencimiento', 'Estado', 'Días restantes'],
        ...members.map(member => {
          const status = membership(member);

          return [
            member.id,
            member.name,
            member.age,
            areaName(member.area),
            member.start,
            member.months,
            status.end,
            status.label,
            status.days
          ];
        })
      ]
    ],
    [
      'Pagos',
      [
        ['Identificador', 'Miembro', 'Número de miembro', 'Importe MXN', 'Forma de pago', 'Inicio del periodo', 'Meses', 'Fecha de registro'],
        ...payments.map(payment => [
          payment.id,
          payment.member_name,
          payment.member_id,
          payment.amount,
          payment.method,
          payment.start,
          payment.months,
          payment.created_at
        ])
      ]
    ],
    [
      'Comentarios',
      [
        ['Identificador', 'Nombre', 'Mensaje', 'Fecha', 'Estado', 'Tipo'],
        ...comments.map(comment => [
          comment.id,
          comment.name || 'Anónimo',
          comment.message,
          comment.created_at,
          comment.reviewed ? 'Leído' : 'Nuevo',
          comment.example ? 'Ejemplo ficticio' : 'Mensaje recibido'
        ])
      ]
    ]
  ];

  const files = {
    '[Content_Types].xml':
      `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
        <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
        <Default Extension="xml" ContentType="application/xml"/>
        <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
        <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
        ${sheets.map((_, index) =>
          `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
        ).join('')}
      </Types>`,
    '_rels/.rels':
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    'xl/workbook.xml':
      `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
        <sheets>${sheets.map(([name], index =>
          `<sheet name="${name}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`
        ).join('')}</sheets>
      </workbook>`,
    'xl/_rels/workbook.xml.rels':
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        ${sheets.map((_, index) =>
          `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`
        ).join('')}
        <Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
      </Relationships>`,
    'xl/styles.xml':
      '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="12"/><name val="Calibri"/></font><font><b/><sz val="12"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF202126"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf fontId="0" fillId="0" borderId="0" xfId="0"/><xf fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>'
  };

  sheets.forEach(([, rows], index) => {
    files[`xl/worksheets/sheet${index + 1}.xml`] = worksheet(rows);
  });

  return zip(files);
}

export function downloadRegister(members, payments, comments) {
  const workbook = createRegisterWorkbook(members, payments, comments);
  const url = URL.createObjectURL(workbook);
  const link = document.createElement('a');

  link.href = url;
  link.download = `IRON-PANTHERS-registro-${today()}.xlsx`;
  document.body.append(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 10000);
}