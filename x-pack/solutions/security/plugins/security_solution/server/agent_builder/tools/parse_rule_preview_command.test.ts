/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  tokenizeCommand,
  parseRulePreviewCommand,
  GLOBAL_HELP,
} from './parse_rule_preview_command';

// ---------------------------------------------------------------------------
// tokenizeCommand
// ---------------------------------------------------------------------------

describe('tokenizeCommand', () => {
  it('splits unquoted tokens on whitespace', () => {
    expect(tokenizeCommand('--type esql --query foo')).toEqual([
      '--type',
      'esql',
      '--query',
      'foo',
    ]);
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
    expect(tokenizeCommand('--type esql --query "FROM logs-* | LIMIT 10" --interval 5m')).toEqual([
      '--type',
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
    expect(tokenizeCommand('  --type  esql  ')).toEqual(['--type', 'esql']);
  });
});

// ---------------------------------------------------------------------------
// Help responses
// ---------------------------------------------------------------------------

describe('parseRulePreviewCommand — help', () => {
  it('returns kind:help with GLOBAL_HELP text when --help is passed alone', () => {
    const result = parseRulePreviewCommand('--help');
    expect(result.kind).toBe('help');
    if (result.kind === 'help') {
      expect(result.text).toContain('USAGE');
      expect(result.text).toBe(GLOBAL_HELP);
    }
  });

  it('returns kind:help with -h shorthand', () => {
    const result = parseRulePreviewCommand('-h');
    expect(result.kind).toBe('help');
  });

  it('returns type-specific help for --type esql --help', () => {
    const result = parseRulePreviewCommand('--type esql --help');
    expect(result.kind).toBe('help');
    if (result.kind === 'help') {
      expect(result.text).toContain('ES|QL');
    }
  });

  it('returns type-specific help for --help --type machine_learning', () => {
    const result = parseRulePreviewCommand('--help --type machine_learning');
    expect(result.kind).toBe('help');
    if (result.kind === 'help') {
      expect(result.text).toContain('Machine Learning');
    }
  });
});

// ---------------------------------------------------------------------------
// Error cases — type validation
// ---------------------------------------------------------------------------

describe('parseRulePreviewCommand — type errors', () => {
  it('returns kind:error when --type is not provided', () => {
    const result = parseRulePreviewCommand('--query "FROM logs-*"');
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.message).toContain('--type');
    }
  });

  it('returns kind:error for an unknown rule type', () => {
    const result = parseRulePreviewCommand('--type invalid_type');
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.message).toContain('invalid_type');
    }
  });

  it('returns kind:error for an unknown flag', () => {
    const result = parseRulePreviewCommand('--type esql --query "x" --bogus value');
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.message).toContain('--bogus');
    }
  });

  it('returns kind:error for empty command', () => {
    const result = parseRulePreviewCommand('');
    expect(result.kind).toBe('error');
  });

  it('returns kind:error with help text for --help with invalid type', () => {
    const result = parseRulePreviewCommand('--type not_a_type --help');
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.message).toContain('not_a_type');
    }
  });
});

// ---------------------------------------------------------------------------
// Valid commands — all 8 rule types
// ---------------------------------------------------------------------------

describe('parseRulePreviewCommand — valid esql rule', () => {
  it('parses minimum valid esql command', () => {
    const result = parseRulePreviewCommand('--type esql --query "FROM logs-* | LIMIT 10"');
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
      '--type eql --query "process where process.name == \\"cmd.exe\\""'
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
    const result = parseRulePreviewCommand('--type query');
    expect(result.kind).toBe('preview');
    if (result.kind === 'preview') {
      expect(result.rule.type).toBe('query');
    }
  });

  it('includes optional query when provided', () => {
    const result = parseRulePreviewCommand('--type query --query "user.name: admin"');
    expect(result.kind).toBe('preview');
    if (result.kind === 'preview') {
      expect(result.rule.query).toBe('user.name: admin');
    }
  });
});

describe('parseRulePreviewCommand — valid saved_query rule', () => {
  it('parses minimum valid saved_query command', () => {
    const result = parseRulePreviewCommand('--type saved_query --saved-id my-query-id');
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
      '--type threshold --query "process.name: *" --threshold-value 5'
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
    '--type threat_match --query "*:*" --threat-query "*:*" --threat-index threat-intel ' +
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
      '--type machine_learning --job-id my-ml-job --anomaly-threshold 75'
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
      '--type machine_learning --job-id job-a --job-id job-b --anomaly-threshold 50'
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
      '--type new_terms --query "*:*" --new-terms-fields source.ip --history-window-start now-30d'
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
    const result = parseRulePreviewCommand('--type esql');
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.message).toContain('--query');
    }
  });

  it('returns kind:error when threshold rule is missing --threshold-value', () => {
    const result = parseRulePreviewCommand('--type threshold --query "process.name: *"');
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.message).toContain('--threshold-value');
    }
  });

  it('returns kind:error when saved_query rule is missing --saved-id', () => {
    const result = parseRulePreviewCommand('--type saved_query');
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.message).toContain('--saved-id');
    }
  });

  it('returns kind:error when machine_learning rule is missing --job-id', () => {
    const result = parseRulePreviewCommand('--type machine_learning --anomaly-threshold 50');
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.message).toContain('--job-id');
    }
  });

  it('returns kind:error when threat_match rule is missing --threat-mapping', () => {
    const result = parseRulePreviewCommand(
      '--type threat_match --query "*:*" --threat-query "*:*" --threat-index idx'
    );
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.message).toContain('--threat-mapping');
    }
  });

  it('returns kind:error when new_terms rule is missing --history-window-start', () => {
    const result = parseRulePreviewCommand(
      '--type new_terms --query "*:*" --new-terms-fields source.ip'
    );
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.message).toContain('--history-window-start');
    }
  });
});

// ---------------------------------------------------------------------------
// Numeric / JSON validation errors
// ---------------------------------------------------------------------------

describe('parseRulePreviewCommand — numeric / JSON validation', () => {
  it('returns kind:error when --threshold-value is NaN', () => {
    const result = parseRulePreviewCommand(
      '--type threshold --query "process.name: *" --threshold-value not-a-number'
    );
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.message).toContain('--threshold-value');
    }
  });

  it('returns kind:error for invalid JSON in --threat-mapping', () => {
    const result = parseRulePreviewCommand(
      '--type threat_match --query "*:*" --threat-query "*:*" --threat-index idx --threat-mapping not-json'
    );
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.message).toContain('--threat-mapping');
    }
  });

  it('returns kind:error when --threat-mapping is a JSON object (not an array)', () => {
    const result = parseRulePreviewCommand(
      '--type threat_match --query "*:*" --threat-query "*:*" --threat-index idx --threat-mapping "{}"'
    );
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.message).toContain('--threat-mapping');
    }
  });
});

// ---------------------------------------------------------------------------
// Schedule defaults and overrides
// ---------------------------------------------------------------------------

describe('parseRulePreviewCommand — schedule defaults', () => {
  it('uses default interval, timeframeStart, timeframeEnd when not provided', () => {
    const result = parseRulePreviewCommand('--type query');
    expect(result.kind).toBe('preview');
    if (result.kind === 'preview') {
      expect(result.interval).toBe('1h');
      expect(result.timeframeStart).toBe('now-1h');
      expect(result.timeframeEnd).toBe('now');
    }
  });

  it('applies --interval override', () => {
    const result = parseRulePreviewCommand('--type query --interval 5m');
    expect(result.kind).toBe('preview');
    if (result.kind === 'preview') {
      expect(result.interval).toBe('5m');
    }
  });

  it('applies --timeframe-start and --timeframe-end overrides', () => {
    const result = parseRulePreviewCommand(
      '--type query --interval 5m --timeframe-start now-6h --timeframe-end now-1h'
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

  it('global help includes USAGE section', () => {
    const result = parseRulePreviewCommand('--help');
    if (result.kind === 'help') {
      expect(result.text).toContain('USAGE');
    }
  });

  it('global help includes QUICK EXAMPLES', () => {
    const result = parseRulePreviewCommand('--help');
    if (result.kind === 'help') {
      expect(result.text).toContain('QUICK EXAMPLES');
    }
  });

  it('global help explains how to get type-specific help', () => {
    const result = parseRulePreviewCommand('--help');
    if (result.kind === 'help') {
      expect(result.text).toContain('--type');
      expect(result.text).toContain('--help');
    }
  });
});

// ---------------------------------------------------------------------------
// Progressive --help discovery — esql
//
// Step 1 (global): --help
// Step 2 (type):   --type esql --help
// Step 3 (pre-run): --type esql --query "FROM logs-*" --help  →  still help, not preview
// ---------------------------------------------------------------------------

describe('parseRulePreviewCommand — progressive help: esql', () => {
  it('step 2 — --type esql --help returns kind:help', () => {
    expect(parseRulePreviewCommand('--type esql --help').kind).toBe('help');
  });

  it('step 2 — esql help mentions ES|QL', () => {
    const result = parseRulePreviewCommand('--type esql --help');
    if (result.kind === 'help') expect(result.text).toContain('ES|QL');
  });

  it('step 2 — esql help documents --query as required', () => {
    const result = parseRulePreviewCommand('--type esql --help');
    if (result.kind === 'help') {
      expect(result.text).toContain('--query');
      expect(result.text).toContain('REQUIRED');
    }
  });

  it('step 2 — esql help contains a runnable EXAMPLE command', () => {
    const result = parseRulePreviewCommand('--type esql --help');
    if (result.kind === 'help') expect(result.text).toContain('EXAMPLE');
  });

  it('step 3 — --type esql --query "..." --help returns kind:help (help wins over args)', () => {
    const result = parseRulePreviewCommand(
      '--type esql --query "FROM logs-* | LIMIT 10" --help'
    );
    expect(result.kind).toBe('help');
  });

  it('step 2 (reversed order) — -h --type esql returns esql-specific help', () => {
    const result = parseRulePreviewCommand('-h --type esql');
    expect(result.kind).toBe('help');
    if (result.kind === 'help') expect(result.text).toContain('ES|QL');
  });
});

// ---------------------------------------------------------------------------
// Progressive --help discovery — eql
// ---------------------------------------------------------------------------

describe('parseRulePreviewCommand — progressive help: eql', () => {
  it('step 2 — --type eql --help returns kind:help', () => {
    expect(parseRulePreviewCommand('--type eql --help').kind).toBe('help');
  });

  it('step 2 — eql help mentions EQL', () => {
    const result = parseRulePreviewCommand('--type eql --help');
    if (result.kind === 'help') expect(result.text).toContain('EQL');
  });

  it('step 2 — eql help documents --query as required', () => {
    const result = parseRulePreviewCommand('--type eql --help');
    if (result.kind === 'help') {
      expect(result.text).toContain('--query');
      expect(result.text).toContain('REQUIRED');
    }
  });

  it('step 2 — eql help documents optional index flags', () => {
    const result = parseRulePreviewCommand('--type eql --help');
    if (result.kind === 'help') expect(result.text).toContain('--index');
  });

  it('step 3 — --type eql --query "..." --help returns kind:help (help wins)', () => {
    const result = parseRulePreviewCommand(
      '--type eql --query "process where process.name == \\"cmd.exe\\"" --help'
    );
    expect(result.kind).toBe('help');
  });
});

// ---------------------------------------------------------------------------
// Progressive --help discovery — query
// ---------------------------------------------------------------------------

describe('parseRulePreviewCommand — progressive help: query', () => {
  it('step 2 — --type query --help returns kind:help', () => {
    expect(parseRulePreviewCommand('--type query --help').kind).toBe('help');
  });

  it('step 2 — query help mentions KQL / Lucene', () => {
    const result = parseRulePreviewCommand('--type query --help');
    if (result.kind === 'help') expect(result.text).toContain('KQL');
  });

  it('step 2 — query help notes that all fields are optional', () => {
    const result = parseRulePreviewCommand('--type query --help');
    if (result.kind === 'help') expect(result.text).toContain('OPTIONAL');
  });

  it('step 3 — --type query --query "..." --help returns kind:help (help wins)', () => {
    const result = parseRulePreviewCommand(
      '--type query --query "event.category:authentication" --help'
    );
    expect(result.kind).toBe('help');
  });
});

// ---------------------------------------------------------------------------
// Progressive --help discovery — saved_query
// ---------------------------------------------------------------------------

describe('parseRulePreviewCommand — progressive help: saved_query', () => {
  it('step 2 — --type saved_query --help returns kind:help', () => {
    expect(parseRulePreviewCommand('--type saved_query --help').kind).toBe('help');
  });

  it('step 2 — saved_query help documents --saved-id as required', () => {
    const result = parseRulePreviewCommand('--type saved_query --help');
    if (result.kind === 'help') {
      expect(result.text).toContain('--saved-id');
      expect(result.text).toContain('REQUIRED');
    }
  });

  it('step 3 — --type saved_query --saved-id "..." --help returns kind:help (help wins)', () => {
    const result = parseRulePreviewCommand('--type saved_query --saved-id my-id --help');
    expect(result.kind).toBe('help');
  });
});

// ---------------------------------------------------------------------------
// Progressive --help discovery — threshold
// ---------------------------------------------------------------------------

describe('parseRulePreviewCommand — progressive help: threshold', () => {
  it('step 2 — --type threshold --help returns kind:help', () => {
    expect(parseRulePreviewCommand('--type threshold --help').kind).toBe('help');
  });

  it('step 2 — threshold help documents --threshold-value as required', () => {
    const result = parseRulePreviewCommand('--type threshold --help');
    if (result.kind === 'help') {
      expect(result.text).toContain('--threshold-value');
      expect(result.text).toContain('REQUIRED');
    }
  });

  it('step 2 — threshold help documents optional --threshold-field', () => {
    const result = parseRulePreviewCommand('--type threshold --help');
    if (result.kind === 'help') expect(result.text).toContain('--threshold-field');
  });

  it('step 3 — --type threshold --query "..." --threshold-value 5 --help returns kind:help (help wins)', () => {
    const result = parseRulePreviewCommand(
      '--type threshold --query "process.name: *" --threshold-value 5 --help'
    );
    expect(result.kind).toBe('help');
  });
});

// ---------------------------------------------------------------------------
// Progressive --help discovery — threat_match
// ---------------------------------------------------------------------------

describe('parseRulePreviewCommand — progressive help: threat_match', () => {
  it('step 2 — --type threat_match --help returns kind:help', () => {
    expect(parseRulePreviewCommand('--type threat_match --help').kind).toBe('help');
  });

  it('step 2 — threat_match help documents --threat-mapping as required', () => {
    const result = parseRulePreviewCommand('--type threat_match --help');
    if (result.kind === 'help') {
      expect(result.text).toContain('--threat-mapping');
      expect(result.text).toContain('REQUIRED');
    }
  });

  it('step 2 — threat_match help shows the expected JSON mapping format', () => {
    const result = parseRulePreviewCommand('--type threat_match --help');
    if (result.kind === 'help') expect(result.text).toContain('entries');
  });

  it('step 3 — full threat_match command with --help returns kind:help (help wins)', () => {
    const result = parseRulePreviewCommand(
      '--type threat_match --query "*:*" --threat-query "*:*" ' +
        '--threat-index ti-* --threat-mapping \'[]\' --help'
    );
    expect(result.kind).toBe('help');
  });
});

// ---------------------------------------------------------------------------
// Progressive --help discovery — machine_learning
// ---------------------------------------------------------------------------

describe('parseRulePreviewCommand — progressive help: machine_learning', () => {
  it('step 2 — --type machine_learning --help returns kind:help', () => {
    expect(parseRulePreviewCommand('--type machine_learning --help').kind).toBe('help');
  });

  it('step 2 — machine_learning help documents --job-id as required', () => {
    const result = parseRulePreviewCommand('--type machine_learning --help');
    if (result.kind === 'help') {
      expect(result.text).toContain('--job-id');
      expect(result.text).toContain('REQUIRED');
    }
  });

  it('step 2 — machine_learning help documents --anomaly-threshold as required', () => {
    const result = parseRulePreviewCommand('--type machine_learning --help');
    if (result.kind === 'help') expect(result.text).toContain('--anomaly-threshold');
  });

  it('step 3 — --type machine_learning --job-id "..." --anomaly-threshold 50 --help returns kind:help (help wins)', () => {
    const result = parseRulePreviewCommand(
      '--type machine_learning --job-id my-job --anomaly-threshold 50 --help'
    );
    expect(result.kind).toBe('help');
  });
});

// ---------------------------------------------------------------------------
// Progressive --help discovery — new_terms
// ---------------------------------------------------------------------------

describe('parseRulePreviewCommand — progressive help: new_terms', () => {
  it('step 2 — --type new_terms --help returns kind:help', () => {
    expect(parseRulePreviewCommand('--type new_terms --help').kind).toBe('help');
  });

  it('step 2 — new_terms help documents --new-terms-fields as required', () => {
    const result = parseRulePreviewCommand('--type new_terms --help');
    if (result.kind === 'help') {
      expect(result.text).toContain('--new-terms-fields');
      expect(result.text).toContain('REQUIRED');
    }
  });

  it('step 2 — new_terms help documents --history-window-start as required', () => {
    const result = parseRulePreviewCommand('--type new_terms --help');
    if (result.kind === 'help') expect(result.text).toContain('--history-window-start');
  });

  it('step 3 — full new_terms command with --help returns kind:help (help wins)', () => {
    const result = parseRulePreviewCommand(
      '--type new_terms --query "*:*" --new-terms-fields source.ip --history-window-start now-30d --help'
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
      '--type esql' +
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
      '--type eql' +
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
      '--type eql --query "process where process.name == \\"cmd.exe\\"" --data-view-id my-data-view'
    );
    expect(result.kind).toBe('preview');
    if (result.kind === 'preview') {
      expect(result.rule.data_view_id).toBe('my-data-view');
      expect(result.rule.index).toBeUndefined();
    }
  });

  it('query: lucene query with multiple index patterns and 15m interval', () => {
    const result = parseRulePreviewCommand(
      '--type query' +
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
      '--type query --query "event.category:authentication" --language lucene'
    );
    expect(result.kind).toBe('preview');
    if (result.kind === 'preview') {
      expect(result.rule.language).toBe('lucene');
    }
  });

  it('saved_query: with query override, language, and custom timeframe', () => {
    const result = parseRulePreviewCommand(
      '--type saved_query' +
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
      '--type threshold' +
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
      '--type threshold --query "process.name: *" --threshold-value 100'
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
      `--type threat_match` +
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
      '--type machine_learning' +
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
      '--type new_terms' +
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
// "Did you mean?" typo suggestions
// ---------------------------------------------------------------------------

describe('parseRulePreviewCommand — typo suggestions', () => {
  it('suggests --query for --qury', () => {
    const result = parseRulePreviewCommand('--type esql --qury "FROM logs-*"');
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.message).toContain('--query');
    }
  });

  it('suggests --interval for --intervel', () => {
    const result = parseRulePreviewCommand('--type esql --query "FROM logs-*" --intervel 5m');
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.message).toContain('--interval');
    }
  });

  it('completely unknown flag returns error pointing to --help', () => {
    const result = parseRulePreviewCommand('--xyz unknown-flag');
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.message).toContain('--help');
    }
  });
});
