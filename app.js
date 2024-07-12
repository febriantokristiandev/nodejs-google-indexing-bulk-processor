const { OAuth2Client } = require('google-auth-library');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const express = require('express');
const bodyParser = require('body-parser');
const opn = require('opn');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

const credentialsPath = './cred.json';
const tokenPath = './token.json';
const logDir = './log';
const successLogPath = path.join(logDir, 'success_log.txt');
const errorLogPath = path.join(logDir, 'error_log.txt');
const linkFilePath = './cek_link.txt';

let totalUrls = 0;
let processedUrls = 0;
let results = [];

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
  credentials.web.redirect_uris[0]
);

async function getAccessToken() {
  try {
    let token = fs.existsSync(tokenPath) ? JSON.parse(fs.readFileSync(tokenPath)) : null;

    if (!token || isTokenExpired(token)) {
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: 'https://www.googleapis.com/auth/indexing'
      });

      return authUrl;
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
    results.push({ url, status: 'Success', details: 'URL successfully indexed' });
  } catch (error) {
    const reason = error.response && error.response.data && error.response.data.error ? error.response.data.error.message : error.message;
    await logError(url, reason);
    results.push({ url, status: 'Failed', details: reason });
  }
}

async function logSuccess(url) {
  const date = new Date().toISOString();
  const data = `${date} - ${url}\n`;
  await fs.promises.appendFile(successLogPath, data, 'utf8');
  processedUrls++;
}

async function logError(url, reason) {
  const date = new Date().toISOString();
  const data = `${date} - ${url} - ${reason}\n`;
  await fs.promises.appendFile(errorLogPath, data, 'utf8');
  processedUrls++;
}

app.get('/', async (req, res) => {
  res.sendFile(path.join(__dirname, 'views/get_token.html'));
});

app.get('/auth-url', async (req, res) => {
  const authUrl = await getAccessToken();
  if (authUrl) {
    opn(authUrl);
  } else {
    res.send('/unable-to-access-token');
  }
});

app.get('/unable-to-access-token', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/unable_to_access_token.html'));
});

app.get('/not-found', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/not_found.html'));
});

app.post('/submit', async (req, res) => {
  const code = req.body.code;

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    fs.writeFileSync(tokenPath, JSON.stringify(tokens));

    const urls = fs.readFileSync(linkFilePath, 'utf8').split('\n').filter(url => url.trim());
    totalUrls = urls.length;

    if (totalUrls === 0) {
      res.send('No URLs found in the link file.');
      return;
    }

    urls.forEach(async (url) => {
      await requestIndexing(url);
    });

    res.sendFile(path.join(__dirname, 'views/processing.html'));
  } catch (error) {
    res.send(`Error: ${error.message}`);
  }
});

app.get('/token-callback', (req, res) => {
  const code = req.query.code;
  const scope = req.query.scope;

  if (code && scope) {
    res.sendFile(path.join(__dirname, 'views/token_callback.html'));
  } else {
    res.sendFile(path.join(__dirname, 'views/unable_to_access_token.html'));
  }
});

app.get('/status', (req, res) => {
  res.json({ processed: processedUrls, total: totalUrls, results });
});

app.listen(7890, () => {
  console.log('Server is running on http://localhost:7890');
});
