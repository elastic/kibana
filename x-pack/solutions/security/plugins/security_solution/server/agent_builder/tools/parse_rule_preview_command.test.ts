/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tokenizeCommand, parseRulePreviewCommand } from './parse_rule_preview_command';

// ---------------------------------------------------------------------------
// tokenizeCommand
// ---------------------------------------------------------------------------

describe('tokenizeCommand', () => {
  it('splits unquoted tokens on whitespace', () => {
    expect(tokenizeCommand('esql --query foo')).toEqual(['esql', '--query', 'foo']);
  });

  it('handles double-quoted values with spaces', () => {
    expect(tokenizeCommand('--query "FROM logs-* | LIMIT 10"')).toEqual([
      '--query',
      'FROM logs-* | LIMIT 10',
    ]);
  });

  it('handles single-quoted values with spaces', () => {
    expect(tokenizeCommand("--query 'FROM logs-* | LIMIT 10'")).toEqual([
      '--query',
      'FROM logs-* | LIMIT 10',
    ]);
  });

  it('handles mixed quoted and unquoted tokens', () => {
    expect(tokenizeCommand('esql --query "FROM logs-* | LIMIT 10" --interval 5m')).toEqual([
      'esql',
      '--query',
      'FROM logs-* | LIMIT 10',
      '--interval',
      '5m',
    ]);
  });

  it('returns empty array for empty string', () => {
    expect(tokenizeCommand('')).toEqual([]);
  });

  it('strips surrounding whitespace', () => {
    expect(tokenizeCommand('  esql  --query  foo  ')).toEqual(['esql', '--query', 'foo']);
  });

  it('preserves escaped double-quotes inside double-quoted strings', () => {
    // \" inside a double-quoted string should become a literal " in the token
    expect(tokenizeCommand('eql --query "process.name == \\"cmd.exe\\""')).toEqual([
      'eql',
      '--query',
      'process.name == "cmd.exe"',
    ]);
  });

  it('preserves escaped single-quotes inside single-quoted strings', () => {
    // \' inside a single-quoted string should become a literal ' in the token
    expect(tokenizeCommand("query --query 'it\\'s here'")).toEqual([
      'query',
      '--query',
      "it's here",
    ]);
  });
});

// ---------------------------------------------------------------------------
// Help responses
// ---------------------------------------------------------------------------

describe('parseRulePreviewCommand — help', () => {
  it('returns kind:help when --help is passed alone', () => {
    const result = parseRulePreviewCommand('--help');
    expect(result.kind).toBe('help');
  });

  it('returns kind:help with -h shorthand', () => {
    const result = parseRulePreviewCommand('-h');
    expect(result.kind).toBe('help');
  });

  it('returns type-specific help for esql --help', () => {
    const result = parseRulePreviewCommand('esql --help');
    expect(result.kind).toBe('help');
    if (result.kind === 'help') {
      expect(result.text).toContain('--query');
    }
  });

  it('returns type-specific help for machine_learning --help', () => {
    const result = parseRulePreviewCommand('machine_learning --help');
    expect(result.kind).toBe('help');
    if (result.kind === 'help') {
      expect(result.text).toContain('--job-id');
    }
  });
});

// ---------------------------------------------------------------------------
// Error cases — type validation
// ---------------------------------------------------------------------------

describe('parseRulePreviewCommand — type errors', () => {
  it('returns kind:error when no subcommand is provided', () => {
    const result = parseRulePreviewCommand('--query "FROM logs-*"');
    expect(result.kind).toBe('error');
  });

  it('returns kind:error for an unknown rule type subcommand', () => {
    const result = parseRulePreviewCommand('invalid_type');
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.message).toContain('invalid_type');
    }
  });

  it('returns kind:error for an unknown flag', () => {
    const result = parseRulePreviewCommand('esql --query "x" --bogus value');
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.message).toContain('bogus');
    }
  });

  it('returns kind:error for empty command', () => {
    const result = parseRulePreviewCommand('');
    expect(result.kind).toBe('error');
  });

  it('returns kind:help when an unknown subcommand is passed with --help (help takes priority)', () => {
    // yargs shows global help when --help is present, even for unknown subcommands
    const result = parseRulePreviewCommand('not_a_type --help');
    expect(result.kind).toBe('help');
  });
});

// ---------------------------------------------------------------------------
// Valid commands — all 8 rule types
// ---------------------------------------------------------------------------

describe('parseRulePreviewCommand — valid esql rule', () => {
  it('parses minimum valid esql command', () => {
    const result = parseRulePreviewCommand('esql --query "FROM logs-* | LIMIT 10"');
    expect(result.kind).toBe('preview');
    if (result.kind === 'preview') {
      expect(result.rule.type).toBe('esql');
      expect(result.rule.query).toBe('FROM logs-* | LIMIT 10');
      expect(result.rule.language).toBe('esql');
    }
  });
});

describe('parseRulePreviewCommand — valid eql rule', () => {
  it('parses minimum valid eql command', () => {
    const result = parseRulePreviewCommand(
      'eql --query "process where process.name == \\"cmd.exe\\""'
    );
    expect(result.kind).toBe('preview');
    if (result.kind === 'preview') {
      expect(result.rule.type).toBe('eql');
      expect(result.rule.language).toBe('eql');
    }
  });
});

describe('parseRulePreviewCommand — valid query rule', () => {
  it('parses minimum valid query command (no required args)', () => {
    const result = parseRulePreviewCommand('query');
    expect(result.kind).toBe('preview');
    if (result.kind === 'preview') {
      expect(result.rule.type).toBe('query');
    }
  });

  it('includes optional query when provided', () => {
    const result = parseRulePreviewCommand('query --query "user.name: admin"');
    expect(result.kind).toBe('preview');
    if (result.kind === 'preview') {
      expect(result.rule.query).toBe('user.name: admin');
    }
  });
});

describe('parseRulePreviewCommand — valid saved_query rule', () => {
  it('parses minimum valid saved_query command', () => {
    const result = parseRulePreviewCommand('saved_query --saved-id my-query-id');
    expect(result.kind).toBe('preview');
    if (result.kind === 'preview') {
      expect(result.rule.type).toBe('saved_query');
      expect(result.rule.saved_id).toBe('my-query-id');
    }
  });
});

describe('parseRulePreviewCommand — valid threshold rule', () => {
  it('parses minimum valid threshold command', () => {
    const result = parseRulePreviewCommand(
      'threshold --query "process.name: *" --threshold-value 5'
    );
    expect(result.kind).toBe('preview');
    if (result.kind === 'preview') {
      expect(result.rule.type).toBe('threshold');
      expect((result.rule.threshold as { value: number }).value).toBe(5);
    }
  });
});

describe('parseRulePreviewCommand — valid threat_match rule', () => {
  const validThreatMatchCmd =
    'threat_match --query "*:*" --threat-query "*:*" --threat-index threat-intel ' +
    '--threat-mapping \'[{"entries":[{"field":"source.ip","type":"mapping","value":"destination.ip"}]}]\'';

  it('parses minimum valid threat_match command', () => {
    const result = parseRulePreviewCommand(validThreatMatchCmd);
    expect(result.kind).toBe('preview');
    if (result.kind === 'preview') {
      expect(result.rule.type).toBe('threat_match');
      expect(result.rule.threat_query).toBe('*:*');
      expect(Array.isArray(result.rule.threat_index)).toBe(true);
      expect(Array.isArray(result.rule.threat_mapping)).toBe(true);
    }
  });
});

describe('parseRulePreviewCommand — valid machine_learning rule', () => {
  it('parses minimum valid machine_learning command', () => {
    const result = parseRulePreviewCommand(
      'machine_learning --job-id my-ml-job --anomaly-threshold 75'
    );
    expect(result.kind).toBe('preview');
    if (result.kind === 'preview') {
      expect(result.rule.type).toBe('machine_learning');
      expect(result.rule.machine_learning_job_id).toBe('my-ml-job');
      expect(result.rule.anomaly_threshold).toBe(75);
    }
  });

  it('stores multiple job-ids as an array', () => {
    const result = parseRulePreviewCommand(
      'machine_learning --job-id job-a --job-id job-b --anomaly-threshold 50'
    );
    expect(result.kind).toBe('preview');
    if (result.kind === 'preview') {
      expect(result.rule.machine_learning_job_id).toEqual(['job-a', 'job-b']);
    }
  });
});

describe('parseRulePreviewCommand — valid new_terms rule', () => {
  it('parses minimum valid new_terms command', () => {
    const result = parseRulePreviewCommand(
      'new_terms --query "*:*" --new-terms-fields source.ip --history-window-start now-30d'
    );
    expect(result.kind).toBe('preview');
    if (result.kind === 'preview') {
      expect(result.rule.type).toBe('new_terms');
      expect(result.rule.new_terms_fields).toEqual(['source.ip']);
      expect(result.rule.history_window_start).toBe('now-30d');
    }
  });
});

// ---------------------------------------------------------------------------
// Missing required args
// ---------------------------------------------------------------------------

describe('parseRulePreviewCommand — missing required args', () => {
  it('returns kind:error when esql rule is missing --query', () => {
    const result = parseRulePreviewCommand('esql');
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.message).toContain('query');
    }
  });

  it('returns kind:error when threshold rule is missing --threshold-value', () => {
    const result = parseRulePreviewCommand('threshold --query "process.name: *"');
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.message).toContain('threshold-value');
    }
  });

  it('returns kind:error when saved_query rule is missing --saved-id', () => {
    const result = parseRulePreviewCommand('saved_query');
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.message).toContain('saved-id');
    }
  });

  it('returns kind:error when machine_learning rule is missing --job-id', () => {
    const result = parseRulePreviewCommand('machine_learning --anomaly-threshold 50');
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.message).toContain('job-id');
    }
  });

  it('returns kind:error when threat_match rule is missing --threat-mapping', () => {
    const result = parseRulePreviewCommand(
      'threat_match --query "*:*" --threat-query "*:*" --threat-index idx'
    );
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.message).toContain('threat-mapping');
    }
  });

  it('returns kind:error when new_terms rule is missing --history-window-start', () => {
    const result = parseRulePreviewCommand('new_terms --query "*:*" --new-terms-fields source.ip');
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.message).toContain('history-window-start');
    }
  });

  it('returns kind:error when new_terms rule has more than 3 --new-terms-fields (API max)', () => {
    const result = parseRulePreviewCommand(
      'new_terms --query "*:*" --new-terms-fields a b c d --history-window-start now-30d'
    );
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.message).toContain('new-terms-fields');
    }
  });
});

// ---------------------------------------------------------------------------
// Numeric / JSON validation errors
// ---------------------------------------------------------------------------

describe('parseRulePreviewCommand — numeric / JSON validation', () => {
  it('returns kind:error when --threshold-value is NaN', () => {
    const result = parseRulePreviewCommand(
      'threshold --query "process.name: *" --threshold-value not-a-number'
    );
    expect(result.kind).toBe('error');
  });

  it('returns kind:error when --threshold-value is a float (API requires integer)', () => {
    const result = parseRulePreviewCommand(
      'threshold --query "process.name: *" --threshold-value 2.5'
    );
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.message).toContain('integer');
    }
  });

  it('returns kind:error when --anomaly-threshold is a float (API requires integer)', () => {
    const result = parseRulePreviewCommand(
      'machine_learning --job-id my-ml-job --anomaly-threshold 2.5'
    );
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.message).toContain('anomaly-threshold');
    }
  });

  it('returns kind:error when --anomaly-threshold is above 100', () => {
    const result = parseRulePreviewCommand(
      'machine_learning --job-id my-ml-job --anomaly-threshold 999'
    );
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.message).toContain('anomaly-threshold');
    }
  });

  it('returns kind:error when --anomaly-threshold is below 0', () => {
    const result = parseRulePreviewCommand(
      'machine_learning --job-id my-ml-job --anomaly-threshold -1'
    );
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.message).toContain('anomaly-threshold');
    }
  });

  it('returns kind:error for invalid JSON in --threat-mapping', () => {
    const result = parseRulePreviewCommand(
      'threat_match --query "*:*" --threat-query "*:*" --threat-index idx --threat-mapping not-json'
    );
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.message).toContain('threat-mapping');
    }
  });

  it('returns kind:error when --threat-mapping is a JSON object (not an array)', () => {
    const result = parseRulePreviewCommand(
      'threat_match --query "*:*" --threat-query "*:*" --threat-index idx --threat-mapping "{}"'
    );
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.message).toContain('threat-mapping');
    }
  });
});

// ---------------------------------------------------------------------------
// --filters (query, eql, saved_query, threshold, threat_match, new_terms)
// ---------------------------------------------------------------------------

describe('parseRulePreviewCommand — --filters', () => {
  it('parses --filters as a JSON array on a query rule', () => {
    const result = parseRulePreviewCommand(
      'query --query "user.name: admin" --filters \'[{"query":{"match_phrase":{"event.category":"process"}}}]\''
    );
    expect(result.kind).toBe('preview');
    if (result.kind === 'preview') {
      expect(result.rule.filters).toEqual([
        { query: { match_phrase: { 'event.category': 'process' } } },
      ]);
    }
  });

  it('parses --filters on an eql rule', () => {
    const result = parseRulePreviewCommand(
      'eql --query "process where true" --filters \'[{"query":{"match_phrase":{"host.name":"h1"}}}]\''
    );
    expect(result.kind).toBe('preview');
    if (result.kind === 'preview') {
      expect(Array.isArray(result.rule.filters)).toBe(true);
    }
  });

  it('omits filters from the rule when not provided', () => {
    const result = parseRulePreviewCommand('query --query "user.name: admin"');
    expect(result.kind).toBe('preview');
    if (result.kind === 'preview') {
      expect(result.rule.filters).toBeUndefined();
    }
  });

  it('returns kind:error for invalid JSON in --filters', () => {
    const result = parseRulePreviewCommand('query --filters not-json');
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.message).toContain('filters');
    }
  });

  it('returns kind:error when --filters is a JSON object (not an array)', () => {
    const result = parseRulePreviewCommand('query --filters "{}"');
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.message).toContain('filters');
    }
  });
});

// ---------------------------------------------------------------------------
// EQL advanced fields
// ---------------------------------------------------------------------------

describe('parseRulePreviewCommand — eql advanced fields', () => {
  it('parses --event-category-override, --tiebreaker-field, --timestamp-field', () => {
    const result = parseRulePreviewCommand(
      'eql --query "process where true" --event-category-override event.type ' +
        '--tiebreaker-field event.sequence --timestamp-field event.ingested'
    );
    expect(result.kind).toBe('preview');
    if (result.kind === 'preview') {
      expect(result.rule.event_category_override).toBe('event.type');
      expect(result.rule.tiebreaker_field).toBe('event.sequence');
      expect(result.rule.timestamp_field).toBe('event.ingested');
    }
  });

  it('omits eql advanced fields from the rule when not provided', () => {
    const result = parseRulePreviewCommand('eql --query "process where true"');
    expect(result.kind).toBe('preview');
    if (result.kind === 'preview') {
      expect(result.rule.event_category_override).toBeUndefined();
      expect(result.rule.tiebreaker_field).toBeUndefined();
      expect(result.rule.timestamp_field).toBeUndefined();
    }
  });
});

// ---------------------------------------------------------------------------
// threshold.cardinality
// ---------------------------------------------------------------------------

describe('parseRulePreviewCommand — threshold cardinality', () => {
  it('parses --cardinality-field / --cardinality-value pairs into threshold.cardinality', () => {
    const result = parseRulePreviewCommand(
      'threshold --query "process.name: *" --threshold-value 5 --threshold-field host.name ' +
        '--cardinality-field user.name --cardinality-value 3'
    );
    expect(result.kind).toBe('preview');
    if (result.kind === 'preview') {
      const threshold = result.rule.threshold as {
        cardinality?: Array<{ field: string; value: number }>;
      };
      expect(threshold.cardinality).toEqual([{ field: 'user.name', value: 3 }]);
    }
  });

  it('supports repeated --cardinality-field / --cardinality-value for multiple entries', () => {
    const result = parseRulePreviewCommand(
      'threshold --query "process.name: *" --threshold-value 5 ' +
        '--cardinality-field user.name --cardinality-field source.ip ' +
        '--cardinality-value 3 --cardinality-value 10'
    );
    expect(result.kind).toBe('preview');
    if (result.kind === 'preview') {
      const threshold = result.rule.threshold as {
        cardinality?: Array<{ field: string; value: number }>;
      };
      expect(threshold.cardinality).toEqual([
        { field: 'user.name', value: 3 },
        { field: 'source.ip', value: 10 },
      ]);
    }
  });

  it('omits threshold.cardinality when not provided', () => {
    const result = parseRulePreviewCommand(
      'threshold --query "process.name: *" --threshold-value 5'
    );
    expect(result.kind).toBe('preview');
    if (result.kind === 'preview') {
      const threshold = result.rule.threshold as { cardinality?: unknown };
      expect(threshold.cardinality).toBeUndefined();
    }
  });

  it('returns kind:error when --cardinality-field and --cardinality-value counts do not match', () => {
    const result = parseRulePreviewCommand(
      'threshold --query "process.name: *" --threshold-value 5 ' +
        '--cardinality-field user.name --cardinality-field source.ip --cardinality-value 3'
    );
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.message).toContain('cardinality-field');
    }
  });

  it('returns kind:error when a --cardinality-field overlaps --threshold-field', () => {
    const result = parseRulePreviewCommand(
      'threshold --query "process.name: *" --threshold-value 5 --threshold-field host.name ' +
        '--cardinality-field host.name --cardinality-value 3'
    );
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.message).toContain('Cardinality of a field that is being aggregated on');
    }
  });

  it('returns kind:error when --cardinality-value is negative', () => {
    const result = parseRulePreviewCommand(
      'threshold --query "process.name: *" --threshold-value 5 ' +
        '--cardinality-field user.name --cardinality-value -1'
    );
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.message).toContain('cardinality-value');
    }
  });

  it('returns kind:error when --cardinality-value is not an integer', () => {
    const result = parseRulePreviewCommand(
      'threshold --query "process.name: *" --threshold-value 5 ' +
        '--cardinality-field user.name --cardinality-value 1.5'
    );
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.message).toContain('cardinality-value');
    }
  });
});

// ---------------------------------------------------------------------------
// Schedule defaults and overrides
// ---------------------------------------------------------------------------

describe('parseRulePreviewCommand — schedule defaults', () => {
  it('uses default interval, timeframeStart, timeframeEnd when not provided', () => {
    const result = parseRulePreviewCommand('query');
    expect(result.kind).toBe('preview');
    if (result.kind === 'preview') {
      expect(result.interval).toBe('1h');
      expect(result.timeframeStart).toBe('now-1h');
      expect(result.timeframeEnd).toBe('now');
    }
  });

  it('applies --interval override', () => {
    const result = parseRulePreviewCommand('query --interval 5m');
    expect(result.kind).toBe('preview');
    if (result.kind === 'preview') {
      expect(result.interval).toBe('5m');
    }
  });

  it('applies --timeframe-start and --timeframe-end overrides', () => {
    const result = parseRulePreviewCommand(
      'query --interval 5m --timeframe-start now-6h --timeframe-end now-1h'
    );
    expect(result.kind).toBe('preview');
    if (result.kind === 'preview') {
      expect(result.interval).toBe('5m');
      expect(result.timeframeStart).toBe('now-6h');
      expect(result.timeframeEnd).toBe('now-1h');
    }
  });
});

// ---------------------------------------------------------------------------
// Progressive --help discovery — global
//
// Workflow: LLM calls --help first to discover the interface, then narrows
// to a specific type, then builds a real command.
// ---------------------------------------------------------------------------

describe('parseRulePreviewCommand — global --help', () => {
  it('--help returns kind:help', () => {
    expect(parseRulePreviewCommand('--help').kind).toBe('help');
  });

  it('-h shorthand returns kind:help', () => {
    expect(parseRulePreviewCommand('-h').kind).toBe('help');
  });

  it('global help lists all 8 rule types', () => {
    const result = parseRulePreviewCommand('--help');
    if (result.kind === 'help') {
      expect(result.text).toContain('esql');
      expect(result.text).toContain('eql');
      expect(result.text).toContain('query');
      expect(result.text).toContain('saved_query');
      expect(result.text).toContain('threshold');
      expect(result.text).toContain('threat_match');
      expect(result.text).toContain('machine_learning');
      expect(result.text).toContain('new_terms');
    }
  });

  it('global help includes Commands section', () => {
    const result = parseRulePreviewCommand('--help');
    if (result.kind === 'help') {
      expect(result.text).toContain('Commands');
    }
  });

  it('global help includes Options section', () => {
    const result = parseRulePreviewCommand('--help');
    if (result.kind === 'help') {
      expect(result.text).toContain('Options');
    }
  });
});

// ---------------------------------------------------------------------------
// Progressive --help discovery — esql
//
// Step 1 (global): --help
// Step 2 (type):   esql --help
// Step 3 (pre-run): esql --query "FROM logs-*" --help  →  still help, not preview
// ---------------------------------------------------------------------------

describe('parseRulePreviewCommand — progressive help: esql', () => {
  it('step 2 — esql --help returns kind:help', () => {
    expect(parseRulePreviewCommand('esql --help').kind).toBe('help');
  });

  it('step 2 — esql help mentions --query', () => {
    const result = parseRulePreviewCommand('esql --help');
    if (result.kind === 'help') expect(result.text).toContain('--query');
  });

  it('step 2 — esql help documents --query', () => {
    const result = parseRulePreviewCommand('esql --help');
    if (result.kind === 'help') {
      expect(result.text).toContain('--query');
    }
  });

  it('step 2 — esql help contains an example command', () => {
    const result = parseRulePreviewCommand('esql --help');
    if (result.kind === 'help') expect(result.text).toContain('Examples');
  });

  it('step 3 — esql --query "..." --help returns kind:help (help wins over args)', () => {
    const result = parseRulePreviewCommand('esql --query "FROM logs-* | LIMIT 10" --help');
    expect(result.kind).toBe('help');
  });
});

// ---------------------------------------------------------------------------
// Progressive --help discovery — eql
// ---------------------------------------------------------------------------

describe('parseRulePreviewCommand — progressive help: eql', () => {
  it('step 2 — eql --help returns kind:help', () => {
    expect(parseRulePreviewCommand('eql --help').kind).toBe('help');
  });

  it('step 2 — eql help mentions --query', () => {
    const result = parseRulePreviewCommand('eql --help');
    if (result.kind === 'help') expect(result.text).toContain('--query');
  });

  it('step 2 — eql help documents optional index flags', () => {
    const result = parseRulePreviewCommand('eql --help');
    if (result.kind === 'help') expect(result.text).toContain('--index');
  });

  it('step 3 — eql --query "..." --help returns kind:help (help wins)', () => {
    const result = parseRulePreviewCommand(
      'eql --query "process where process.name == \\"cmd.exe\\"" --help'
    );
    expect(result.kind).toBe('help');
  });
});

// ---------------------------------------------------------------------------
// Progressive --help discovery — query
// ---------------------------------------------------------------------------

describe('parseRulePreviewCommand — progressive help: query', () => {
  it('step 2 — query --help returns kind:help', () => {
    expect(parseRulePreviewCommand('query --help').kind).toBe('help');
  });

  it('step 2 — query help mentions --query option', () => {
    const result = parseRulePreviewCommand('query --help');
    if (result.kind === 'help') expect(result.text).toContain('--query');
  });

  it('step 3 — query --query "..." --help returns kind:help (help wins)', () => {
    const result = parseRulePreviewCommand('query --query "event.category:authentication" --help');
    expect(result.kind).toBe('help');
  });
});

// ---------------------------------------------------------------------------
// Progressive --help discovery — saved_query
// ---------------------------------------------------------------------------

describe('parseRulePreviewCommand — progressive help: saved_query', () => {
  it('step 2 — saved_query --help returns kind:help', () => {
    expect(parseRulePreviewCommand('saved_query --help').kind).toBe('help');
  });

  it('step 2 — saved_query help documents --saved-id', () => {
    const result = parseRulePreviewCommand('saved_query --help');
    if (result.kind === 'help') {
      expect(result.text).toContain('--saved-id');
    }
  });

  it('step 3 — saved_query --saved-id "..." --help returns kind:help (help wins)', () => {
    const result = parseRulePreviewCommand('saved_query --saved-id my-id --help');
    expect(result.kind).toBe('help');
  });
});

// ---------------------------------------------------------------------------
// Progressive --help discovery — threshold
// ---------------------------------------------------------------------------

describe('parseRulePreviewCommand — progressive help: threshold', () => {
  it('step 2 — threshold --help returns kind:help', () => {
    expect(parseRulePreviewCommand('threshold --help').kind).toBe('help');
  });

  it('step 2 — threshold help documents --threshold-value', () => {
    const result = parseRulePreviewCommand('threshold --help');
    if (result.kind === 'help') {
      expect(result.text).toContain('--threshold-value');
    }
  });

  it('step 2 — threshold help documents optional --threshold-field', () => {
    const result = parseRulePreviewCommand('threshold --help');
    if (result.kind === 'help') expect(result.text).toContain('--threshold-field');
  });

  it('step 3 — threshold --query "..." --threshold-value 5 --help returns kind:help (help wins)', () => {
    const result = parseRulePreviewCommand(
      'threshold --query "process.name: *" --threshold-value 5 --help'
    );
    expect(result.kind).toBe('help');
  });
});

// ---------------------------------------------------------------------------
// Progressive --help discovery — threat_match
// ---------------------------------------------------------------------------

describe('parseRulePreviewCommand — progressive help: threat_match', () => {
  it('step 2 — threat_match --help returns kind:help', () => {
    expect(parseRulePreviewCommand('threat_match --help').kind).toBe('help');
  });

  it('step 2 — threat_match help documents --threat-mapping', () => {
    const result = parseRulePreviewCommand('threat_match --help');
    if (result.kind === 'help') {
      expect(result.text).toContain('--threat-mapping');
    }
  });

  it('step 3 — full threat_match command with --help returns kind:help (help wins)', () => {
    const result = parseRulePreviewCommand(
      'threat_match --query "*:*" --threat-query "*:*" ' +
        "--threat-index ti-* --threat-mapping '[]' --help"
    );
    expect(result.kind).toBe('help');
  });
});

// ---------------------------------------------------------------------------
// Progressive --help discovery — machine_learning
// ---------------------------------------------------------------------------

describe('parseRulePreviewCommand — progressive help: machine_learning', () => {
  it('step 2 — machine_learning --help returns kind:help', () => {
    expect(parseRulePreviewCommand('machine_learning --help').kind).toBe('help');
  });

  it('step 2 — machine_learning help documents --job-id', () => {
    const result = parseRulePreviewCommand('machine_learning --help');
    if (result.kind === 'help') {
      expect(result.text).toContain('--job-id');
    }
  });

  it('step 2 — machine_learning help documents --anomaly-threshold', () => {
    const result = parseRulePreviewCommand('machine_learning --help');
    if (result.kind === 'help') expect(result.text).toContain('--anomaly-threshold');
  });

  it('step 3 — machine_learning --job-id "..." --anomaly-threshold 50 --help returns kind:help (help wins)', () => {
    const result = parseRulePreviewCommand(
      'machine_learning --job-id my-job --anomaly-threshold 50 --help'
    );
    expect(result.kind).toBe('help');
  });
});

// ---------------------------------------------------------------------------
// Progressive --help discovery — new_terms
// ---------------------------------------------------------------------------

describe('parseRulePreviewCommand — progressive help: new_terms', () => {
  it('step 2 — new_terms --help returns kind:help', () => {
    expect(parseRulePreviewCommand('new_terms --help').kind).toBe('help');
  });

  it('step 2 — new_terms help documents --new-terms-fields', () => {
    const result = parseRulePreviewCommand('new_terms --help');
    if (result.kind === 'help') {
      expect(result.text).toContain('--new-terms-fields');
    }
  });

  it('step 2 — new_terms help documents --history-window-start', () => {
    const result = parseRulePreviewCommand('new_terms --help');
    if (result.kind === 'help') expect(result.text).toContain('--history-window-start');
  });

  it('step 3 — full new_terms command with --help returns kind:help (help wins)', () => {
    const result = parseRulePreviewCommand(
      'new_terms --query "*:*" --new-terms-fields source.ip --history-window-start now-30d --help'
    );
    expect(result.kind).toBe('help');
  });
});

// ---------------------------------------------------------------------------
// Realistic commands — show all optional fields in action
//
// These tests double as copy-pasteable examples for developers.
// ---------------------------------------------------------------------------

describe('parseRulePreviewCommand — realistic commands', () => {
  it('esql: aggregation query with 24-hour timeframe and 30m interval', () => {
    const result = parseRulePreviewCommand(
      'esql' +
        ' --query "FROM logs-* | STATS count() BY host.name | WHERE count() > 100"' +
        ' --timeframe-start now-24h' +
        ' --timeframe-end now' +
        ' --interval 30m'
    );
    expect(result.kind).toBe('preview');
    if (result.kind === 'preview') {
      expect(result.rule.type).toBe('esql');
      expect(result.rule.query).toContain('STATS count()');
      expect(result.interval).toBe('30m');
      expect(result.timeframeStart).toBe('now-24h');
    }
  });

  it('eql: sequence rule with multiple index patterns', () => {
    const result = parseRulePreviewCommand(
      'eql' +
        ' --query "sequence by host.id [process where process.name == \\"powershell.exe\\"] [network where true]"' +
        ' --index logs-endpoint.events.process-*' +
        ' --index logs-endpoint.events.network-*' +
        ' --timeframe-start now-6h'
    );
    expect(result.kind).toBe('preview');
    if (result.kind === 'preview') {
      expect(result.rule.type).toBe('eql');
      expect(result.rule.index).toEqual([
        'logs-endpoint.events.process-*',
        'logs-endpoint.events.network-*',
      ]);
    }
  });

  it('eql: with data-view-id instead of index patterns', () => {
    const result = parseRulePreviewCommand(
      'eql --query "process where process.name == \\"cmd.exe\\"" --data-view-id my-data-view'
    );
    expect(result.kind).toBe('preview');
    if (result.kind === 'preview') {
      expect(result.rule.data_view_id).toBe('my-data-view');
      expect(result.rule.index).toBeUndefined();
    }
  });

  it('query: kuery query with multiple index patterns and 15m interval', () => {
    const result = parseRulePreviewCommand(
      'query' +
        ' --query "event.category:authentication AND event.outcome:failure"' +
        ' --language kuery' +
        ' --index logs-*' +
        ' --index auditbeat-*' +
        ' --interval 15m' +
        ' --timeframe-start now-8h'
    );
    expect(result.kind).toBe('preview');
    if (result.kind === 'preview') {
      expect(result.rule.query).toBe('event.category:authentication AND event.outcome:failure');
      expect(result.rule.language).toBe('kuery');
      expect(result.rule.index).toEqual(['logs-*', 'auditbeat-*']);
      expect(result.interval).toBe('15m');
    }
  });

  it('query: lucene language variant', () => {
    const result = parseRulePreviewCommand(
      'query --query "event.category:authentication" --language lucene'
    );
    expect(result.kind).toBe('preview');
    if (result.kind === 'preview') {
      expect(result.rule.language).toBe('lucene');
    }
  });

  it('saved_query: with query override, language, and custom timeframe', () => {
    const result = parseRulePreviewCommand(
      'saved_query' +
        ' --saved-id 3a4b5c6d-auth-failures' +
        ' --query "event.outcome:failure"' +
        ' --language kuery' +
        ' --timeframe-start now-7d' +
        ' --timeframe-end now' +
        ' --interval 1h'
    );
    expect(result.kind).toBe('preview');
    if (result.kind === 'preview') {
      expect(result.rule.saved_id).toBe('3a4b5c6d-auth-failures');
      expect(result.rule.query).toBe('event.outcome:failure');
      expect(result.rule.language).toBe('kuery');
      expect(result.timeframeStart).toBe('now-7d');
    }
  });

  it('threshold: group-by multiple fields with custom interval', () => {
    const result = parseRulePreviewCommand(
      'threshold' +
        ' --query "event.category:authentication AND event.outcome:failure"' +
        ' --threshold-value 10' +
        ' --threshold-field host.name' +
        ' --threshold-field user.name' +
        ' --language kuery' +
        ' --index logs-*' +
        ' --interval 5m' +
        ' --timeframe-start now-4h'
    );
    expect(result.kind).toBe('preview');
    if (result.kind === 'preview') {
      const threshold = result.rule.threshold as { field: string[]; value: number };
      expect(threshold.value).toBe(10);
      expect(threshold.field).toEqual(['host.name', 'user.name']);
      expect(result.rule.language).toBe('kuery');
      expect(result.rule.index).toEqual(['logs-*']);
      expect(result.interval).toBe('5m');
    }
  });

  it('threshold: no group-by (empty threshold field array)', () => {
    const result = parseRulePreviewCommand(
      'threshold --query "process.name: *" --threshold-value 100'
    );
    expect(result.kind).toBe('preview');
    if (result.kind === 'preview') {
      const threshold = result.rule.threshold as { field: string[]; value: number };
      expect(threshold.field).toEqual([]);
      expect(threshold.value).toBe(100);
    }
  });

  it('threat_match: full command with optional threat-indicator-path and multiple threat-index', () => {
    const mapping = JSON.stringify([
      { entries: [{ field: 'source.ip', type: 'mapping', value: 'threat.indicator.ip' }] },
    ]);
    const result = parseRulePreviewCommand(
      `threat_match` +
        ` --query "event.category:network"` +
        ` --threat-query "*:*"` +
        ` --threat-index logs-ti_abusech.url-*` +
        ` --threat-index logs-ti_misp.indicator-*` +
        ` --threat-mapping '${mapping}'` +
        ` --threat-indicator-path threat.indicator` +
        ` --index logs-*` +
        ` --interval 1h` +
        ` --timeframe-start now-24h`
    );
    expect(result.kind).toBe('preview');
    if (result.kind === 'preview') {
      expect(result.rule.threat_index).toEqual([
        'logs-ti_abusech.url-*',
        'logs-ti_misp.indicator-*',
      ]);
      expect(result.rule.threat_indicator_path).toBe('threat.indicator');
      expect(Array.isArray(result.rule.threat_mapping)).toBe(true);
    }
  });

  it('machine_learning: multiple job IDs with 7-day preview window', () => {
    const result = parseRulePreviewCommand(
      'machine_learning' +
        ' --job-id rare-process-linux' +
        ' --job-id suspicious-network-activity' +
        ' --job-id unusual-login-activity' +
        ' --anomaly-threshold 50' +
        ' --timeframe-start now-7d' +
        ' --interval 15m'
    );
    expect(result.kind).toBe('preview');
    if (result.kind === 'preview') {
      expect(result.rule.machine_learning_job_id).toEqual([
        'rare-process-linux',
        'suspicious-network-activity',
        'unusual-login-activity',
      ]);
      expect(result.rule.anomaly_threshold).toBe(50);
      expect(result.timeframeStart).toBe('now-7d');
    }
  });

  it('new_terms: monitor multiple fields over a 30-day baseline', () => {
    const result = parseRulePreviewCommand(
      'new_terms' +
        ' --query "event.category:network"' +
        ' --new-terms-fields source.ip' +
        ' --new-terms-fields destination.port' +
        ' --history-window-start now-30d' +
        ' --index logs-*' +
        ' --interval 1h' +
        ' --timeframe-start now-24h'
    );
    expect(result.kind).toBe('preview');
    if (result.kind === 'preview') {
      expect(result.rule.new_terms_fields).toEqual(['source.ip', 'destination.port']);
      expect(result.rule.history_window_start).toBe('now-30d');
      expect(result.rule.index).toEqual(['logs-*']);
    }
  });
});

// ---------------------------------------------------------------------------
// Unknown flags
// ---------------------------------------------------------------------------

describe('parseRulePreviewCommand — unknown flags', () => {
  it('unknown flag returns error', () => {
    const result = parseRulePreviewCommand('esql --query "x" --bogus value');
    expect(result.kind).toBe('error');
  });

  it('completely unknown flag returns error', () => {
    const result = parseRulePreviewCommand('esql --query "x" --xyz unknown-flag');
    expect(result.kind).toBe('error');
  });
});

// ---------------------------------------------------------------------------
// Snapshots — help output
//
// Locks down the exact text returned for every help path so regressions in
// option descriptions, examples, or structure are caught immediately.
// ---------------------------------------------------------------------------

describe('parseRulePreviewCommand — snapshots: help output', () => {
  it.each([
    ['global --help', '--help'],
    ['-h shorthand', '-h'],
    ['esql --help', 'esql --help'],
    ['eql --help', 'eql --help'],
    ['query --help', 'query --help'],
    ['saved_query --help', 'saved_query --help'],
    ['threshold --help', 'threshold --help'],
    ['threat_match --help', 'threat_match --help'],
    ['machine_learning --help', 'machine_learning --help'],
    ['new_terms --help', 'new_terms --help'],
  ])('%s', (_label, command) => {
    const result = parseRulePreviewCommand(command);
    expect(result).toMatchSnapshot();
  });
});

// ---------------------------------------------------------------------------
// Snapshots — error messages
//
// Locks down the exact message returned for every error path so that error
// wording stays useful and accurate as the parser evolves.
// ---------------------------------------------------------------------------

describe('parseRulePreviewCommand — snapshots: error messages', () => {
  it.each([
    ['empty command', ''],
    ['no subcommand given', '--interval 5m'],
    ['unknown subcommand', 'invalid_type'],
    ['unknown flag on known subcommand', 'esql --query "x" --bogus value'],
    ['esql missing --query', 'esql'],
    ['eql missing --query', 'eql'],
    ['saved_query missing --saved-id', 'saved_query'],
    ['threshold missing --query', 'threshold --threshold-value 5'],
    ['threshold missing --threshold-value', 'threshold --query "process.name: *"'],
    ['machine_learning missing --job-id', 'machine_learning --anomaly-threshold 50'],
    ['machine_learning missing --anomaly-threshold', 'machine_learning --job-id my-job'],
    [
      'threat_match missing --threat-mapping',
      'threat_match --query "*:*" --threat-query "*:*" --threat-index idx',
    ],
    [
      'new_terms missing --history-window-start',
      'new_terms --query "*:*" --new-terms-fields source.ip',
    ],
    [
      '--threshold-value is NaN',
      'threshold --query "process.name: *" --threshold-value not-a-number',
    ],
    [
      '--anomaly-threshold is a float',
      'machine_learning --job-id my-ml-job --anomaly-threshold 2.5',
    ],
    [
      '--anomaly-threshold is out of range (> 100)',
      'machine_learning --job-id my-ml-job --anomaly-threshold 999',
    ],
    [
      '--threat-mapping is invalid JSON',
      'threat_match --query "*:*" --threat-query "*:*" --threat-index idx --threat-mapping not-json',
    ],
    [
      '--threat-mapping is a JSON object (not an array)',
      'threat_match --query "*:*" --threat-query "*:*" --threat-index idx --threat-mapping "{}"',
    ],
  ])('%s', (_label, command) => {
    const result = parseRulePreviewCommand(command);
    expect(result).toMatchSnapshot();
  });
});
