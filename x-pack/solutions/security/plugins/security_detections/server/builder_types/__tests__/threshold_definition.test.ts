/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Tests for the threshold builder type definition: validateFields and
 * generateQuery.  Schema tests live in common/detection_rule_fields/__tests__/
 * (moved in step B.8).  Structural definition tests (ownership, kind,
 * compilation, no manifest) are in builder_type_definitions.test.ts.
 */

import { securityDetectionThreshold, validateThresholdFields } from '../threshold_definition';
import { generateThresholdQuery } from '../threshold_generate_query';
import type { ThresholdBuilderFields } from '../../../common/detection_rule_fields';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const DESIGN_EXAMPLE_FIELDS: ThresholdBuilderFields = {
  severity: 'high',
  risk_score: 73,
  index: ['auditbeat-*'],
  query: 'event.category:authentication and event.outcome:failure',
  language: 'kuery',
  threshold: {
    field: ['user.name', 'source.ip'],
    value: 10,
    cardinality: [{ field: 'destination.ip', value: 3 }],
  },
  max_signals: 100,
};

const makeInput = (fields: ThresholdBuilderFields) => ({
  fields,
  rule: {
    id: 'rule-id-fixture',
    kind: 'alert' as const,
    schedule: { every: '5m' },
    time_field: '@timestamp',
  },
});

// ---------------------------------------------------------------------------
// validateFields
// ---------------------------------------------------------------------------

describe('validateThresholdFields', () => {
  it('returns an empty array when no cardinality is present', () => {
    const fields: ThresholdBuilderFields = {
      severity: 'medium',
      risk_score: 50,
      index: ['logs-*'],
      query: 'error',
      language: 'kuery',
      threshold: { field: ['user.name', 'source.ip'], value: 5 },
    };
    expect(validateThresholdFields(fields)).toEqual([]);
  });

  it('returns an empty array when cardinality.field is not in threshold.field', () => {
    const fields: ThresholdBuilderFields = {
      severity: 'medium',
      risk_score: 50,
      index: ['logs-*'],
      query: 'error',
      language: 'kuery',
      threshold: {
        field: ['user.name'],
        value: 5,
        cardinality: [{ field: 'destination.ip', value: 3 }],
      },
    };
    expect(validateThresholdFields(fields)).toEqual([]);
  });

  it('returns an error when cardinality.field is also in threshold.field', () => {
    const fields: ThresholdBuilderFields = {
      severity: 'medium',
      risk_score: 50,
      index: ['logs-*'],
      query: 'error',
      language: 'kuery',
      threshold: {
        field: ['user.name', 'source.ip'],
        value: 5,
        cardinality: [{ field: 'user.name', value: 3 }],
      },
    };
    const errors = validateThresholdFields(fields);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/cardinality\.field.*user\.name.*threshold\.field/i);
  });

  it('returns an empty array when threshold.field is empty and cardinality is present', () => {
    const fields: ThresholdBuilderFields = {
      severity: 'medium',
      risk_score: 50,
      index: ['logs-*'],
      query: 'error',
      language: 'kuery',
      threshold: {
        field: [],
        value: 5,
        cardinality: [{ field: 'source.ip', value: 3 }],
      },
    };
    expect(validateThresholdFields(fields)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// generateQuery — compiled-query snapshots
//
// These snapshots pin the exact ES|QL text the @elastic/esql Builder produces.
// The ES|QL query text must not change when the code moves: if a snapshot
// fails, something beyond the import path changed.
//
// Ref: implementation-plan.md "Step B.9 extra orchestrator notes"
// ---------------------------------------------------------------------------

describe('generateThresholdQuery — compiled query snapshots', () => {
  it("matches the design's worked example", () => {
    const result = generateThresholdQuery(makeInput(DESIGN_EXAMPLE_FIELDS));

    expect(result.query.base).toMatchInlineSnapshot(`
      "FROM \\"auditbeat-*\\"
      | WHERE KQL(\\"event.category:authentication and event.outcome:failure\\")
      | WHERE \`user.name\` IS NOT NULL AND \`source.ip\` IS NOT NULL
      | STATS threshold_count = COUNT(*), cardinality_count = COUNT_DISTINCT(\`destination.ip\`) BY \`user.name\`, \`source.ip\`
      | WHERE threshold_count >= 10 AND cardinality_count >= 3
      | LIMIT 100"
    `);
  });

  it('does not carry grouping or time_field overrides (execution-time constraint)', () => {
    const result = generateThresholdQuery(makeInput(DESIGN_EXAMPLE_FIELDS));
    expect(result.grouping).toBeUndefined();
    expect(result.time_field).toBeUndefined();
  });

  it('emits no WHERE filter when query is empty', () => {
    const fields: ThresholdBuilderFields = {
      ...DESIGN_EXAMPLE_FIELDS,
      query: '',
      threshold: { field: ['host.name'], value: 5, cardinality: undefined },
      max_signals: 200,
    };
    const result = generateThresholdQuery(makeInput(fields));
    expect(result.query.base).toMatchInlineSnapshot(`
      "FROM \\"auditbeat-*\\"
      | WHERE \`host.name\` IS NOT NULL
      | STATS threshold_count = COUNT(*) BY \`host.name\`
      | WHERE threshold_count >= 5
      | LIMIT 200"
    `);
  });

  it('emits no COUNT_DISTINCT or cardinality WHERE clause when cardinality is absent', () => {
    const fields: ThresholdBuilderFields = {
      severity: 'medium',
      risk_score: 50,
      index: ['logs-*'],
      query: 'error',
      language: 'kuery',
      threshold: { field: ['user.name'], value: 3 },
      max_signals: 100,
    };
    const result = generateThresholdQuery(makeInput(fields));
    expect(result.query.base).toMatchInlineSnapshot(`
      "FROM \\"logs-*\\"
      | WHERE KQL(\\"error\\")
      | WHERE \`user.name\` IS NOT NULL
      | STATS threshold_count = COUNT(*) BY \`user.name\`
      | WHERE threshold_count >= 3
      | LIMIT 100"
    `);
  });

  it('emits no IS NOT NULL guards and no BY clause when threshold.field is empty', () => {
    const fields: ThresholdBuilderFields = {
      severity: 'low',
      risk_score: 21,
      index: ['logs-*'],
      query: 'error',
      language: 'kuery',
      threshold: { field: [], value: 5 },
      max_signals: 100,
    };
    const result = generateThresholdQuery(makeInput(fields));
    expect(result.query.base).toMatchInlineSnapshot(`
      "FROM \\"logs-*\\"
      | WHERE KQL(\\"error\\")
      | STATS threshold_count = COUNT(*)
      | WHERE threshold_count >= 5
      | LIMIT 100"
    `);
  });

  it('emits COUNT_DISTINCT but no BY clause when field is empty and cardinality is present', () => {
    const fields: ThresholdBuilderFields = {
      severity: 'low',
      risk_score: 21,
      index: ['logs-*'],
      query: 'error',
      language: 'kuery',
      threshold: { field: [], value: 5, cardinality: [{ field: 'source.ip', value: 3 }] },
      max_signals: 100,
    };
    const result = generateThresholdQuery(makeInput(fields));
    expect(result.query.base).toMatchInlineSnapshot(`
      "FROM \\"logs-*\\"
      | WHERE KQL(\\"error\\")
      | STATS threshold_count = COUNT(*), cardinality_count = COUNT_DISTINCT(\`source.ip\`)
      | WHERE threshold_count >= 5 AND cardinality_count >= 3
      | LIMIT 100"
    `);
  });

  it('emits no LIMIT when max_signals is absent', () => {
    const fields: ThresholdBuilderFields = {
      severity: 'medium',
      risk_score: 50,
      index: ['logs-*'],
      query: 'error',
      language: 'kuery',
      threshold: { field: ['user.name'], value: 3 },
    };
    const result = generateThresholdQuery(makeInput(fields));
    expect(result.query.base).toMatchInlineSnapshot(`
      "FROM \\"logs-*\\"
      | WHERE KQL(\\"error\\")
      | WHERE \`user.name\` IS NOT NULL
      | STATS threshold_count = COUNT(*) BY \`user.name\`
      | WHERE threshold_count >= 3"
    `);
  });

  it('uses QSTR(allow_wildcard: true) when language is lucene', () => {
    const fields: ThresholdBuilderFields = {
      severity: 'medium',
      risk_score: 50,
      index: ['logs-*'],
      query: 'error message:*timeout*',
      language: 'lucene',
      threshold: { field: ['host.name'], value: 5 },
      max_signals: 100,
    };
    const result = generateThresholdQuery(makeInput(fields));
    expect(result.query.base).toMatchInlineSnapshot(`
      "FROM \\"logs-*\\"
      | WHERE QSTR(\\"error message:*timeout*\\", {\\"allow_wildcard\\": TRUE})
      | WHERE \`host.name\` IS NOT NULL
      | STATS threshold_count = COUNT(*) BY \`host.name\`
      | WHERE threshold_count >= 5
      | LIMIT 100"
    `);
  });

  it('joins multiple index patterns in the FROM clause', () => {
    const fields: ThresholdBuilderFields = {
      severity: 'medium',
      risk_score: 50,
      index: ['logs-*', 'auditbeat-*'],
      query: 'error',
      language: 'kuery',
      threshold: { field: ['user.name'], value: 5 },
      max_signals: 100,
    };
    const result = generateThresholdQuery(makeInput(fields));
    expect(result.query.base.startsWith('FROM "logs-*", "auditbeat-*"')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// securityDetectionThreshold definition properties (generateQuery present)
// ---------------------------------------------------------------------------

describe('securityDetectionThreshold — function hooks', () => {
  it('has generateQuery set', () => {
    expect(typeof securityDetectionThreshold.generateQuery).toBe('function');
  });

  it('has validateFields set', () => {
    expect(typeof securityDetectionThreshold.validateFields).toBe('function');
  });

  it('has enrichRuleEvent set', () => {
    expect(typeof securityDetectionThreshold.enrichRuleEvent).toBe('function');
  });
});
