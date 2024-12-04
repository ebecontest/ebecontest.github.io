const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx'); // To save results in Excel format
const crypto = require('crypto');

const app = express();
const port = 3000;

app.use(bodyParser.json());

// Store participant data
let participants = [];
const resultsFilePath = path.join(__dirname, 'contest_results.xlsx');
const codesFilePath = path.join(__dirname, 'unique_codes.json');

// Utility to load participants and codes
function loadParticipants() {
  if (fs.existsSync(resultsFilePath)) {
    const workbook = xlsx.readFile(resultsFilePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    participants = xlsx.utils.sheet_to_json(sheet);
  }
}

function loadCodes() {
  if (fs.existsSync(codesFilePath)) {
    return JSON.parse(fs.readFileSync(codesFilePath, 'utf8'));
  }
  return [];
}

// Utility to save participants and codes
function saveParticipants() {
  const newWorkbook = xlsx.utils.book_new();
  const newWorksheet = xlsx.utils.json_to_sheet(participants);
  xlsx.utils.book_append_sheet(newWorkbook, newWorksheet, 'Results');
  xlsx.writeFile(newWorkbook, resultsFilePath);
}

function saveCodes(codes) {
  fs.writeFileSync(codesFilePath, JSON.stringify(codes, null, 2), 'utf8');
}

// Generate a unique code for participants
function generateUniqueCode() {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

// Route to check if the code is valid
app.get('/check-code', (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).json({ error: 'Code is required.' });
  }

  const codes = loadCodes();
  const isValid = codes.includes(code);

  res.json({ isValid });
});

// Route to submit the result (save the participant data)
app.post('/submit-result', (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'Code is required.' });
  }

  const codes = loadCodes();
  if (!codes.includes(code)) {
    return res.status(400).json({ error: 'Invalid code.' });
  }

  // Check if the code already participated
  const existingParticipant = participants.find(participant => participant.code === code);
  if (existingParticipant) {
    return res.status(400).json({ error: 'You have already participated.' });
  }

  // Randomly generate win or lose result
  const result = Math.random() < 0.5 ? 'Lose' : 'Win';

  // Save the new participant's result
  participants.push({ code, result });
  saveParticipants(); // Save the updated participants list to the Excel file

  // Remove the used code from available codes
  const updatedCodes = codes.filter(c => c !== code);
  saveCodes(updatedCodes);

  res.json({ message: 'Your result has been saved!', result });
});

// Route to fetch the result for a previously used code
app.get('/get-result', (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).json({ error: 'Code is required.' });
  }

  const participant = participants.find(p => p.code === code);
  if (participant) {
    res.json({ result: participant.result });
  } else {
    res.status(404).json({ error: 'No result found for this code.' });
  }
});

// Route to generate and issue new codes (admin use)
app.post('/generate-codes', (req, res) => {
  const { numberOfCodes } = req.body;
  if (!numberOfCodes || numberOfCodes <= 0) {
    return res.status(400).json({ error: 'Number of codes is required.' });
  }

  const codes = loadCodes();
  for (let i = 0; i < numberOfCodes; i++) {
    codes.push(generateUniqueCode());
  }

  saveCodes(codes);
  res.json({ message: `${numberOfCodes} unique codes generated!` });
});

// Serve the static files (e.g., index.html)
app.use(express.static(path.join(__dirname, 'public')));

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  loadParticipants(); // Load the participants data when the server starts
  loadCodes(); // Load the available codes when the server starts
});
