#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../ui/parallel_tests');

function getFixturesRel(relativePath) {
  const dir = path.dirname(relativePath);
  const depth = dir === '.' ? 0 : dir.split(path.sep).length;
  return '../'.repeat(depth + 1) + 'fixtures';
}

function addImports(filePath) {
  const relativePath = path.relative(ROOT, filePath);
  let content = fs.readFileSync(filePath, 'utf8');
  if (
    !content.includes('DEFEND_WORKFLOWS_ROUTES') ||
    content.includes("from '@kbn/test-subj-selector'")
  )
    return false;
  const fixturesRel = getFixturesRel(relativePath);
  const newImports =
    "import { subj as testSubjSelector } from '@kbn/test-subj-selector';\nimport { spaceTest, tags } from '@kbn/scout-security';\nimport { expect } from '@kbn/scout-security/ui';\nimport { DEFEND_WORKFLOWS_ROUTES } from '" +
    fixturesRel +
    "';";
  content = content.replace("import { spaceTest, tags } from '@kbn/scout-security';", newImports);
  fs.writeFileSync(filePath, content);
  return true;
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (e.name.endsWith('.spec.ts') && addImports(full))
      console.log('Added imports:', path.relative(ROOT, full));
  }
}
walk(ROOT);
console.log('Done.');
