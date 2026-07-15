/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Render an Agent Builder eval JSONL file to a self-contained HTML report.
 *
 * Run with:
 *   node --require @kbn/babel-register/install \
 *     x-pack/solutions/security/packages/kbn-evals-suite-attack-discovery/scripts/render_agent_eval_html.ts \
 *     <input.jsonl> [output.html] [--prompts <path>] [--title <text>]
 *
 * If output path is omitted, writes alongside the input with .html suffix.
 * The JSONL row schema is defined in src/render/agent_eval_types.ts.
 */

/* eslint-disable no-console, no-process-exit */

import Fs from 'fs';
import Path from 'path';
import { renderAgentEvalHtml } from '../src/render/render_agent_eval_html';

const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  console.error(
    [
      'Usage: node --require @kbn/babel-register/install scripts/render_agent_eval_html.ts',
      '  <input.jsonl> [output.html] [--prompts <path>] [--title <text>]',
    ].join(' ')
  );
  process.exit(1);
}

const inputPath = Path.resolve(args[0]);
const promptsIdx = args.indexOf('--prompts');
const titleIdx = args.indexOf('--title');

const promptsPath =
  promptsIdx !== -1 && args[promptsIdx + 1] ? Path.resolve(args[promptsIdx + 1]) : undefined;
const title = titleIdx !== -1 && args[titleIdx + 1] ? args[titleIdx + 1] : undefined;

const outputArg = args.filter((a, i) => {
  if (a.startsWith('--')) return false;
  if (promptsIdx > -1 && i === promptsIdx + 1) return false;
  if (titleIdx > -1 && i === titleIdx + 1) return false;
  return true;
})[1];

const outputPath = outputArg
  ? Path.resolve(outputArg)
  : Path.resolve(
      Path.dirname(inputPath),
      `${Path.basename(inputPath, Path.extname(inputPath))}.html`
    );

let text: string;
try {
  text = Fs.readFileSync(inputPath, 'utf-8');
} catch (err) {
  console.error(`Error reading ${inputPath}: ${(err as Error).message}`);
  process.exit(1);
}

const rows = text
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l.length > 0)
  .map((line, i) => {
    try {
      return JSON.parse(line);
    } catch (err) {
      console.error(`Skipping malformed JSON on line ${i + 1}: ${(err as Error).message}`);
      return null;
    }
  })
  .filter((r) => r !== null);

if (rows.length === 0) {
  console.error('No valid JSONL rows found in input.');
  process.exit(1);
}

let promptsMap: Record<string, string> = {};
if (promptsPath) {
  try {
    promptsMap = JSON.parse(Fs.readFileSync(promptsPath, 'utf-8'));
  } catch (err) {
    console.error(`Warning: could not read prompts file ${promptsPath}: ${(err as Error).message}`);
  }
}

const html = renderAgentEvalHtml({ rows, promptsMap, title });
Fs.writeFileSync(outputPath, html, 'utf-8');
console.log(`Rendered ${rows.length} row(s) -> ${outputPath}`);
