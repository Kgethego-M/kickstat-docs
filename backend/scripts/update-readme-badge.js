// backend/scripts/update-readme-badge.js
//
// Reads backend/coverage/coverage-summary.json (produced by
// `npm run test:coverage`) and rewrites the coverage badge line in the
// repo-root README.md to match. Run this after test:coverage, before
// committing — see .gitea/workflows/ci.yml's "Update Coverage Badge" job
// for how CI does this automatically on every push to main.

const fs = require('fs');
const path = require('path');

const summaryPath = path.join(__dirname, '..', 'coverage', 'coverage-summary.json');
const readmePath = path.join(__dirname, '..', '..', 'README.md');

if (!fs.existsSync(summaryPath)) {
  console.error(
    `No coverage summary found at ${summaryPath}. Run "npm run test:coverage" first.`
  );
  process.exit(1);
}

const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
const pct = Math.round(summary.total.lines.pct);

let color = 'red';
if (pct >= 80) color = 'brightgreen';
else if (pct >= 60) color = 'yellow';
else if (pct >= 40) color = 'orange';

const badgeUrl = `https://img.shields.io/badge/backend%20coverage-${pct}%25-${color}`;
const badgeLine = `![Backend Coverage](${badgeUrl})`;

let readme = fs.readFileSync(readmePath, 'utf8');

const badgeRegex = /!\[Backend Coverage\]\(https:\/\/img\.shields\.io\/badge\/backend%20coverage-[^)]*\)/;

if (badgeRegex.test(readme)) {
  readme = readme.replace(badgeRegex, badgeLine);
} else {
  const lines = readme.split('\n');
  lines.splice(1, 0, '', badgeLine, '');
  readme = lines.join('\n');
}

fs.writeFileSync(readmePath, readme);
console.log(`Updated README badge to ${pct}% (${color})`);