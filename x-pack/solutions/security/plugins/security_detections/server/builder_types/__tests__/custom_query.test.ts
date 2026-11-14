/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Tests for the custom query builder type definition: validateFields and
 * generateQuery.  Schema tests live in common/detection_rule_fields/__tests__/
 * (moved in step B.8).  Structural definition tests (ownership, kind,
 * compilation, no manifest) are in builder_type_definitions.test.ts.
 */

import { securityDetectionQuery } from '../custom_query';
import type { CustomQueryBuilderFields } from '../../../common/detection_rule_fields';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** The example rule from rule-data-model.md "The rule object" section. */
const exampleRuleFields: CustomQueryBuilderFields = {
  severity: 'high',
  risk_score: 73,
  max_signals: 100,
  index: ['logs-*', 'winlogbeat-*'],
  query: 'process.args:/tmp/* and event.type:start',
  language: 'kuery',
  threat: [
    {
      framework: 'MITRE ATT&CK',
      tactic: {
        id: 'TA0002',
        name: 'Execution',
        reference: 'https://attack.mitre.org/tactics/TA0002/',
      },
      technique: [],
    },
  ],
  references: ['https://example.org/writeup'],
};

/** Minimal valid fields for the Custom Query type. */
const minimalFields: CustomQueryBuilderFields = {
  severity: 'high',
  risk_score: 73,
  index: ['logs-*'],
  query: 'event.type:start',
  language: 'kuery',
};

/** Factory for the QueryGenerationInput wrapper the type's generateQuery receives. */
const makeInput = (fields: CustomQueryBuilderFields) => ({
  fields,
  rule: {
    id: 'test-rule-id',
    kind: 'alert' as const,
    schedule: { every: '5m' },
    time_field: '@timestamp',
  },
});

// ---------------------------------------------------------------------------
// validateFields
// ---------------------------------------------------------------------------

describe('securityDetectionQuery.validateFields', () => {
  const fn = securityDetectionQuery.validateFields!;

  it('returns no errors for a valid non-blank query', () => {
    const errors = fn(minimalFields);
    expect(errors).toHaveLength(0);
  });

  it('returns an error when query is all whitespace (spaces)', () => {
    const errors = fn({ ...minimalFields, query: '   ' });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/blank/i);
  });

  it('returns an error when query is all whitespace (tabs and newlines)', () => {
    const errors = fn({ ...minimalFields, query: '\t\n\r ' });
    expect(errors).toHaveLength(1);
  });

  it('returns no errors for a query with leading/trailing spaces around real content', () => {
    const errors = fn({ ...minimalFields, query: '  event.type:start  ' });
    expect(errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// generateQuery — compiled-query snapshots
//
// These snapshots pin the exact text the @elastic/esql Builder produces.
// The ES|QL query text must not change when the code moves: if a snapshot
// fails, something beyond the import path changed.
//
// Ref: implementation-plan.md "Step B.9 extra orchestrator notes"
// ---------------------------------------------------------------------------

describe('securityDetectionQuery.generateQuery', () => {
  /**
   * Compiled-query snapshot: kuery, design example rule.
   *
   * Design (rule-execution-logic.md "security.detection.query") specifies:
   *   FROM logs-*, winlogbeat-*
   *   | WHERE KQL("""process.args:/tmp/* and event.type:start""")
   *   | LIMIT 100
   *
   * The Builder produces single-double-quoted strings ("...") rather than
   * triple-double-quoted strings ("""..."""). Both are semantically equivalent
   * ES|QL — this is a formatting divergence, not a semantic one.
   */
  it('compiles the design example rule to the expected ES|QL (kuery)', async () => {
    const result = await securityDetectionQuery.generateQuery(makeInput(exampleRuleFields));

    expect(result.query.base).toMatchInlineSnapshot(`
      "FROM \\"logs-*\\", \\"winlogbeat-*\\"
      | WHERE KQL(\\"process.args:/tmp/* and event.type:start\\")
      | LIMIT 100"
    `);
  });

  /**
   * Compiled-query snapshot: lucene language with allow_wildcard.
   */
  it('compiles a lucene-language rule to a QSTR query with allow_wildcard', async () => {
    const luceneFields: CustomQueryBuilderFields = {
      ...minimalFields,
      index: ['logs-*', 'winlogbeat-*'],
      query: 'process.args:/tmp/* AND event.type:start',
      language: 'lucene',
      max_signals: 100,
    };

    const result = await securityDetectionQuery.generateQuery(makeInput(luceneFields));

    expect(result.query.base).toMatchInlineSnapshot(`
      "FROM \\"logs-*\\", \\"winlogbeat-*\\"
      | WHERE QSTR(\\"process.args:/tmp/* AND event.type:start\\", {\\"allow_wildcard\\": TRUE})
      | LIMIT 100"
    `);
  });

  /**
   * Compiled-query snapshot: absent max_signals emits no LIMIT.
   */
  it('omits LIMIT when max_signals is absent', async () => {
    const noLimitFields: CustomQueryBuilderFields = {
      severity: 'low',
      risk_score: 21,
      index: ['filebeat-*'],
      query: 'event.action:login',
      language: 'kuery',
    };

    const result = await securityDetectionQuery.generateQuery(makeInput(noLimitFields));

    expect(result.query.base).toMatchInlineSnapshot(`
      "FROM \\"filebeat-*\\"
      | WHERE KQL(\\"event.action:login\\")"
    `);
    expect(result.query.base).not.toContain('LIMIT');
  });

  it('returns the whole query as `base`, with no breach condition of its own', async () => {
    const result = await securityDetectionQuery.generateQuery(makeInput(minimalFields));
    expect(result.query.base).toContain('FROM');
    expect(result.query.breach).toBeUndefined();
  });

  it('does not carry time_field or grouping overrides (execution-time rule contract)', async () => {
    const result = await securityDetectionQuery.generateQuery(makeInput(minimalFields));
    expect(result.time_field).toBeUndefined();
    expect(result.grouping).toBeUndefined();
  });

  it('uses each index in the FROM clause (quoted)', async () => {
    const multiIndexFields: CustomQueryBuilderFields = {
      ...minimalFields,
      index: ['index-a', 'index-b', 'index-c'],
    };
    const result = await securityDetectionQuery.generateQuery(makeInput(multiIndexFields));
    expect(result.query.base).toContain('FROM "index-a", "index-b", "index-c"');
  });

  it('quotes index names so a pipe character cannot inject a second pipeline command', async () => {
    const maliciousFields: CustomQueryBuilderFields = {
      ...minimalFields,
      index: ['logs-* | LIMIT 1 | WHERE true'],
    };
    const result = await securityDetectionQuery.generateQuery(makeInput(maliciousFields));
    const compiledQuery = result.query.base;
    expect(compiledQuery).toContain('"logs-* | LIMIT 1 | WHERE true"');
    const lines = compiledQuery.split('\n');
    const commandLines = lines.filter((l) => l.trim().startsWith('|'));
    expect(commandLines).toHaveLength(1);
    expect(commandLines[0]).toContain('WHERE KQL');
  });

  it('places the user query inside KQL() for kuery language', async () => {
    const result = await securityDetectionQuery.generateQuery(makeInput(minimalFields));
    expect(result.query.base).toContain('KQL(');
    expect(result.query.base).not.toContain('QSTR(');
  });

  it('places the user query inside QSTR() for lucene language', async () => {
    const luceneFields: CustomQueryBuilderFields = { ...minimalFields, language: 'lucene' };
    const result = await securityDetectionQuery.generateQuery(makeInput(luceneFields));
    expect(result.query.base).toContain('QSTR(');
    expect(result.query.base).not.toContain('KQL(');
  });

  it('includes allow_wildcard = TRUE for lucene language', async () => {
    const luceneFields: CustomQueryBuilderFields = { ...minimalFields, language: 'lucene' };
    const result = await securityDetectionQuery.generateQuery(makeInput(luceneFields));
    expect(result.query.base).toContain('allow_wildcard');
  });

  it('emits LIMIT equal to max_signals when present', async () => {
    const result = await securityDetectionQuery.generateQuery(makeInput(exampleRuleFields));
    expect(result.query.base).toContain('| LIMIT 100');
  });
});
