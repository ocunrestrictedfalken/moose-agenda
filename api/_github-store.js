// GitHub API-backed data store — reads/writes JSON files in the repo
const fetch = require('node-fetch');

const OWNER = 'ocunrestrictedfalken';
const REPO  = 'moose-agenda';
const BRANCH = 'main';

function headers() {
  return {
    Authorization: `token ${process.env.GH_TOKEN}`,
    'Content-Type': 'application/json',
    Accept: 'application/vnd.github.v3+json',
  };
}

async function getFile(path) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}?ref=${BRANCH}`;
  const r = await fetch(url, { headers: headers() });
  if (r.status === 404) return { data: [], sha: null };
  const json = await r.json();
  const data = JSON.parse(Buffer.from(json.content, 'base64').toString('utf8'));
  return { data, sha: json.sha };
}

async function putFile(path, data, sha) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`;
  const content = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
  const body = {
    message: `update ${path}`,
    content,
    branch: BRANCH,
    ...(sha ? { sha } : {}),
  };
  const r = await fetch(url, { method: 'PUT', headers: headers(), body: JSON.stringify(body) });
  return r.json();
}

module.exports = { getFile, putFile };
