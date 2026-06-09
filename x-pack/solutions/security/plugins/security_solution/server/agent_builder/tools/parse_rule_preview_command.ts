/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * CLI-style command parser for the run_rule_preview agent tool.
 *
 * No Kibana-specific imports — depends only on the JS standard library so this
 * module can be unit-tested in isolation without a full Kibana bootstrap.
 */

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
// Valid rule types
// ---------------------------------------------------------------------------

export const VALID_RULE_TYPES = [
  'esql',
  'eql',
  'query',
  'saved_query',
  'threshold',
  'threat_match',
  'machine_learning',
  'new_terms',
] as const;

type RuleType = (typeof VALID_RULE_TYPES)[number];

// ---------------------------------------------------------------------------
// Known CLI flags
// ---------------------------------------------------------------------------

/** Flags that take no value (boolean). */
const BOOLEAN_FLAGS = new Set(['--help', '-h']);

/** Flags that accept multiple values (can be repeated). */
const MULTI_VALUE_FLAGS = new Set([
  '--index',
  '--threshold-field',
  '--threat-index',
  '--job-id',
  '--new-terms-fields',
]);

/** All flags that accept a single string value. */
const SINGLE_VALUE_FLAGS = new Set([
  '--type',
  '--query',
  '--language',
  '--data-view-id',
  '--saved-id',
  '--threshold-value',
  '--threat-query',
  '--threat-mapping',
  '--threat-filters',
  '--threat-indicator-path',
  '--anomaly-threshold',
  '--history-window-start',
  '--interval',
  '--timeframe-start',
  '--timeframe-end',
]);

/** All known flags (used for unknown-flag detection). */
const ALL_KNOWN_FLAGS = new Set([...BOOLEAN_FLAGS, ...MULTI_VALUE_FLAGS, ...SINGLE_VALUE_FLAGS]);

// ---------------------------------------------------------------------------
// Help text
// ---------------------------------------------------------------------------

export const GLOBAL_HELP = `\
USAGE
  run_rule_preview --type <rule_type> [options]

RULE TYPES
  esql            ES|QL detection rule
  eql             EQL (event query language) detection rule
  query           Custom query detection rule (KQL / Lucene)
  saved_query     Saved query detection rule
  threshold       Threshold-based detection rule
  threat_match    Threat intelligence match detection rule
  machine_learning  Machine learning anomaly detection rule
  new_terms       New terms detection rule

GLOBAL OPTIONS
  --type <type>             Rule type (required)
  --interval <dur>          How often the rule runs, e.g. "5m", "1h" (default: 1h)
  --timeframe-start <dm>    Preview window start as datemath, e.g. "now-24h" (default: now-1h)
  --timeframe-end <dm>      Preview window end as datemath (default: now)
  --help, -h                Show this help or type-specific help when combined with --type

TYPE-SPECIFIC HELP
  Pass --type <rule_type> --help for detailed options and examples.

QUICK EXAMPLES
  --type esql --query "FROM logs-* | LIMIT 10"
  --type eql --query "sequence [process where process.name == \\"cmd.exe\\"]"
  --type query --query "user.name: admin"
  --type saved_query --saved-id my-saved-query-id
  --type threshold --query "process.name: *" --threshold-value 5
  --type threat_match --query "*:*" --threat-query "*:*" --threat-index threat-intel --threat-mapping '[{"entries":[{"field":"source.ip","type":"mapping","value":"destination.ip"}]}]'
  --type machine_learning --job-id my-ml-job --anomaly-threshold 50
  --type new_terms --query "*:*" --new-terms-fields source.ip --history-window-start now-30d
`;

const TYPE_HELP: Record<RuleType, string> = {
  esql: `\
ES|QL RULE PREVIEW
  Preview a rule that uses the ES|QL query language.

REQUIRED
  --query <esql>          ES|QL query string (e.g. "FROM logs-* | LIMIT 10")

OPTIONAL
  --interval <dur>        Rule run interval (default: 1h)
  --timeframe-start <dm>  Preview start as datemath (default: now-1h)
  --timeframe-end <dm>    Preview end as datemath (default: now)

EXAMPLE
  --type esql --query "FROM logs-* | STATS count() BY host.name | WHERE count() > 100"
`,

  eql: `\
EQL RULE PREVIEW
  Preview a rule that uses EQL (event query language).

REQUIRED
  --query <eql>           EQL query string

OPTIONAL
  --language <lang>       Query language override (default: eql)
  --index <pattern>       Index pattern(s) to search (repeatable)
  --data-view-id <id>     Kibana data view ID
  --interval <dur>        Rule run interval (default: 1h)
  --timeframe-start <dm>  Preview start as datemath (default: now-1h)
  --timeframe-end <dm>    Preview end as datemath (default: now)

EXAMPLE
  --type eql --query "sequence [process where process.name == \\"powershell.exe\\"]" --index logs-*
`,

  query: `\
QUERY RULE PREVIEW
  Preview a custom query detection rule (KQL or Lucene).

OPTIONAL
  --query <kql>           KQL / Lucene query (default: matches all)
  --language <lang>       "kuery" or "lucene" (default: kuery)
  --index <pattern>       Index pattern(s) to search (repeatable)
  --data-view-id <id>     Kibana data view ID
  --interval <dur>        Rule run interval (default: 1h)
  --timeframe-start <dm>  Preview start as datemath (default: now-1h)
  --timeframe-end <dm>    Preview end as datemath (default: now)

EXAMPLE
  --type query --query "user.name: admin AND event.action: login" --index logs-*
`,

  saved_query: `\
SAVED QUERY RULE PREVIEW
  Preview a rule that references a previously saved KQL query.

REQUIRED
  --saved-id <id>         Saved query ID (Kibana saved object)

OPTIONAL
  --query <kql>           KQL / Lucene query override
  --language <lang>       "kuery" or "lucene"
  --index <pattern>       Index pattern(s) to search (repeatable)
  --data-view-id <id>     Kibana data view ID
  --interval <dur>        Rule run interval (default: 1h)
  --timeframe-start <dm>  Preview start as datemath (default: now-1h)
  --timeframe-end <dm>    Preview end as datemath (default: now)

EXAMPLE
  --type saved_query --saved-id my-saved-query-id
`,

  threshold: `\
THRESHOLD RULE PREVIEW
  Preview a rule that fires when an aggregated count exceeds a threshold.

REQUIRED
  --query <kql>           KQL / Lucene query (matches which events to aggregate)
  --threshold-value <n>   Minimum event count to trigger an alert (integer ≥ 1)

OPTIONAL
  --threshold-field <f>   Group-by field(s) for the threshold (repeatable)
  --language <lang>       "kuery" or "lucene"
  --index <pattern>       Index pattern(s) to search (repeatable)
  --data-view-id <id>     Kibana data view ID
  --interval <dur>        Rule run interval (default: 1h)
  --timeframe-start <dm>  Preview start as datemath (default: now-1h)
  --timeframe-end <dm>    Preview end as datemath (default: now)

EXAMPLE
  --type threshold --query "process.name: *" --threshold-value 5 --threshold-field host.name
`,

  threat_match: `\
THREAT MATCH RULE PREVIEW
  Preview a rule that matches events against a threat intelligence index.

REQUIRED
  --query <kql>             Source events query
  --threat-query <kql>      Query against the threat index
  --threat-index <pattern>  Threat intelligence index (repeatable)
  --threat-mapping <json>   JSON array of field-mapping entries, e.g.:
                            '[{"entries":[{"field":"src.ip","type":"mapping","value":"dst.ip"}]}]'

OPTIONAL
  --threat-filters <json>   Additional filters for the threat index (JSON array)
  --threat-indicator-path <path>  Nested path to indicator object
  --language <lang>         "kuery" or "lucene"
  --index <pattern>         Source index pattern(s) (repeatable)
  --data-view-id <id>       Kibana data view ID
  --interval <dur>          Rule run interval (default: 1h)
  --timeframe-start <dm>    Preview start as datemath (default: now-1h)
  --timeframe-end <dm>      Preview end as datemath (default: now)

EXAMPLE
  --type threat_match --query "*:*" --threat-query "*:*" \\
    --threat-index threat-intel-* \\
    --threat-mapping '[{"entries":[{"field":"source.ip","type":"mapping","value":"destination.ip"}]}]'
`,

  machine_learning: `\
MACHINE LEARNING RULE PREVIEW
  Preview an anomaly detection rule backed by a Machine Learning job.

REQUIRED
  --job-id <id>             ML job ID (repeatable for multiple jobs)
  --anomaly-threshold <n>   Minimum anomaly score to trigger (0–100)

OPTIONAL
  --interval <dur>          Rule run interval (default: 1h)
  --timeframe-start <dm>    Preview start as datemath (default: now-1h)
  --timeframe-end <dm>      Preview end as datemath (default: now)

EXAMPLE
  --type machine_learning --job-id my-ml-job --anomaly-threshold 75
`,

  new_terms: `\
NEW TERMS RULE PREVIEW
  Preview a rule that fires when a previously unseen field value appears.

REQUIRED
  --query <kql>               KQL / Lucene query (events to analyse)
  --new-terms-fields <field>  Field(s) to monitor for new values (repeatable)
  --history-window-start <dm> Start of the baseline window as datemath, e.g. "now-30d"

OPTIONAL
  --language <lang>           "kuery" or "lucene"
  --index <pattern>           Index pattern(s) to search (repeatable)
  --data-view-id <id>         Kibana data view ID
  --interval <dur>            Rule run interval (default: 1h)
  --timeframe-start <dm>      Preview start as datemath (default: now-1h)
  --timeframe-end <dm>        Preview end as datemath (default: now)

EXAMPLE
  --type new_terms --query "*:*" --new-terms-fields source.ip --history-window-start now-30d
`,
};

// ---------------------------------------------------------------------------
// Token types
// ---------------------------------------------------------------------------

interface ParsedArgs {
  values: Record<string, string | string[] | boolean | undefined>;
}

type ParseArgsResult = ParsedArgs | { error: string };

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------

/**
 * Splits a command string on whitespace while respecting single and double
 * quoted segments. Quote characters themselves are stripped from the output.
 *
 * e.g.  '--query "FROM logs-* | LIMIT 10"'
 *   =>  ['--query', 'FROM logs-* | LIMIT 10']
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
// Arg parser
// ---------------------------------------------------------------------------

/**
 * Parses a token array into a flat map of flag → value(s).
 *
 * - Boolean flags  : stored as `true`
 * - Multi-value flags: stored as `string[]`
 * - Single-value flags: stored as `string`
 * - Unknown flags  : returns `{ error }` immediately
 * - Value missing  : returns `{ error }` immediately
 */
const parseCliArgs = (tokens: string[]): ParseArgsResult => {
  const values: Record<string, string | string[] | boolean | undefined> = {};

  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];

    if (!token.startsWith('-')) {
      return {
        error: `Unexpected positional argument "${token}". All arguments must use -- flags.`,
      };
    }

    if (!ALL_KNOWN_FLAGS.has(token)) {
      // Suggest a close match when possible
      const suggestion = findClosestFlag(token);
      const hint = suggestion ? ` Did you mean "${suggestion}"?` : '';
      return {
        error: `Unknown option "${token}".${hint} Run with --help to see all options.`,
      };
    }

    if (BOOLEAN_FLAGS.has(token)) {
      values[token] = true;
      i++;
    } else if (MULTI_VALUE_FLAGS.has(token)) {
      // Peek at next token for value
      if (i + 1 >= tokens.length || tokens[i + 1].startsWith('-')) {
        return { error: `Option "${token}" requires a value.` };
      }
      i++;
      const existing = values[token];
      if (Array.isArray(existing)) {
        existing.push(tokens[i]);
      } else {
        values[token] = [tokens[i]];
      }
      i++;
    } else {
      // Single-value flag
      if (i + 1 >= tokens.length || tokens[i + 1].startsWith('-')) {
        return { error: `Option "${token}" requires a value.` };
      }
      i++;
      values[token] = tokens[i];
      i++;
    }
  }

  return { values };
};

/** Simple Levenshtein distance for flag suggestions (max 2 edits). */
const findClosestFlag = (input: string): string | undefined => {
  let best: string | undefined;
  let bestDist = 3; // threshold

  for (const flag of ALL_KNOWN_FLAGS) {
    const dist = levenshtein(input, flag);
    if (dist < bestDist) {
      bestDist = dist;
      best = flag;
    }
  }

  return best;
};

const levenshtein = (a: string, b: string): number => {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_rowIgnored, i) =>
    Array.from({ length: n + 1 }, (_colIgnored, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
};

// ---------------------------------------------------------------------------
// Per-type rule builders
// ---------------------------------------------------------------------------

type BuildResult = { rule: Record<string, unknown> } | { error: string };

const getString = (
  values: Record<string, string | string[] | boolean | undefined>,
  flag: string
): string | undefined => {
  const v = values[flag];
  return typeof v === 'string' ? v : undefined;
};

const getArray = (
  values: Record<string, string | string[] | boolean | undefined>,
  flag: string
): string[] | undefined => {
  const v = values[flag];
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') return [v];
  return undefined;
};

const parsePositiveNumber = (
  raw: string,
  flagName: string
): { value: number } | { error: string } => {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) {
    return {
      error: `"${flagName}" must be a non-negative number. Got "${raw}".`,
    };
  }
  return { value: n };
};

const parseJsonArray = (
  raw: string,
  flagName: string
): { value: unknown[] } | { error: string } => {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return { error: `"${flagName}" must be a JSON array. Got a ${typeof parsed}.` };
    }
    return { value: parsed };
  } catch {
    return { error: `"${flagName}" is not valid JSON. ${raw}` };
  }
};

const parseJsonValue = (raw: string, flagName: string): { value: unknown } | { error: string } => {
  try {
    return { value: JSON.parse(raw) };
  } catch {
    return { error: `"${flagName}" is not valid JSON. ${raw}` };
  }
};

// Common optional fields shared across multiple rule types
const sharedOptionals = (
  values: Record<string, string | string[] | boolean | undefined>
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  const language = getString(values, '--language');
  if (language !== undefined) result.language = language;
  const index = getArray(values, '--index');
  if (index !== undefined) result.index = index;
  const dataViewId = getString(values, '--data-view-id');
  if (dataViewId !== undefined) result.data_view_id = dataViewId;
  return result;
};

const buildEsqlRule = (
  values: Record<string, string | string[] | boolean | undefined>
): BuildResult => {
  const query = getString(values, '--query');
  if (!query) {
    return {
      error: `ES|QL rule requires --query.\n\n${TYPE_HELP.esql}`,
    };
  }
  return { rule: { type: 'esql', query, language: 'esql' } };
};

const buildEqlRule = (
  values: Record<string, string | string[] | boolean | undefined>
): BuildResult => {
  const query = getString(values, '--query');
  if (!query) {
    return {
      error: `EQL rule requires --query.\n\n${TYPE_HELP.eql}`,
    };
  }
  return {
    rule: {
      type: 'eql',
      query,
      language: 'eql',
      ...sharedOptionals(values),
    },
  };
};

const buildQueryRule = (
  values: Record<string, string | string[] | boolean | undefined>
): BuildResult => {
  const rule: Record<string, unknown> = { type: 'query', ...sharedOptionals(values) };
  const query = getString(values, '--query');
  if (query !== undefined) rule.query = query;
  return { rule };
};

const buildSavedQueryRule = (
  values: Record<string, string | string[] | boolean | undefined>
): BuildResult => {
  const savedId = getString(values, '--saved-id');
  if (!savedId) {
    return {
      error: `saved_query rule requires --saved-id.\n\n${TYPE_HELP.saved_query}`,
    };
  }
  const rule: Record<string, unknown> = {
    type: 'saved_query',
    saved_id: savedId,
    ...sharedOptionals(values),
  };
  const query = getString(values, '--query');
  if (query !== undefined) rule.query = query;
  return { rule };
};

const buildThresholdRule = (
  values: Record<string, string | string[] | boolean | undefined>
): BuildResult => {
  const query = getString(values, '--query');
  if (!query) {
    return {
      error: `Threshold rule requires --query.\n\n${TYPE_HELP.threshold}`,
    };
  }
  const thresholdValueRaw = getString(values, '--threshold-value');
  if (!thresholdValueRaw) {
    return {
      error: `Threshold rule requires --threshold-value.\n\n${TYPE_HELP.threshold}`,
    };
  }
  const parsed = parsePositiveNumber(thresholdValueRaw, '--threshold-value');
  if ('error' in parsed) {
    return { error: `${parsed.error}\n\n${TYPE_HELP.threshold}` };
  }
  const thresholdFields = getArray(values, '--threshold-field') ?? [];
  return {
    rule: {
      type: 'threshold',
      query,
      threshold: { field: thresholdFields, value: parsed.value },
      ...sharedOptionals(values),
    },
  };
};

const buildThreatMatchRule = (
  values: Record<string, string | string[] | boolean | undefined>
): BuildResult => {
  const query = getString(values, '--query');
  if (!query) {
    return { error: `Threat match rule requires --query.\n\n${TYPE_HELP.threat_match}` };
  }
  const threatQuery = getString(values, '--threat-query');
  if (!threatQuery) {
    return {
      error: `Threat match rule requires --threat-query.\n\n${TYPE_HELP.threat_match}`,
    };
  }
  const threatIndex = getArray(values, '--threat-index');
  if (!threatIndex || threatIndex.length === 0) {
    return {
      error: `Threat match rule requires --threat-index.\n\n${TYPE_HELP.threat_match}`,
    };
  }
  const threatMappingRaw = getString(values, '--threat-mapping');
  if (!threatMappingRaw) {
    return {
      error: `Threat match rule requires --threat-mapping (JSON array).\n\n${TYPE_HELP.threat_match}`,
    };
  }
  const mappingParsed = parseJsonArray(threatMappingRaw, '--threat-mapping');
  if ('error' in mappingParsed) {
    return { error: `${mappingParsed.error}\n\n${TYPE_HELP.threat_match}` };
  }

  const rule: Record<string, unknown> = {
    type: 'threat_match',
    query,
    threat_query: threatQuery,
    threat_index: threatIndex,
    threat_mapping: mappingParsed.value,
    ...sharedOptionals(values),
  };

  const threatFiltersRaw = getString(values, '--threat-filters');
  if (threatFiltersRaw !== undefined) {
    const filtersParsed = parseJsonValue(threatFiltersRaw, '--threat-filters');
    if ('error' in filtersParsed) {
      return { error: `${filtersParsed.error}\n\n${TYPE_HELP.threat_match}` };
    }
    rule.threat_filters = filtersParsed.value;
  }

  const threatIndicatorPath = getString(values, '--threat-indicator-path');
  if (threatIndicatorPath !== undefined) rule.threat_indicator_path = threatIndicatorPath;

  return { rule };
};

const buildMachineLearningRule = (
  values: Record<string, string | string[] | boolean | undefined>
): BuildResult => {
  const jobIds = getArray(values, '--job-id');
  if (!jobIds || jobIds.length === 0) {
    return {
      error: `Machine learning rule requires --job-id.\n\n${TYPE_HELP.machine_learning}`,
    };
  }
  const anomalyRaw = getString(values, '--anomaly-threshold');
  if (!anomalyRaw) {
    return {
      error: `Machine learning rule requires --anomaly-threshold.\n\n${TYPE_HELP.machine_learning}`,
    };
  }
  const parsed = parsePositiveNumber(anomalyRaw, '--anomaly-threshold');
  if ('error' in parsed) {
    return { error: `${parsed.error}\n\n${TYPE_HELP.machine_learning}` };
  }
  return {
    rule: {
      type: 'machine_learning',
      machine_learning_job_id: jobIds.length === 1 ? jobIds[0] : jobIds,
      anomaly_threshold: parsed.value,
    },
  };
};

const buildNewTermsRule = (
  values: Record<string, string | string[] | boolean | undefined>
): BuildResult => {
  const query = getString(values, '--query');
  if (!query) {
    return { error: `New terms rule requires --query.\n\n${TYPE_HELP.new_terms}` };
  }
  const newTermsFields = getArray(values, '--new-terms-fields');
  if (!newTermsFields || newTermsFields.length === 0) {
    return {
      error: `New terms rule requires --new-terms-fields.\n\n${TYPE_HELP.new_terms}`,
    };
  }
  const historyWindowStart = getString(values, '--history-window-start');
  if (!historyWindowStart) {
    return {
      error: `New terms rule requires --history-window-start.\n\n${TYPE_HELP.new_terms}`,
    };
  }
  return {
    rule: {
      type: 'new_terms',
      query,
      new_terms_fields: newTermsFields,
      history_window_start: historyWindowStart,
      ...sharedOptionals(values),
    },
  };
};

const RULE_BUILDERS: Record<
  RuleType,
  (values: Record<string, string | string[] | boolean | undefined>) => BuildResult
> = {
  esql: buildEsqlRule,
  eql: buildEqlRule,
  query: buildQueryRule,
  saved_query: buildSavedQueryRule,
  threshold: buildThresholdRule,
  threat_match: buildThreatMatchRule,
  machine_learning: buildMachineLearningRule,
  new_terms: buildNewTermsRule,
};

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
    return {
      kind: 'error',
      message: `No arguments provided.\n\n${GLOBAL_HELP}`,
    };
  }

  const parseResult = parseCliArgs(tokens);
  if ('error' in parseResult) {
    return { kind: 'error', message: `${parseResult.error}\n\n${GLOBAL_HELP}` };
  }

  const { values } = parseResult;

  // --help / -h with no type → global help
  if ((values['--help'] || values['-h']) && !values['--type']) {
    return { kind: 'help', text: GLOBAL_HELP };
  }

  const rawType = getString(values, '--type');

  // --help with a type → type-specific help
  if ((values['--help'] || values['-h']) && rawType) {
    if (!isValidRuleType(rawType)) {
      return {
        kind: 'error',
        message: `Unknown rule type "${rawType}". Valid types: ${VALID_RULE_TYPES.join(
          ', '
        )}.\n\n${GLOBAL_HELP}`,
      };
    }
    return { kind: 'help', text: TYPE_HELP[rawType] };
  }

  if (!rawType) {
    return {
      kind: 'error',
      message: `--type is required. Valid types: ${VALID_RULE_TYPES.join(', ')}.\n\n${GLOBAL_HELP}`,
    };
  }

  if (!isValidRuleType(rawType)) {
    return {
      kind: 'error',
      message: `Unknown rule type "${rawType}". Valid types: ${VALID_RULE_TYPES.join(
        ', '
      )}.\n\n${GLOBAL_HELP}`,
    };
  }

  const buildResult = RULE_BUILDERS[rawType](values);
  if ('error' in buildResult) {
    return { kind: 'error', message: buildResult.error };
  }

  const interval = getString(values, '--interval') ?? '1h';
  const timeframeStart = getString(values, '--timeframe-start') ?? 'now-1h';
  const timeframeEnd = getString(values, '--timeframe-end') ?? 'now';

  return {
    kind: 'preview',
    rule: buildResult.rule,
    interval,
    timeframeStart,
    timeframeEnd,
  };
};

// ---------------------------------------------------------------------------
// Type guard
// ---------------------------------------------------------------------------

const isValidRuleType = (t: string): t is RuleType =>
  (VALID_RULE_TYPES as readonly string[]).includes(t);
