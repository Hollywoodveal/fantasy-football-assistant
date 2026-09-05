const MAX_PDF_BYTES = 10 * 1024 * 1024
const MAX_PDF_PAGES = 10

type PdfTextItem = {
  str?: string
  hasEOL?: boolean
}

export async function extractPdfText(file: File) {
  if (file.size > MAX_PDF_BYTES) throw new Error('Choose an ESPN PDF smaller than 10 MB.')

  const [{ GlobalWorkerOptions, getDocument }, workerModule] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ])
  GlobalWorkerOptions.workerSrc = workerModule.default

  const loadingTask = getDocument({ data: new Uint8Array(await file.arrayBuffer()) })
  try {
    const document = await loadingTask.promise
    if (document.numPages > MAX_PDF_PAGES) throw new Error('Choose an ESPN cheat sheet with 10 pages or fewer.')

    const pageNumbers = Array.from({ length: document.numPages }, (_, index) => index + 1)
    const pages = await Promise.all(pageNumbers.map(async (pageNumber) => {
      const page = await document.getPage(pageNumber)
      const content = await page.getTextContent()
      return content.items.map((item) => {
        const textItem = item as PdfTextItem
        return `${textItem.str ?? ''}${textItem.hasEOL ? '\n' : ' '}`
      }).join('')
    }))
    return pages.join('\n')
  } finally {
    await loadingTask.destroy()
  }
}
