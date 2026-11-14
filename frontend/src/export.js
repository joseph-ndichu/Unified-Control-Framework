// Save a table as a CSV file that opens cleanly in Excel.

// Quote a value, and defuse cells a spreadsheet would run as a formula.
function cell(value) {
  let text = value == null ? '' : String(value)
  if (/^[=+@\t\r]/.test(text) || /^-\D/.test(text)) text = "'" + text
  return `"${text.replaceAll('"', '""')}"`
}

export function downloadCsv(filename, headers, rows) {
  const lines = [headers, ...rows].map((row) => row.map(cell).join(','))
  // The leading mark tells Excel the file is UTF-8.
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  // Freeing the file at once can cancel the download in some browsers, so wait a moment.
  setTimeout(() => URL.revokeObjectURL(link.href), 1000)
}

// "NCA ECC" -> "nca-ecc", for file names.
export const slug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
