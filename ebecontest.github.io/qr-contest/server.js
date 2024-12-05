const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx'); // To save results in Excel format

const app = express();
const port = 3000;

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Store participant data (this can be saved to a database or an Excel file)
let participants = [];
const resultsFilePath = path.join(__dirname, 'contest_results.xlsx');

// Utility to read the existing participants from the Excel file
function loadParticipants() {
  if (fs.existsSync(resultsFilePath)) {
    const workbook = xlsx.readFile(resultsFilePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    participants = xlsx.utils.sheet_to_json(sheet);
  }
  else {
    // If the file doesn't exist, create it with an empty sheet
    const newWorkbook = xlsx.utils.book_new();
    const newWorksheet = xlsx.utils.aoa_to_sheet([["code", "result"]]); // Add headers
    xlsx.utils.book_append_sheet(newWorkbook, newWorksheet, 'Results');
    xlsx.writeFile(newWorkbook, resultsFilePath);
  }
}

// Utility to save participants to an Excel file
function saveParticipants() {
  const newWorkbook = xlsx.utils.book_new();
  const newWorksheet = xlsx.utils.json_to_sheet(participants);
  xlsx.utils.book_append_sheet(newWorkbook, newWorksheet, 'Results');
  xlsx.writeFile(newWorkbook, resultsFilePath);
}

// Route to check if a participant's code is valid
app.get('/check-participation', (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).json({ error: 'Code is required.' });
  }

  // Check if the code has already been used
  const hasParticipated = participants.some(participant => participant.code === code);

  res.json({ hasParticipated });
});

// Route to submit the result (save the participant data)
app.post('/submit-result', (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'Code is required.' });
  }

  // Check if the code already participated
  const existingParticipant = participants.find(participant => participant.code === code);
  if (existingParticipant) {
    return res.status(400).json({ error: 'This code has already been used.' });
  }

  // Randomly generate win or lose result
  const result = Math.random() < 0.1 ? 'Win' : 'Lose'; // 10% chance to win

  // Save the new participant's result (only code and result are stored)
  participants.push({ code, result });

  // Ensure only 10 winners
  const winners = participants.filter(participant => participant.result === 'Win');
  if (winners.length > 10) {
    // If there are more than 10 winners, randomly reduce the winners to 10
    const winnerCodes = winners.map(winner => winner.code);
    const codesToRemove = winnerCodes.slice(10);
    participants = participants.filter(participant => !codesToRemove.includes(participant.code));
  }

  // Save updated participants to the Excel file
  saveParticipants();

  res.json({ message: 'Your result has been saved!', result });
});

// Serve the static files (e.g., index.html)
app.use(express.static(path.join(__dirname, 'public')));

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  loadParticipants(); // Load the participants data when the server starts
});
