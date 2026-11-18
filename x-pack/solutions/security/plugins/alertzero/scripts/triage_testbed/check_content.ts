/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Checks that the content of generated alerts matches their truth, so that a real LLM run measures
 * the LLM and not the generator. It applies a fixed list of signs that an analyst can read from an
 * alert (an unsigned binary in a temp folder, an encoded command line, a rapid burst of API calls)
 * and counts, per kind of alert, how often the signs agree with the truth file.
 *
 * Limit: the signs come from the same author as the generator, so this check shows that the signal
 * is present in the data. It cannot show that an LLM reads it. A small real run must confirm that.
 *
 * Usage:
 *   node x-pack/solutions/security/plugins/alertzero/scripts/triage_testbed/check_content_cli.js \
 *     --data <folder with alerts.ndjson and truth.ndjson>
 */

import fs from 'fs';
import path from 'path';

type FieldValue = string | number | boolean | string[];
type AlertSource = Record<string, FieldValue | undefined>;
type Sign = string | false | null;

interface AlertLine {
  _source: AlertSource;
}

interface TruthLine {
  kind: string;
  verdict: string;
  variant: string | null;
}

interface Counter {
  alerts: number;
  flagged: number;
}

const readLines = <T>(file: string): T[] =>
  fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);

const inTemp = (value: FieldValue | undefined): boolean => /\\temp\\/i.test(String(value ?? ''));
/** A threshold rule keeps its count in `kibana.alert.threshold_result.count`. A false positive of the generator stays under 48. */
const FAR_ABOVE_USUAL_COUNT = 60;

/** The signs, per kind. Each returns the reasons why an analyst would read the alert as malicious. */
const SIGNS: Record<string, (d: AlertSource) => Sign[]> = {
  process: (d: AlertSource) => [
    inTemp(d['process.executable']) && 'executable in a temp folder',
    !d['process.code_signature.subject_name'] && 'unsigned binary',
    d['process.code_signature.trusted'] === false && 'untrusted signature',
    /(-enc\b|certutil|wscript|\.vbs)/i.test(String(d['process.command_line'] ?? '')) &&
      'download, script or encoded command line',
    /(winword|wscript)/i.test(String(d['process.parent.executable'] ?? '')) &&
      'office or script parent',
  ],
  file: (d: AlertSource) => [
    /\.locked$/i.test(String(d['file.path'] ?? '')) && 'ransomware-style file name',
    inTemp(d['process.executable']) && 'writer in a temp folder',
    d['process.code_signature.trusted'] === false && 'untrusted signature',
    /(-enc\b|certutil|wscript|\.vbs)/i.test(String(d['process.command_line'] ?? '')) &&
      'download, script or encoded command line',
  ],
  registry: (d: AlertSource) => [
    /\\CurrentVersion\\Run\\/i.test(String(d['registry.path'] ?? '')) && 'run key persistence',
    inTemp(d['process.executable']) && 'writer in a temp folder',
    d['process.code_signature.trusted'] === false && 'untrusted signature',
    /(-enc\b|certutil|wscript|\.vbs)/i.test(String(d['process.command_line'] ?? '')) &&
      'download, script or encoded command line',
  ],
  library: (d: AlertSource) => [
    inTemp(d['dll.path']) && 'library in a temp folder',
    !d['dll.code_signature.subject_name'] && 'unsigned library',
    d['process.code_signature.trusted'] === false && 'untrusted signature',
    /(-enc\b|certutil|wscript|\.vbs)/i.test(String(d['process.command_line'] ?? '')) &&
      'download, script or encoded command line',
  ],
  cloud: (d: AlertSource) => [
    /^(CreateAccessKey|AttachUserPolicy|PutBucketPolicy|StopLogging)/.test(
      String(d['event.action'] ?? '')
    ) && 'privilege or logging change',
    String(d['source.ip'] ?? '').startsWith('198.51.100.') && 'external source address',
    ((d['event.type'] ?? []) as string[]).includes('change') && 'a change, not a read',
    d['user.id'] === 'root' && 'root principal',
    ['af-south-1', 'ap-southeast-3', 'me-central-1'].includes(d['cloud.region'] as string) &&
      'unusual region',
  ],
  aggregate: (d: AlertSource) => {
    return [
      Number(d['kibana.alert.threshold_result.count'] ?? 0) >= FAR_ABOVE_USUAL_COUNT &&
        'far above the usual rate',
      ['root', 'system:anonymous', 'admin-impersonation', 'unmanaged-device-bot'].includes(
        d['user.id'] as string
      ) && 'unusual principal',
      d['host.risk.calculated_level'] === 'Critical' && 'critical host risk',
      d['user.risk.calculated_level'] === 'High' && 'high user risk',
    ];
  },
};

export const main = (): void => {
  const dir = process.argv[process.argv.indexOf('--data') + 1];
  if (!dir || dir.startsWith('--')) throw new Error('--data <folder> is required');
  const docs = readLines<AlertLine>(path.join(dir, 'alerts.ndjson')).map((line) => line._source);
  const truth = readLines<TruthLine>(path.join(dir, 'truth.ndjson'));

  const table: Record<string, Counter> = {};
  const variants: Record<string, Counter> = {};
  const bump = (target: Record<string, Counter>, key: string, flagged: boolean): void => {
    target[key] = target[key] ?? { alerts: 0, flagged: 0 };
    target[key].alerts++;
    if (flagged) target[key].flagged++;
  };

  truth.forEach((t, i) => {
    const signs = SIGNS[t.kind](docs[i]).filter(Boolean);
    const flagged = signs.length > 0;
    if (t.variant) bump(variants, t.variant, flagged);
    else bump(table, `${t.kind} / ${t.verdict}`, flagged);
  });

  const share = (x: Counter): number => Number((x.flagged / x.alerts).toFixed(4));
  const rows = Object.entries(table)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, x]) => ({ name, ...x, flaggedShare: share(x) }));
  const variantRows = Object.entries(variants).map(([name, x]) => ({
    name,
    ...x,
    flaggedShare: share(x),
  }));

  // A true positive that shows no sign, or a false positive that shows one, is a case where the
  // content does not match the truth. The real LLM cannot be right on these by reading the alert.
  const mismatched = rows.filter((r) =>
    r.name.endsWith('true_positive') ? r.flaggedShare < 0.99 : r.flaggedShare > 0.01
  );
  process.stdout.write(
    `${JSON.stringify(
      {
        byKindAndTruth: rows,
        plantedVariants: variantRows,
        kindsWithMismatch: mismatched.map((r) => r.name),
      },
      null,
      2
    )}\n`
  );
  process.exit(mismatched.length === 0 ? 0 : 1);
};
