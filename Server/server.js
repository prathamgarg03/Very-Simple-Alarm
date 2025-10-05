const express = require('express');
const cors = require('cors');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

const app = express();
app.use(cors());

let latestDistance = null;

// Initialize serial port
const port = new SerialPort({
  path: 'COM5', // Change to your port (COM4, /dev/ttyACM0, etc.)
  baudRate: 115200, // Match your Arduino baud rate
});

const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

// When port opens
port.on('open', () => {
  console.log('✅ Serial port open');
});

// Read incoming data
parser.on('data', (data) => {
  console.log('Got data from Arduino:', data);
  const num = parseInt(data.trim(), 10);
  if (!isNaN(num)) {
    latestDistance = num;
  }
});

// Handle errors
port.on('error', (err) => {
  console.error('❌ Serial port error:', err.message);
});

// API endpoint
app.get('/distance', (req, res) => {
  res.json({ distance: latestDistance });
});

// Start server
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});