/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Step 8.2 — DetectionRuleResponse schema tests.
 *
 * Covers:
 *   - The union discriminator: `type: 'query'` vs `type: 'threshold'`
 *   - The verbatim worked-example response from the design
 *   - Defaultable fields are required in the response (not optional)
 *   - Genuinely optional fields may be absent (`note`, `license`, `schedule.lookback`)
 *   - `query` is required non-empty for the `query` type
 *   - `query` may be empty for the `threshold` type (match-all pre-filter)
 *
 * Ref: rule-domain-model.md "The public rule object"
 *      rule-domain-model.md (example response)
 */

import { detectionRuleResponseSchema } from '../detection_rule_response_schema';

// ---------------------------------------------------------------------------
// Shared base for all response fixtures
// ---------------------------------------------------------------------------

const BASE_RESPONSE = {
  id: '0d3f4c1a-7b2e-4b8f-9c6d-1e5a8f0b2c3d',
  rule_id: 'b1c2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e',
  revision: 0,
  version: 1,
  source: { type: 'internal' as const },
  name: 'Suspicious process from temp directory',
  description: 'Detects process starts from temp paths',
  tags: ['os:windows'],
  severity: 'high' as const,
  risk_score: 73,
  max_signals: 100,
  threat: [
    {
      framework: 'MITRE ATT&CK',
      tactic: {
        id: 'TA0002',
        name: 'Execution',
        reference: 'https://attack.mitre.org/tactics/TA0002/',
      },
      // technique is optional on the schema; include here to match the example
    },
  ],
  setup: '',
  references: ['https://example.org/writeup'],
  false_positives: [],
  author: [],
  related_integrations: [],
  required_fields: [],
  schedule: { interval: '5m' },
  enabled: true,
  created_at: '2026-09-11T09:14:02.331Z',
  created_by: 'u_4f',
  updated_at: '2026-09-11T09:14:02.331Z',
  updated_by: 'u_4f',
};

// ---------------------------------------------------------------------------
// Union discriminator
// ---------------------------------------------------------------------------

describe('detectionRuleResponseSchema — union discriminator on type', () => {
  it('accepts a valid query rule response (design worked example)', () => {
    const input = {
      ...BASE_RESPONSE,
      type: 'query' as const,
      index: ['logs-*', 'winlogbeat-*'],
      query: 'process.args:/tmp/* and event.type:start',
      language: 'kuery' as const,
    };
    const result = detectionRuleResponseSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe('query');
    }
  });

  it('accepts a valid threshold rule response', () => {
    const input = {
      ...BASE_RESPONSE,
      type: 'threshold' as const,
      index: ['logs-endpoint*'],
      query: 'event.category:network',
      language: 'kuery' as const,
      threshold: {
        field: ['source.ip'],
        value: 10,
      },
    };
    const result = detectionRuleResponseSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe('threshold');
    }
  });

  it('rejects an unknown type value', () => {
    const input = {
      ...BASE_RESPONSE,
      type: 'eql',
      index: ['logs-*'],
      query: 'process where process.name == "cmd.exe"',
      language: 'eql',
    };
    const result = detectionRuleResponseSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects a response with no type field', () => {
    const input = { ...BASE_RESPONSE };
    const result = detectionRuleResponseSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('routes query fields to the query variant and rejects them on threshold parse', () => {
    // A payload with type: 'threshold' but no `threshold` object fails.
    const input = {
      ...BASE_RESPONSE,
      type: 'threshold' as const,
      index: ['logs-*'],
      query: 'event.category:network',
      language: 'kuery' as const,
      // no `threshold` field
    };
    const result = detectionRuleResponseSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Defaultable fields — must be present in the response
// ---------------------------------------------------------------------------

describe('detectionRuleResponseSchema — defaultable fields are required', () => {
  const validQueryResponse = {
    ...BASE_RESPONSE,
    type: 'query' as const,
    index: ['logs-*'],
    query: 'event.type:start',
    language: 'kuery' as const,
  };

  it.each([
    'tags',
    'max_signals',
    'setup',
    'references',
    'false_positives',
    'author',
    'threat',
    'related_integrations',
    'required_fields',
  ])('rejects when %s is absent', (field) => {
    const input = { ...validQueryResponse };

    delete (input as any)[field];
    const result = detectionRuleResponseSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Genuinely optional fields — may be absent
// ---------------------------------------------------------------------------

describe('detectionRuleResponseSchema — optional fields may be absent', () => {
  const base = {
    ...BASE_RESPONSE,
    type: 'query' as const,
    index: ['logs-*'],
    query: 'event.type:start',
    language: 'kuery' as const,
    // Exclude note, license (not in BASE_RESPONSE); schedule has no lookback.
  };

  it('accepts a response with no note', () => {
    expect(detectionRuleResponseSchema.safeParse({ ...base }).success).toBe(true);
  });

  it('accepts a response with a note present', () => {
    const result = detectionRuleResponseSchema.safeParse({ ...base, note: 'Investigation guide' });
    expect(result.success).toBe(true);
  });

  it('accepts a response with no license', () => {
    expect(detectionRuleResponseSchema.safeParse({ ...base }).success).toBe(true);
  });

  it('accepts a response with a license present', () => {
    const result = detectionRuleResponseSchema.safeParse({
      ...base,
      license: 'Elastic License 2.0',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a response where schedule has no lookback', () => {
    const result = detectionRuleResponseSchema.safeParse({
      ...base,
      schedule: { interval: '5m' },
    });
    expect(result.success).toBe(true);
  });

  it('accepts a response where schedule has a lookback', () => {
    const result = detectionRuleResponseSchema.safeParse({
      ...base,
      schedule: { interval: '5m', lookback: '6m' },
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// query type: non-empty query required; threshold: empty query allowed
// ---------------------------------------------------------------------------

describe('detectionRuleResponseSchema — query field constraints', () => {
  it('rejects query type with an empty query string', () => {
    const input = {
      ...BASE_RESPONSE,
      type: 'query' as const,
      index: ['logs-*'],
      query: '',
      language: 'kuery' as const,
    };
    const result = detectionRuleResponseSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('accepts threshold type with an empty query string (match-all pre-filter)', () => {
    const input = {
      ...BASE_RESPONSE,
      type: 'threshold' as const,
      index: ['logs-*'],
      query: '',
      language: 'kuery' as const,
      threshold: { field: [], value: 5 },
    };
    const result = detectionRuleResponseSchema.safeParse(input);
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Source variants
// ---------------------------------------------------------------------------

describe('detectionRuleResponseSchema — source field variants', () => {
  const base = {
    ...BASE_RESPONSE,
    type: 'query' as const,
    index: ['logs-*'],
    query: 'event.type:start',
    language: 'kuery' as const,
  };

  it('accepts source: internal (no id)', () => {
    const result = detectionRuleResponseSchema.safeParse({
      ...base,
      source: { type: 'internal' },
    });
    expect(result.success).toBe(true);
  });

  it('accepts source: template with id', () => {
    const result = detectionRuleResponseSchema.safeParse({
      ...base,
      source: { type: 'template', id: 'tpl-abc' },
    });
    expect(result.success).toBe(true);
  });

  it('accepts source: external with id', () => {
    const result = detectionRuleResponseSchema.safeParse({
      ...base,
      source: { type: 'external', id: 'github-12345' },
    });
    expect(result.success).toBe(true);
  });

  it('accepts source: external without id', () => {
    const result = detectionRuleResponseSchema.safeParse({
      ...base,
      source: { type: 'external' },
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Threshold-specific fields
// ---------------------------------------------------------------------------

describe('detectionRuleResponseSchema — threshold fields', () => {
  const base = {
    ...BASE_RESPONSE,
    type: 'threshold' as const,
    index: ['logs-*'],
    query: 'event.category:network',
    language: 'kuery' as const,
  };

  it('accepts a threshold with optional cardinality', () => {
    const result = detectionRuleResponseSchema.safeParse({
      ...base,
      threshold: {
        field: ['source.ip'],
        value: 10,
        cardinality: [{ field: 'user.name', value: 3 }],
      },
    });
    expect(result.success).toBe(true);
  });

  it('accepts a threshold with no cardinality', () => {
    const result = detectionRuleResponseSchema.safeParse({
      ...base,
      threshold: { field: ['source.ip'], value: 10 },
    });
    expect(result.success).toBe(true);
  });

  it('rejects a threshold with cardinality array longer than 1', () => {
    const result = detectionRuleResponseSchema.safeParse({
      ...base,
      threshold: {
        field: ['source.ip'],
        value: 10,
        cardinality: [
          { field: 'user.name', value: 1 },
          { field: 'host.name', value: 2 },
        ],
      },
    });
    expect(result.success).toBe(false);
  });
});
