// processPDFs.mjs
import { readdir, rename, readFile, writeFile } from 'fs/promises';
import { join, extname, basename, resolve } from 'path';
import pdfToPrinter from 'pdf-to-printer';
import { PDFDocument, degrees } from 'pdf-lib';
import { exec } from 'child_process';


const { print } = pdfToPrinter;

/**
 * Rotate the PDF pages by 180 degrees.
 *
 * @param {string} filePath - The path to the PDF file.
 * @returns {string} - The path to the rotated PDF file.
 */
export async function rotatePDF(filePath) {
  const pdfBytes = await readFile(filePath);
  const pdfDoc = await PDFDocument.load(pdfBytes);

  const pages = pdfDoc.getPages();
  pages.forEach(page => {
    page.setRotation(degrees(180));
  });

  const rotatedPdfBytes = await pdfDoc.save();
  const rotatedFilePath = filePath.replace('.pdf', '-rotated.pdf');
  await writeFile(rotatedFilePath, rotatedPdfBytes);

  return rotatedFilePath;
}

/**
 * Process PDF documents from source to destination after printing.
 *
 * @param {string} source - The source directory containing PDF files.
 * @param {string} destination - The destination directory for processed PDF files.
 * @param {string} printerName - The name of the printer to send PDFs to.
 */
export async function processPDFs(source, destination, printerName) {
  try {
    // Resolve full paths
    const sourceDir = resolve(source);
    const destinationDir = resolve(destination);

    // Read the files in the source directory
    const files = await readdir(sourceDir);

    // Filter PDF files
    const pdfFiles = files.filter(file => extname(file).toLowerCase() === '.pdf');

    // Loop through each PDF file
    for (const file of pdfFiles) {
      const filePath = join(sourceDir, file);

      // Rotate the PDF pages
      const rotatedFilePath = await rotatePDF(filePath);

      // Print the PDF
      try {
        console.log(`Printing file: ${rotatedFilePath}`);
        await print(rotatedFilePath, {
          printer: printerName,
          options: [
            '-o media=Custom.100x50mm', // Custom paper size
            // '-o landscape' // Optional: remove if you don't want landscape
          ]
        });
        console.log(`Printed file: ${rotatedFilePath}`);
      } catch (printError) {
        console.error(`Error printing file ${rotatedFilePath}:`, printError);
        continue; // Skip moving the file if printing failed
      }

      // Define the new file name with 'processed' appended
      const newFileName = `${basename(file, '.pdf')}-processed.pdf`;
      const newFilePath = join(destinationDir, newFileName);

      // Move the file to the destination directory with the new name
      try {
        await rename(filePath, newFilePath);
        console.log(`Moved file: ${file} -> ${newFileName}`);
      } catch (moveError) {
        console.error(`Error moving file ${filePath} to ${newFilePath}:`, moveError);
      }
    }

    console.log('All PDFs processed.');
  } catch (error) {
    console.error('Error processing PDFs:', error);
  }
}

/**
 * Get a list of currently installed printers.
 *
 * @returns {Promise<string[]>} - A promise that resolves to an array of printer names.
 */
export async function getInstalledPrinters() {
  return new Promise((resolve, reject) => {
    exec('wmic printer get name', (error, stdout, stderr) => {
      if (error) {
        console.error('Error fetching printers:', error);
        return reject(error);
      }
      const printers = stdout.split('\n')
        .map(line => line.trim())
        .filter(line => line && line !== 'Name');
      resolve(printers);
    });
  });
}
