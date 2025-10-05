'use server';

import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';

let latestDistance: number | null = null;

const port = new SerialPort({
  path: 'COM4',
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

export async function getDistance() {
  return latestDistance;
}