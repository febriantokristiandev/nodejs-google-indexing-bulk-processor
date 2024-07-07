const { OAuth2Client } = require('google-auth-library');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const credentialsPath = './cred.json';
const tokenPath = './token.json';
const logDir = './log';
const successLogPath = path.join(logDir, 'success_log.txt');
const errorLogPath = path.join(logDir, 'error_log.txt');
const linkFilePath = './cek_link.txt';

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

if (!fs.existsSync(successLogPath)) {
  fs.writeFileSync(successLogPath, '');
}

if (!fs.existsSync(errorLogPath)) {
  fs.writeFileSync(errorLogPath, '');
}

if (!fs.existsSync(linkFilePath)) {
  fs.writeFileSync(linkFilePath, '');
}

// Create cred.json if it does not exist
if (!fs.existsSync(credentialsPath)) {
  const defaultCredentials = {
    "web": {
      "client_id": "your-client-id",
      "project_id": "your-project-id",
      "auth_uri": "https://accounts.google.com/o/oauth2/auth",
      "token_uri": "https://oauth2.googleapis.com/token",
      "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
      "client_secret": "your-client-secret",
      "redirect_uris": [
        "http://localhost/callback"
      ]
    }
  };
  fs.writeFileSync(credentialsPath, JSON.stringify(defaultCredentials, null, 2));
  console.log('Created default cred.json file.');
}

const credentials = JSON.parse(fs.readFileSync(credentialsPath));
const oauth2Client = new OAuth2Client(
  credentials.web.client_id,
  credentials.web.client_secret,
  'http://localhost/callback'
);

async function getAccessToken() {
  try {
    let token = fs.existsSync(tokenPath) ? JSON.parse(fs.readFileSync(tokenPath)) : null;

    if (!token || isTokenExpired(token)) {
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: 'https://www.googleapis.com/auth/indexing'
      });

      console.log('Authorize this app by visiting this url:', authUrl);

      const code = await new Promise((resolve) => {
        const readline = require('readline').createInterface({
          input: process.stdin,
          output: process.stdout,
        });
        readline.question('Enter the code from that page here: ', (code) => {
          readline.close();
          resolve(code);
        });
      });

      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);
      fs.writeFileSync(tokenPath, JSON.stringify(tokens));
      token = tokens;
    }

    return token.access_token;
  } catch (error) {
    console.error('Error:', error.message);
  }
}

function isTokenExpired(token) {
  return Date.now() >= token.expiry_date;
}

async function requestIndexing(url) {
  try {
    const accessToken = await getAccessToken();
    const response = await axios.post(
      'https://indexing.googleapis.com/v3/urlNotifications:publish',
      {
        url: url,
        type: 'URL_UPDATED'
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    await logSuccess(url);
  } catch (error) {
    const reason = error.response && error.response.data && error.response.data.error ? error.response.data.error.message : error.message;
    await logError(url, reason);
  }
}

async function logSuccess(url) {
  const date = new Date().toISOString();
  const data = `${date} - ${url}\n`;
  await fs.promises.appendFile(successLogPath, data, 'utf8');
}

async function logError(url, reason) {
  const date = new Date().toISOString();
  const data = `${date} - ${url} - ${reason}\n`;
  await fs.promises.appendFile(errorLogPath, data, 'utf8');
}

(async () => {
  try {
    const urls = fs.readFileSync(linkFilePath, 'utf8').split('\n').filter(url => url.trim());
    const totalUrls = urls.length;
    let processedUrls = 0;

    if (totalUrls === 0) {
      console.log('No URLs found in the link file.');
      return;
    }

    console.log(`Total URLs to process: ${totalUrls}`);

    for (const url of urls) {
      await requestIndexing(url);
      processedUrls++;
      process.stdout.write(`Processed ${processedUrls}/${totalUrls} URLs\r`);
    }

    console.log('Processing complete.');
  } catch (error) {
    console.error('Error reading URL file:', error.message);
  }
})();
