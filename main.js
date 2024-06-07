// server.mjs
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { processPDFs, getInstalledPrinters } from './services.js';

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors());

// Parse JSON bodies (as sent by API clients)
app.use(express.json());

app.get('/printers', async (req, res) => {
  try {
    const printers = await getInstalledPrinters();
    res.json({ printers });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching printers' });
  }
});

app.post('/process-pdfs', async (req, res) => {
  const { source = process.env.SOURCE_DIRECTORY, 
          destination = process.env.DESTINATION_DIRECTORY, 
          printer = process.env.PRINTER_NAME, fileName 
        } = req.body;

  if (!source || !destination || !printer) {
    return res.status(400).json({ error: 'Source, destination, and printer are required.' });
  }

  try {
    await processPDFs(source, destination, printer, fileName);
    res.status(200).json({ message: 'PDFs processed successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Error processing PDFs' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
