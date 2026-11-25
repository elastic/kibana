/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Builds `profile.json` from the five CSV files of query pack 3 (aggregate counts only).
 * The generator reads the profile, and the calibration step compares generated data against its `targets`.
 *
 * Usage:
 *   node x-pack/solutions/security/plugins/alertzero/scripts/triage_testbed/build_profile_cli.js \
 *     --in <folder with query_pack3_q1.csv to q5.csv> --out <profile.json>
 */

import fs from 'fs';
import path from 'path';

type CsvRow = Record<string, string>;

const parseArgs = (argv: readonly string[]): { in: string; out: string } => {
  let input: string | undefined;
  let out: string | undefined;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--in') input = argv[++i];
    else if (argv[i] === '--out') out = argv[++i];
  }
  if (!input || !out) throw new Error('--in <folder> and --out <file> are required');
  return { in: input, out };
};

/** Splits one CSV line. A field in double quotes can hold commas, and `""` is a quote inside it. */
const splitLine = (line: string): string[] => {
  const cells: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (quoted && char === '"' && line[i + 1] === '"') {
      cell += '"';
      i++;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      cells.push(cell);
      cell = '';
    } else {
      cell += char;
    }
  }
  if (quoted) throw new Error(`unclosed quote in "${line}"`);
  cells.push(cell);
  return cells;
};

const readCsv = (file: string): CsvRow[] => {
  const [header, ...lines] = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean);
  const columns = splitLine(header);
  return lines.map((line) => {
    const cells = splitLine(line);
    if (cells.length !== columns.length) throw new Error(`${file}: bad row "${line}"`);
    return Object.fromEntries(columns.map((name, i) => [name, cells[i]]));
  });
};

const toNumber = (value: string): number => {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`not a number: ${value}`);
  return number;
};

const byStatus = (rows: CsvRow[], status: string): CsvRow => {
  const row = rows.find((r) => r.status === status);
  if (!row) throw new Error(`no row for status ${status}`);
  return row;
};

export const main = (): void => {
  const { in: dir, out } = parseArgs(process.argv);
  // The result file of query N: any file in the folder whose name ends in `query_pack3_qN.csv`.
  const q = (n: number): CsvRow[] => {
    const file = fs.readdirSync(dir).find((name) => name.endsWith(`query_pack3_q${n}.csv`));
    if (file === undefined) throw new Error(`no file ending in query_pack3_q${n}.csv in ${dir}`);
    return readCsv(path.join(dir, file));
  };

  const q1 = q(1).map((r) => ({
    alerts: toNumber(r.alerts),
    buildingBlock: r.building_block === 'true',
    severity: r['kibana.alert.severity'],
    status: r['kibana.alert.workflow_status'],
  }));
  const total = q1.reduce((sum, r) => sum + r.alerts, 0);
  const buildingBlocks = q1.filter((r) => r.buildingBlock).reduce((sum, r) => sum + r.alerts, 0);
  const notBlocks = q1.filter((r) => !r.buildingBlock);
  const open = notBlocks.filter((r) => r.status === 'open');
  const openTotal = open.reduce((sum, r) => sum + r.alerts, 0);

  const unit = (
    rows: CsvRow[],
    status: string
  ): { alerts: number; keyed: number; units: number } => {
    const r = byStatus(rows, status);
    return {
      alerts: toNumber(r.alerts),
      keyed: toNumber(r.keyed),
      units: toNumber(r.units),
    };
  };
  const q2 = q(2);
  const q3 = q(3);
  const q4 = q(4);

  const unkeyedRules = q(5).map((r) => ({
    alerts: toNumber(r.unkeyed),
    rule: r.rule,
    severity: r['kibana.alert.severity'],
  }));

  const profile = {
    source: 'query pack 3, a reference deployment, 24 hours (aggregate counts only)',
    // The three queries ran at different instants, so the open totals differ by a few alerts.
    note: 'open alert totals differ by up to 6 across q2, q3 and q4 because the queries ran at different times',
    totals: {
      alerts: total,
      buildingBlockShare: buildingBlocks / total,
      statusSeverityMix: q1,
    },
    openNotBuildingBlock: {
      alerts: openTotal,
      severityShare: Object.fromEntries(open.map((r) => [r.severity, r.alerts / openTotal])),
    },
    targets: {
      // Units after one analysis per key, for open alerts that are not building blocks.
      open: {
        alerts: unit(q2, 'open').alerts,
        keyedShare: unit(q2, 'open').keyed / unit(q2, 'open').alerts,
        units5min: unit(q2, 'open').units,
        windows5min: toNumber(byStatus(q2, 'open').windows),
        units1h: unit(q3, 'open').units,
        units24h: unit(q4, 'open').units,
      },
      unkeyedTotal: unkeyedRules.reduce((sum, r) => sum + r.alerts, 0),
      unkeyedRuleCount: unkeyedRules.length,
      top10UnkeyedShare:
        unkeyedRules.slice(0, 10).reduce((sum, r) => sum + r.alerts, 0) /
        unkeyedRules.reduce((sum, r) => sum + r.alerts, 0),
    },
    unkeyedRules,
    // Not in the CSV files. Copied from the plan, section "Test setup", part 2 (Generator).
    arrival: {
      executionIntervalMinutes: 5,
      alertsPerExecutionMedian: 2,
      alertsPerExecutionP95: 31,
      burstSize: 1000,
    },
  };

  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(profile, null, 2));
  process.stdout.write(`${JSON.stringify(profile.targets, null, 2)}\n`);
};
