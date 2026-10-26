/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import Path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { TI_REPORT_AWS_IAM_PREFIX, TI_REPORT_CANARY_ID } from './constants';

/**
 * Anti-overfit lockdown: the Worker's prompt and definition surfaces must not name the eval
 * fixtures. A score that depends on the product knowing the fixture is not a capability. The
 * scan strips comments first (a fixture name used as an example in a doc comment is not prompt
 * content) and reads string literals, templates and yaml as written.
 */

/** Product surfaces the Worker's behavior is authored in, relative to the repo root. */
export const LOCKDOWN_SCAN_PATHS = [
  {
    dir: 'src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero',
    file: /^hunt[^/]*\.(ts|yaml)$/,
  },
  { dir: 'x-pack/solutions/security/plugins/alertzero/server/services/watches/hunt' },
  { dir: 'x-pack/solutions/security/plugins/alertzero/server/routes/hunt' },
] as const;

/**
 * Literals from the Demo C+ aws-iam fixtures and the suite's canary: decoy IOCs, principals,
 * the account id, the actor name, the host, and the report id family.
 */
export const FORBIDDEN_LITERALS: ReadonlyArray<string | RegExp> = [
  /192\.0\.2\.\d+/,
  /198\.51\.100\.\d+/,
  /203\.0\.113\.\d+/,
  /[a-z0-9-]+@corp\.example/,
  'dev-user',
  'dev-contractor-42',
  'escalated-role',
  'WIN-ANALYST01',
  '123456789012',
  'TA-DEMO-SHADOW-ADMIN',
  'corp-prod-data',
  TI_REPORT_AWS_IAM_PREFIX,
  TI_REPORT_CANARY_ID,
  'General security awareness reminder',
];

const isTestFile = (file: string) => /\.test\.tsx?$/.test(file);

/** Drops `//` and block comments while leaving string and template contents untouched. */
export const stripTsComments = (source: string): string => {
  let out = '';
  let quote: string | undefined;
  let i = 0;
  while (i < source.length) {
    const char = source[i];
    const next = source[i + 1];
    if (quote) {
      const escaped = char === '\\';
      out += escaped ? char + (next ?? '') : char;
      if (!escaped && char === quote) quote = undefined;
      i += escaped ? 2 : 1;
    } else if (char === '/' && next === '/') {
      const end = source.indexOf('\n', i);
      i = end === -1 ? source.length : end;
    } else if (char === '/' && next === '*') {
      const end = source.indexOf('*/', i + 2);
      i = end === -1 ? source.length : end + 2;
    } else {
      if (char === "'" || char === '"' || char === '`') quote = char;
      out += char;
      i += 1;
    }
  }
  return out;
};

/** Drops full-line `#` comments; yaml values stay as written. */
export const stripYamlComments = (source: string): string =>
  source
    .split('\n')
    .filter((line) => !/^\s*#/.test(line))
    .join('\n');

export const stripComments = (file: string, source: string): string =>
  file.endsWith('.yaml') || file.endsWith('.yml')
    ? stripYamlComments(source)
    : stripTsComments(source);

const listFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const full = Path.join(dir, entry);
    return statSync(full).isDirectory() ? listFiles(full) : [full];
  });

/** Every scannable product file under `LOCKDOWN_SCAN_PATHS`, relative to the repo root. */
export const listLockdownFiles = (): string[] =>
  LOCKDOWN_SCAN_PATHS.flatMap(({ dir, ...scope }) => {
    const filePattern = 'file' in scope ? scope.file : /\.(ts|yaml)$/;
    return listFiles(Path.join(REPO_ROOT, dir))
      .filter((file) => filePattern.test(Path.basename(file)) && !isTestFile(file))
      .map((file) => Path.relative(REPO_ROOT, file));
  });

/** Forbidden literals present in `text`, as the matched strings. */
export const findForbiddenLiterals = (text: string): string[] =>
  FORBIDDEN_LITERALS.flatMap((literal) => {
    if (typeof literal === 'string') return text.includes(literal) ? [literal] : [];
    const matches = text.match(new RegExp(literal.source, 'g'));
    return matches ? [...new Set(matches)] : [];
  });

/** `{ file: literals }` for every scanned product file that names a fixture outside comments. */
export const scanLockdown = (): Record<string, string[]> =>
  Object.fromEntries(
    listLockdownFiles().flatMap((file) => {
      const source = readFileSync(Path.join(REPO_ROOT, file), 'utf8');
      const found = findForbiddenLiterals(stripComments(file, source));
      return found.length > 0 ? [[file, found]] : [];
    })
  );
