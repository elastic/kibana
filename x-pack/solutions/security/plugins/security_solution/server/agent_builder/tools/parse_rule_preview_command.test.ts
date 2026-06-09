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
