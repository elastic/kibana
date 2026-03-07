/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * One-off script: reads data.json (ES archive doc format) and prints
 * Elasticsearch bulk NDJSON to stdout for manual testing.
 * Usage: node to_bulk.js
 */

const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../es_archives/updates/data.json');

const raw = fs.readFileSync(dataPath, 'utf8');
const docs = raw
  .trim()
  .split(/\n\n(?=\s*\{)/)
  .map((block) => {
    try {
      return JSON.parse(block.trim());
    } catch (e) {
      throw new Error(`Parse error: ${e.message}\nBlock: ${block.slice(0, 100)}...`);
    }
  });

const indexName = '.entities.v2.updates.security_default';
const lines = [];

for (const doc of docs) {
  const { source } = doc.value;
  lines.push(JSON.stringify({ create: { _index: indexName } }));
  lines.push(JSON.stringify(source));
}

console.log(lines.join('\n'));
