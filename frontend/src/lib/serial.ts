import { SerialPort, ReadlineParser } from 'serialport';

let latestDistance: number | null = null;

const port = new SerialPort({
  path: 'COM4', // change this to your Arduino's COM port (check Arduino IDE)
  baudRate: 115200,
});

const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

parser.on('data', (data: string) => {
  const num = parseInt(data, 10);
  if (!isNaN(num)) {
    latestDistance = num;
    console.log('Distance:', num, 'cm');
  }
});

export function getDistance(): number | null {
  return latestDistance;
}
