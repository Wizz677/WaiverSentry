import https from 'https';
import fs from 'fs';
import path from 'path';

const file = fs.createWriteStream(path.join(process.cwd(), 'src/data/kevCache.json'));
https.get('https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json', function(response) {
  response.pipe(file);
});
