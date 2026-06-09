const fs = require('fs');

const jsonContent = fs.readFileSync('old-save-v1.json', 'utf-8');
const json = JSON.parse(jsonContent);
const jsonStr = JSON.stringify(json);

const encoder = new TextEncoder();
const bytes = encoder.encode(jsonStr);
let binary = '';
for (let i = 0; i < bytes.length; i++) {
  binary += String.fromCharCode(bytes[i]);
}

const encoded = Buffer.from(binary, 'binary').toString('base64');
console.log(encoded);
