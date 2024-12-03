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
}

// Utility to save participants to an Excel file
function saveParticipants() {
  const newWorkbook = xlsx.utils.book_new();
  const newWorksheet = xlsx.utils.json_to_sheet(participants);
  xlsx.utils.book_append_sheet(newWorkbook, newWorksheet, 'Results');
  xlsx.writeFile(newWorkbook, resultsFilePath);
}

// Route to check if a participant (IP) has already participated
app.get('/check-participation', (req, res) => {
  const ip = req.query.ip;
  if (!ip) {
    return res.status(400).json({ error: 'IP address is required.' });
  }

  // Check if the IP is already in the participants list
  const hasParticipated = participants.some(participant => participant.ip === ip);

  res.json({ hasParticipated });
});

// Route to submit the result (save the participant data)
app.post('/submit-result', (req, res) => {
  const { name, ip } = req.body;
  if (!name || !ip) {
    return res.status(400).json({ error: 'Name and IP are required.' });
  }

  // Check if the IP already participated (to avoid multiple submissions)
  const existingParticipant = participants.find(participant => participant.ip === ip);
  if (existingParticipant) {
    return res.status(400).json({ error: 'You have already participated.' });
  }

  // Randomly generate win or lose result
  const result = Math.random() < 0.5 ? 'Lose' : 'Win';

  // Save the new participant's result
  participants.push({ name, result, ip });
  saveParticipants(); // Save the updated participants list to the Excel file

  res.json({ message: 'Your result has been saved!', result });
});

// Serve the static files (e.g., index.html)
app.use(express.static(path.join(__dirname, 'public')));

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  loadParticipants(); // Load the participants data when the server starts
});
