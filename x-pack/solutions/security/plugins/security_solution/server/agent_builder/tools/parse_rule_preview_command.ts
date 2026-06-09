/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * CLI-style command parser for the run_rule_preview agent tool.
 *
 * No Kibana-specific imports — depends only on the JS standard library and
 * yargs so this module can be unit-tested in isolation without a full Kibana
 * bootstrap.
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Yargs = require('yargs') as typeof import('yargs');

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type ParsedPreviewCommand =
  | { kind: 'help'; text: string }
  | {
      kind: 'preview';
      rule: Record<string, unknown>;
      interval: string;
      timeframeStart: string;
      timeframeEnd: string;
    }
  | { kind: 'error'; message: string };

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------

/**
 * Splits a command string on whitespace while respecting single and double
 * quoted segments. Quote characters themselves are stripped from the output.
 *
 * e.g.  'esql --query "FROM logs-* | LIMIT 10"'
 *   =>  ['esql', '--query', 'FROM logs-* | LIMIT 10']
 */
export const tokenizeCommand = (command: string): string[] => {
  const tokens: string[] = [];
  let current = '';
  let inDouble = false;
  let inSingle = false;

  for (let i = 0; i < command.length; i++) {
    const ch = command[i];

    if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
    } else if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
    } else if ((ch === ' ' || ch === '\t' || ch === '\n') && !inDouble && !inSingle) {
      if (current.length > 0) {
        tokens.push(current);
        current = '';
      }
    } else {
      current += ch;
    }
  }

  if (current.length > 0) {
    tokens.push(current);
  }

  return tokens;
};

// ---------------------------------------------------------------------------
// Shared option groups
// ---------------------------------------------------------------------------

const SCHEDULE_OPTIONS = {
  interval: { type: 'string' as const, default: '1h', desc: 'Rule run frequency, e.g. "5m", "1h"' },
  'timeframe-start': {
    type: 'string' as const,
    default: 'now-1h',
    desc: 'Preview window start as datemath, e.g. "now-24h"',
  },
  'timeframe-end': {
    type: 'string' as const,
    default: 'now',
    desc: 'Preview window end as datemath',
  },
};

const INDEX_OPTIONS = {
  index: {
    type: 'string' as const,
    array: true as const,
    desc: 'Index pattern (repeat for multiple)',
  },
  'data-view-id': { type: 'string' as const, desc: 'Kibana data view ID (alternative to --index)' },
};

const QUERY_LANGUAGE_OPTIONS = {
  language: {
    type: 'string' as const,
    choices: ['kuery', 'lucene'] as const,
    default: 'kuery',
    desc: 'Query language: "kuery" (KQL, default) or "lucene"',
  },
};

// ---------------------------------------------------------------------------
// Per-type rule builders
// ---------------------------------------------------------------------------

type RuleType =
  | 'esql'
  | 'eql'
  | 'query'
  | 'saved_query'
  | 'threshold'
  | 'threat_match'
  | 'machine_learning'
  | 'new_terms';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ParsedArgv = Record<string, any>;

const RULE_BUILDERS: Record<RuleType, (argv: ParsedArgv) => Record<string, unknown>> = {
  esql: (argv) => ({ type: 'esql', query: argv.query, language: 'esql' }),

  eql: (argv) => ({
    type: 'eql',
    query: argv.query,
    language: 'eql',
    ...(argv.index?.length && { index: argv.index }),
    ...(argv.dataViewId && { data_view_id: argv.dataViewId }),
  }),

  query: (argv) => ({
    type: 'query',
    ...(argv.query && { query: argv.query }),
    ...(argv.language && { language: argv.language }),
    ...(argv.index?.length && { index: argv.index }),
    ...(argv.dataViewId && { data_view_id: argv.dataViewId }),
  }),

  saved_query: (argv) => ({
    type: 'saved_query',
    saved_id: argv.savedId,
    ...(argv.query && { query: argv.query }),
    ...(argv.language && { language: argv.language }),
    ...(argv.index?.length && { index: argv.index }),
    ...(argv.dataViewId && { data_view_id: argv.dataViewId }),
  }),

  threshold: (argv) => ({
    type: 'threshold',
    query: argv.query,
    threshold: { field: argv.thresholdField ?? [], value: argv.thresholdValue },
    ...(argv.language && { language: argv.language }),
    ...(argv.index?.length && { index: argv.index }),
    ...(argv.dataViewId && { data_view_id: argv.dataViewId }),
  }),

  threat_match: (argv) => ({
    type: 'threat_match',
    query: argv.query,
    threat_query: argv.threatQuery,
    threat_index: argv.threatIndex,
    threat_mapping: argv.threatMapping,
    ...(argv.threatFilters !== undefined && { threat_filters: argv.threatFilters }),
    ...(argv.threatIndicatorPath && { threat_indicator_path: argv.threatIndicatorPath }),
    ...(argv.language && { language: argv.language }),
    ...(argv.index?.length && { index: argv.index }),
    ...(argv.dataViewId && { data_view_id: argv.dataViewId }),
  }),

  machine_learning: (argv) => ({
    type: 'machine_learning',
    machine_learning_job_id: argv.jobId.length === 1 ? argv.jobId[0] : argv.jobId,
    anomaly_threshold: argv.anomalyThreshold,
  }),

  new_terms: (argv) => ({
    type: 'new_terms',
    query: argv.query,
    new_terms_fields: argv.newTermsFields,
    history_window_start: argv.historyWindowStart,
    ...(argv.language && { language: argv.language }),
    ...(argv.index?.length && { index: argv.index }),
    ...(argv.dataViewId && { data_view_id: argv.dataViewId }),
  }),
};

// ---------------------------------------------------------------------------
// Parser builder
// ---------------------------------------------------------------------------

const buildParser = (tokens: string[]) =>
  Yargs(tokens)
    .options(SCHEDULE_OPTIONS)
    .command('esql', 'ES|QL detection rule', (y: ReturnType<typeof Yargs>) =>
      y
        .option('query', { type: 'string', demandOption: true, desc: 'ES|QL query string' })
        .example('$0 esql --query "FROM logs-* | LIMIT 10"', '')
        .example(
          '$0 esql --query "FROM logs-* | STATS count() BY host.name" --timeframe-start now-24h',
          ''
        )
    )
    .command('eql', 'EQL (event query language) detection rule', (y: ReturnType<typeof Yargs>) =>
      y
        .option('query', { type: 'string', demandOption: true, desc: 'EQL query string' })
        .options(INDEX_OPTIONS)
        .example('$0 eql --query "process where process.name == \\"cmd.exe\\""', '')
    )
    .command('query', 'Custom query detection rule (KQL / Lucene)', (y: ReturnType<typeof Yargs>) =>
      y
        .option('query', {
          type: 'string',
          desc: 'KQL / Lucene query (omit to match all documents)',
        })
        .options(QUERY_LANGUAGE_OPTIONS)
        .options(INDEX_OPTIONS)
        .example('$0 query --query "event.category:authentication AND event.outcome:failure"', '')
    )
    .command('saved_query', 'Saved query detection rule', (y: ReturnType<typeof Yargs>) =>
      y
        .option('saved-id', {
          type: 'string',
          demandOption: true,
          desc: 'Saved query ID (Kibana saved object)',
        })
        .option('query', { type: 'string', desc: 'KQL / Lucene query override' })
        .options(QUERY_LANGUAGE_OPTIONS)
        .options(INDEX_OPTIONS)
        .example('$0 saved_query --saved-id my-saved-query-id', '')
    )
    .command('threshold', 'Threshold-based detection rule', (y: ReturnType<typeof Yargs>) =>
      y
        .option('query', { type: 'string', demandOption: true, desc: 'KQL / Lucene query' })
        .option('threshold-value', {
          type: 'number',
          demandOption: true,
          desc: 'Minimum event count to alert (integer ≥ 1)',
        })
        .coerce('threshold-value', (v: number) => {
          if (!Number.isFinite(v) || v < 0) {
            throw new Error(`--threshold-value must be a non-negative number. Got "${v}".`);
          }
          return v;
        })
        .option('threshold-field', {
          type: 'string',
          array: true,
          desc: 'Group-by field(s) (repeat for multiple, omit for no grouping)',
        })
        .options(QUERY_LANGUAGE_OPTIONS)
        .options(INDEX_OPTIONS)
        .example(
          '$0 threshold --query "event.category:auth" --threshold-value 10 --threshold-field host.name',
          ''
        )
    )
    .command(
      'threat_match',
      'Threat indicator match detection rule',
      (y: ReturnType<typeof Yargs>) =>
        y
          .option('query', { type: 'string', demandOption: true, desc: 'Source events query' })
          .option('threat-query', {
            type: 'string',
            demandOption: true,
            desc: 'Query against the threat index',
          })
          .option('threat-index', {
            type: 'string',
            array: true,
            demandOption: true,
            desc: 'Threat intelligence index pattern (repeat for multiple)',
          })
          .option('threat-mapping', {
            type: 'string',
            demandOption: true,
            desc: 'JSON array of field-mapping entries: \'[{"entries":[{"field":"src.ip","type":"mapping","value":"dst.ip"}]}]\'',
          })
          .coerce('threat-mapping', (v: string) => {
            let parsed: unknown;
            try {
              parsed = JSON.parse(v);
            } catch {
              throw new Error(`--threat-mapping is not valid JSON: ${v}`);
            }
            if (!Array.isArray(parsed)) {
              throw new Error('--threat-mapping must be a JSON array');
            }
            return parsed;
          })
          .option('threat-filters', {
            type: 'string',
            desc: 'Additional threat index filters (JSON array)',
          })
          .coerce('threat-filters', (v: string) => JSON.parse(v))
          .option('threat-indicator-path', {
            type: 'string',
            desc: 'Nested path to indicator object (default: "threat.indicator")',
          })
          .options(QUERY_LANGUAGE_OPTIONS)
          .options(INDEX_OPTIONS)
          .example(
            '$0 threat_match --query "*:*" --threat-query "*:*" --threat-index logs-ti_* --threat-mapping \'[{"entries":[{"field":"source.ip","type":"mapping","value":"threat.indicator.ip"}]}]\'',
            ''
          )
    )
    .command(
      'machine_learning',
      'Machine learning anomaly detection rule',
      (y: ReturnType<typeof Yargs>) =>
        y
          .option('job-id', {
            type: 'string',
            array: true,
            demandOption: true,
            desc: 'ML job ID (repeat for multiple jobs)',
          })
          .option('anomaly-threshold', {
            type: 'number',
            demandOption: true,
            desc: 'Minimum anomaly score to alert (0–100)',
          })
          .example('$0 machine_learning --job-id my-ml-job --anomaly-threshold 75', '')
          .example('$0 machine_learning --job-id job-a --job-id job-b --anomaly-threshold 50', '')
    )
    .command('new_terms', 'New terms detection rule', (y: ReturnType<typeof Yargs>) =>
      y
        .option('query', {
          type: 'string',
          demandOption: true,
          desc: 'KQL / Lucene query for events to analyse',
        })
        .option('new-terms-fields', {
          type: 'string',
          array: true,
          demandOption: true,
          desc: 'Field(s) to monitor for new values (repeat for multiple, max 3)',
        })
        .option('history-window-start', {
          type: 'string',
          demandOption: true,
          desc: 'Start of the baseline window as datemath, e.g. "now-30d"',
        })
        .options(QUERY_LANGUAGE_OPTIONS)
        .options(INDEX_OPTIONS)
        .example(
          '$0 new_terms --query "*:*" --new-terms-fields source.ip --history-window-start now-30d',
          ''
        )
    )
    .demandCommand(1, 'Specify a rule type. Run --help to see all types and examples.')
    .alias('h', 'help')
    .strict()
    .exitProcess(false)
    .wrap(null)
    .version(false);

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Parses a CLI-style command string and returns a discriminated union result:
 * - `kind: 'help'`    — the command asked for help; `text` has the help content
 * - `kind: 'preview'` — valid command; `rule`, `interval`, `timeframeStart`, `timeframeEnd` are ready to use
 * - `kind: 'error'`   — invalid command; `message` explains the problem (with relevant help appended)
 */
export const parseRulePreviewCommand = (command: string): ParsedPreviewCommand => {
  const tokens = tokenizeCommand(command);

  if (tokens.length === 0) {
    return { kind: 'error', message: 'No command provided. Run with --help to see usage.' };
  }

  let failMsg: string | undefined;
  let captured: ParsedPreviewCommand | undefined;

  const parser = buildParser(tokens).fail((msg: string | null) => {
    failMsg = msg ?? 'Parse error.';
  });

  parser.parse(tokens, {}, (err: Error | null, argv: ParsedArgv, output: string) => {
    if (failMsg !== undefined) {
      captured = { kind: 'error', message: output || failMsg };
      return;
    }
    if (output) {
      captured = { kind: 'help', text: output };
      return;
    }
    if (err) {
      captured = { kind: 'error', message: err.message };
      return;
    }
    const type = (argv._ as string[])[0] as RuleType;
    const builder = RULE_BUILDERS[type];
    if (!builder) {
      captured = {
        kind: 'error',
        message: `Unknown rule type "${type}". Run --help to see available types.`,
      };
      return;
    }
    try {
      captured = {
        kind: 'preview',
        rule: builder(argv),
        interval: (argv.interval as string | undefined) ?? '1h',
        timeframeStart: (argv.timeframeStart as string | undefined) ?? 'now-1h',
        timeframeEnd: (argv.timeframeEnd as string | undefined) ?? 'now',
      };
    } catch (buildErr) {
      captured = {
        kind: 'error',
        message: `Rule build error: ${
          buildErr instanceof Error ? buildErr.message : String(buildErr)
        }`,
      };
    }
  });

  return (
    captured ?? { kind: 'error', message: 'Unexpected parse state. Run with --help to see usage.' }
  );
};
