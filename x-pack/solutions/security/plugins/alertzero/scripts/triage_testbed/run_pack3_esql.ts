/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Loads generated alerts into a scratch index on a local Elasticsearch and runs the five queries of
 * pack 3 (`notes/query_pack3_sweep_windows.md`) as ES|QL, as the phoenix team ran them. It then compares
 * the result with the phoenix profile. This is the check that `calibrate.ts` only approximates in JavaScript.
 *
 * Two substitutions are made in the query text: the index name, and `NOW() - 1 day`, which becomes the
 * start of the generated day (the alerts are dated 2026-11-15 UTC and the clock keeps moving).
 *
 * The index gets the mapping of an existing alert index on the same cluster (`--mapping-from`), so that the
 * fields are the real alert mapping.
 *
 * Usage:
 *   node x-pack/solutions/security/plugins/alertzero/scripts/triage_testbed/run_pack3_esql_cli.js \
 *     --data <folder with alerts.ndjson> --profile <profile_phoenix.json> --queries <query_pack3_sweep_windows.md> \
 *     [--es http://localhost:9220] [--index az-gen-s1] [--mapping-from <existing alert index>] [--tolerance 0.1]
 *   The user and password come from the variable ES_AUTH (default elastic:changeme, the local snapshot default).
 */

import fs from 'fs';
import path from 'path';

const DAY_START = '2026-11-15T00:00:00.000Z';

type CsvRow = Record<string, string>;
type Request = (
  method: string,
  url: string,
  body?: string,
  contentType?: string
) => Promise<string>;

interface Args {
  data: string;
  profile: string;
  queries: string;
  es: string;
  index: string;
  mappingFrom: string;
  tolerance: number;
}

/** The part of the profile that the checks read. */
interface Profile {
  totals: {
    statusSeverityMix: Array<{
      buildingBlock: boolean;
      severity: string;
      status: string;
      alerts: number;
    }>;
  };
  targets: {
    open: {
      alerts: number;
      keyedShare: number;
      units5min: number;
      units1h: number;
      units24h: number;
    };
    unkeyedTotal: number;
    unkeyedRuleCount: number;
    top10UnkeyedShare: number;
  };
}

interface Check {
  name: string;
  got: number;
  want: number;
  ratio: number;
  pass: boolean;
}

interface BulkResult {
  errors: boolean;
  items: Array<{ index: { error?: { type?: string; reason?: string } } }>;
}

const parseArgs = (argv: readonly string[]): Args => {
  const values: Record<string, string | undefined> = {
    es: 'http://localhost:9220',
    index: 'az-gen-s1',
    mappingFrom: '.alerts-security.alerts-infosec-detections',
    tolerance: '0.1',
  };
  const flags: Record<string, string> = {
    '--data': 'data',
    '--profile': 'profile',
    '--queries': 'queries',
    '--es': 'es',
    '--index': 'index',
    '--mapping-from': 'mappingFrom',
    '--tolerance': 'tolerance',
  };
  for (let i = 2; i < argv.length; i++) if (flags[argv[i]]) values[flags[argv[i]]] = argv[++i];
  const required = (name: 'data' | 'profile' | 'queries'): string => {
    const value = values[name];
    if (!value) throw new Error(`--${name} is required`);
    return value;
  };
  const data = required('data');
  const profile = required('profile');
  const queries = required('queries');
  return {
    data,
    profile,
    queries,
    es: String(values.es),
    index: String(values.index),
    mappingFrom: String(values.mappingFrom),
    tolerance: Number(values.tolerance),
  };
};

const makeClient = (es: string): Request => {
  const auth = `Basic ${Buffer.from(process.env.ES_AUTH ?? 'elastic:changeme').toString('base64')}`;
  return async (method, url, body, contentType = 'application/json') => {
    const response = await fetch(`${es}${url}`, {
      method,
      headers: { Authorization: auth, 'Content-Type': contentType },
      body,
    });
    const text = await response.text();
    if (!response.ok)
      throw new Error(`${method} ${url} failed with ${response.status}: ${text.slice(0, 500)}`);
    return text;
  };
};

const loadIndex = async (request: Request, args: Args): Promise<number> => {
  const existing = JSON.parse(await request('GET', `/${args.mappingFrom}/_mapping`)) as Record<
    string,
    { mappings: object }
  >;
  const { mappings } = Object.values(existing)[0];
  await request('DELETE', `/${args.index}?ignore_unavailable=true`);
  await request(
    'PUT',
    `/${args.index}`,
    // The real alert mapping has more than the default 1,000 fields.
    JSON.stringify({
      settings: {
        number_of_shards: 1,
        number_of_replicas: 0,
        'index.mapping.total_fields.limit': 10000,
      },
      mappings,
    })
  );

  const lines = fs
    .readFileSync(path.join(args.data, 'alerts.ndjson'), 'utf8')
    .split('\n')
    .filter(Boolean);
  const batchSize = 5000;
  for (let i = 0; i < lines.length; i += batchSize) {
    const body = lines
      .slice(i, i + batchSize)
      .map((line) => {
        const { _id, _source } = JSON.parse(line) as { _id: string; _source: object };
        return `${JSON.stringify({ index: { _id } })}\n${JSON.stringify(_source)}`;
      })
      .join('\n');
    const result = JSON.parse(
      await request('POST', `/${args.index}/_bulk`, `${body}\n`, 'application/x-ndjson')
    ) as BulkResult;
    if (result.errors)
      throw new Error(
        `bulk errors in batch at ${i}: ${JSON.stringify(result.items.find((x) => x.index.error))}`
      );
  }
  await request('POST', `/${args.index}/_refresh`);
  return lines.length;
};

/** The five ```esql blocks of the pack 3 file, in order, for queries 1 to 5. */
const readQueries = (file: string, index: string): string[] => {
  const blocks = [...fs.readFileSync(file, 'utf8').matchAll(/```esql\n([\s\S]*?)```/g)].map(
    (m) => m[1]
  );
  if (blocks.length !== 5) throw new Error(`expected 5 queries, found ${blocks.length}`);
  return blocks.map((query) => {
    const replaced = query
      .replace('FROM .alerts-security.alerts-infosec-detections', `FROM ${index}`)
      .replace('@timestamp >= NOW() - 1 day', `@timestamp >= "${DAY_START}"`);
    if (replaced.includes('NOW()') || !replaced.includes(`FROM ${index}`)) {
      throw new Error('a query kept NOW() or the old index name, so the substitution does not fit');
    }
    return replaced;
  });
};

/** Splits a CSV line with double-quoted fields. */
const splitLine = (line: string): string[] => {
  const cells: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (quoted && char === '"' && line[i + 1] === '"') {
      cell += '"';
      i++;
    } else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) {
      cells.push(cell);
      cell = '';
    } else cell += char;
  }
  cells.push(cell);
  return cells;
};

const parseCsv = (text: string): CsvRow[] => {
  const [header, ...lines] = text.split(/\r?\n/).filter(Boolean);
  const columns = splitLine(header);
  return lines.map((line) =>
    Object.fromEntries(splitLine(line).map((cell, i) => [columns[i], cell]))
  );
};

export const main = async (): Promise<void> => {
  const args = parseArgs(process.argv);
  const profile = JSON.parse(fs.readFileSync(args.profile, 'utf8')) as Profile;
  const request = makeClient(args.es);

  const loaded = await loadIndex(request, args);
  const queries = readQueries(args.queries, args.index);
  const results: CsvRow[][] = [];
  for (const query of queries) {
    results.push(parseCsv(await request('POST', '/_query?format=csv', JSON.stringify({ query }))));
  }
  const [q1, q2, q3, q4, q5] = results;

  const checks: Check[] = [];
  const check = (name: string, got: number, want: number, exact = false): void => {
    const ratio = got / want;
    checks.push({
      name,
      got: Number(got.toFixed(4)),
      want: Number(want.toFixed(4)),
      ratio: Number(ratio.toFixed(3)),
      pass: exact ? got === want : Math.abs(ratio - 1) <= args.tolerance,
    });
  };

  // Query 1: every cell (building block, severity, status) must match exactly.
  const cellOf = (r: CsvRow): string =>
    `${r.building_block}|${r['kibana.alert.severity']}|${r['kibana.alert.workflow_status']}`;
  const got1 = Object.fromEntries(q1.map((r) => [cellOf(r), Number(r.alerts)]));
  profile.totals.statusSeverityMix.forEach((r) => {
    check(
      `q1 ${r.buildingBlock}|${r.severity}|${r.status}`,
      got1[`${r.buildingBlock}|${r.severity}|${r.status}`] ?? 0,
      r.alerts,
      true
    );
  });

  const open = (rows: CsvRow[]): CsvRow => rows.find((r) => r.status === 'open') as CsvRow;
  const want = profile.targets.open;
  check('q2 open alerts', Number(open(q2).alerts), want.alerts);
  check('q2 open keyed share', Number(open(q2).keyed) / Number(open(q2).alerts), want.keyedShare);
  check('q2 open units, 5 minutes', Number(open(q2).units), want.units5min);
  check('q3 open units, 1 hour', Number(open(q3).units), want.units1h);
  check('q4 open units, 24 hours', Number(open(q4).units), want.units24h);

  const unkeyed = q5.map((r) => Number(r.unkeyed)).sort((a, b) => b - a);
  const total = unkeyed.reduce((a, b) => a + b, 0);
  check('q5 unkeyed alerts', total, profile.targets.unkeyedTotal);
  check('q5 unkeyed rules', unkeyed.length, profile.targets.unkeyedRuleCount);
  check(
    'q5 top 10 share',
    unkeyed.slice(0, 10).reduce((a, b) => a + b, 0) / total,
    profile.targets.top10UnkeyedShare
  );

  process.stdout.write(
    `${JSON.stringify(
      {
        index: args.index,
        loaded,
        tolerance: args.tolerance,
        failed: checks.filter((c) => !c.pass).length,
        checks,
      },
      null,
      2
    )}\n`
  );
  process.exit(checks.every((c) => c.pass) ? 0 : 1);
};
