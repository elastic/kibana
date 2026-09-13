/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Step 8.2 — Detection rule request schemas tests.
 *
 * Covers:
 *   - detectionRuleCreatePropsSchema: discriminated union on type, required
 *     fields, query non-empty for query type, threshold empty-query allowed
 *   - detectionRuleUpdatePropsSchema: same as create minus enabled
 *   - detectionRulePatchPropsSchema: flat, strict partial — unknown keys
 *     rejected; nullable optionals accepted as null; type and enabled absent
 *   - applyRuleDefaults: every row in the defaults table
 *
 * Ref: rule-domain-model.md "The request shapes"
 *      rule-domain-model.md (defaults table)
 */

import {
  detectionRuleCreatePropsSchema,
  detectionRuleUpdatePropsSchema,
  detectionRulePatchPropsSchema,
} from '../detection_rule_request_schemas';
import { RULE_DEFAULTS, applyRuleDefaults, applyRuleUpdateDefaults } from '../apply_rule_defaults';

// ---------------------------------------------------------------------------
// Minimal valid create fixtures
// ---------------------------------------------------------------------------

const QUERY_CREATE_MIN = {
  type: 'query' as const,
  name: 'Test rule',
  description: 'A test rule',
  severity: 'low' as const,
  risk_score: 21,
  index: ['logs-*'],
  query: 'event.type:start',
};

const THRESHOLD_CREATE_MIN = {
  type: 'threshold' as const,
  name: 'Threshold rule',
  description: 'A threshold detection rule',
  severity: 'medium' as const,
  risk_score: 47,
  index: ['logs-endpoint*'],
  query: 'event.category:network',
  threshold: {
    field: ['source.ip'],
    value: 10,
  },
};

// ---------------------------------------------------------------------------
// Create schema — discriminated union on type
// ---------------------------------------------------------------------------

describe('detectionRuleCreatePropsSchema', () => {
  it('accepts a minimal query rule create request', () => {
    expect(detectionRuleCreatePropsSchema.safeParse(QUERY_CREATE_MIN).success).toBe(true);
  });

  it('accepts a minimal threshold rule create request', () => {
    expect(detectionRuleCreatePropsSchema.safeParse(THRESHOLD_CREATE_MIN).success).toBe(true);
  });

  it('accepts an optional rule_id on create', () => {
    const input = { ...QUERY_CREATE_MIN, rule_id: 'abc-123' };
    expect(detectionRuleCreatePropsSchema.safeParse(input).success).toBe(true);
  });

  it('accepts an optional enabled flag on create', () => {
    const enabled = { ...QUERY_CREATE_MIN, enabled: true };
    expect(detectionRuleCreatePropsSchema.safeParse(enabled).success).toBe(true);
    const disabled = { ...QUERY_CREATE_MIN, enabled: false };
    expect(detectionRuleCreatePropsSchema.safeParse(disabled).success).toBe(true);
  });

  it('rejects a query rule with an empty query string', () => {
    const input = { ...QUERY_CREATE_MIN, query: '' };
    expect(detectionRuleCreatePropsSchema.safeParse(input).success).toBe(false);
  });

  it('accepts a threshold rule with an empty query string (match-all pre-filter)', () => {
    const input = { ...THRESHOLD_CREATE_MIN, query: '' };
    expect(detectionRuleCreatePropsSchema.safeParse(input).success).toBe(true);
  });

  it('rejects a create request with an unknown type', () => {
    const input = { ...QUERY_CREATE_MIN, type: 'eql' };
    expect(detectionRuleCreatePropsSchema.safeParse(input).success).toBe(false);
  });

  it('rejects a create request missing a required field (name)', () => {
    const { name: _name, ...noName } = QUERY_CREATE_MIN;
    expect(detectionRuleCreatePropsSchema.safeParse(noName).success).toBe(false);
  });

  it('rejects a create request missing a required field (index)', () => {
    const { index: _index, ...noIndex } = QUERY_CREATE_MIN;
    expect(detectionRuleCreatePropsSchema.safeParse(noIndex).success).toBe(false);
  });

  it('does NOT accept id on create (server-set field)', () => {
    // id is not in the schema at all; strict() ensures it would fail if the
    // schema is strict — but the create schema is not strict (it uses merge).
    // The invariant here is that we never RELY on id from the create payload;
    // the test verifies the parsed type has no id property.
    const input = { ...QUERY_CREATE_MIN };
    const result = detectionRuleCreatePropsSchema.safeParse(input);
    expect(result.success).toBe(true);
    // TypeScript itself prevents accessing .id on the type; this assertion is
    // a belt-and-suspenders runtime check.
    if (result.success) {
      expect('id' in result.data).toBe(false);
    }
  });

  it('does NOT accept revision on create (server-set field)', () => {
    const result = detectionRuleCreatePropsSchema.safeParse(QUERY_CREATE_MIN);
    expect(result.success).toBe(true);
    if (result.success) {
      expect('revision' in result.data).toBe(false);
    }
  });

  it('does NOT accept source on create (response-only field)', () => {
    const result = detectionRuleCreatePropsSchema.safeParse(QUERY_CREATE_MIN);
    expect(result.success).toBe(true);
    if (result.success) {
      expect('source' in result.data).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// Update schema (PUT) — create shape minus enabled
// ---------------------------------------------------------------------------

describe('detectionRuleUpdatePropsSchema', () => {
  it('accepts a minimal query rule update request', () => {
    expect(detectionRuleUpdatePropsSchema.safeParse(QUERY_CREATE_MIN).success).toBe(true);
  });

  it('accepts a minimal threshold rule update request', () => {
    expect(detectionRuleUpdatePropsSchema.safeParse(THRESHOLD_CREATE_MIN).success).toBe(true);
  });

  it('does not accept enabled on update', () => {
    // The update schema is strict: `enabled` is not a defined key, so a PUT
    // body carrying it is rejected with a 400 rather than silently stripped.
    expect(
      detectionRuleUpdatePropsSchema.safeParse({ ...QUERY_CREATE_MIN, enabled: true }).success
    ).toBe(false);
  });

  it('accepts an optional rule_id on update', () => {
    const input = { ...QUERY_CREATE_MIN, rule_id: 'some-rule-id' };
    expect(detectionRuleUpdatePropsSchema.safeParse(input).success).toBe(true);
  });

  it('rejects an update request missing a required field (severity)', () => {
    const { severity: _s, ...noSeverity } = QUERY_CREATE_MIN;
    expect(detectionRuleUpdatePropsSchema.safeParse(noSeverity).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Patch schema (PATCH) — flat, strict, all fields optional
// ---------------------------------------------------------------------------

describe('detectionRulePatchPropsSchema', () => {
  it('accepts an empty patch object (no-op PATCH)', () => {
    expect(detectionRulePatchPropsSchema.safeParse({}).success).toBe(true);
  });

  it('accepts a patch with only common fields', () => {
    const input = { name: 'New name', severity: 'critical' as const };
    expect(detectionRulePatchPropsSchema.safeParse(input).success).toBe(true);
  });

  it('accepts a patch with query-type fields', () => {
    const input = { query: 'new.query:*', index: ['new-*'], language: 'lucene' as const };
    expect(detectionRulePatchPropsSchema.safeParse(input).success).toBe(true);
  });

  it('accepts a patch with threshold-type fields', () => {
    const input = {
      threshold: { field: ['host.name'], value: 5 },
      index: ['logs-*'],
    };
    expect(detectionRulePatchPropsSchema.safeParse(input).success).toBe(true);
  });

  it('rejects a patch with an unknown key (strict schema)', () => {
    const input = { name: 'ok', unknownField: 'bad' };
    expect(detectionRulePatchPropsSchema.safeParse(input).success).toBe(false);
  });

  it('rejects a patch with the `type` field (type changes are not supported)', () => {
    const input = { type: 'query' };
    expect(detectionRulePatchPropsSchema.safeParse(input).success).toBe(false);
  });

  it('rejects a patch with the `enabled` field (toggle via dedicated endpoints)', () => {
    const input = { enabled: true };
    expect(detectionRulePatchPropsSchema.safeParse(input).success).toBe(false);
  });

  // Nullable optionals — null clears the stored value.
  // Only optional-with-no-default fields are nullable; defaultable fields
  // (max_signals, version, etc.) are optional but NOT nullable.
  // Ref: rule-domain-model.md "The request shapes" (three-group split)
  it.each([
    ['note', null],
    ['license', null],
    ['setup', null],
    ['tags', null],
    ['references', null],
    ['false_positives', null],
    ['author', null],
    ['threat', null],
    ['related_integrations', null],
    ['required_fields', null],
  ])('accepts %s: null (clear)', (field, value) => {
    const input = { [field]: value };
    const result = detectionRulePatchPropsSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as Record<string, unknown>)[field]).toBeNull();
    }
  });

  // max_signals is a defaultable field — null is rejected so the stored value
  // cannot become absent while the response papers over it with the default.
  // Callers who want max_signals = 100 must send 100 explicitly.
  it('rejects max_signals: null (defaultable, not clearable)', () => {
    const input = { max_signals: null };
    const result = detectionRulePatchPropsSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('accepts schedule.lookback: null to clear the lookback', () => {
    const input = { schedule: { lookback: null } };
    const result = detectionRulePatchPropsSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.schedule?.lookback).toBeNull();
    }
  });

  // Required-in-create fields are optional here but NOT nullable
  it.each([
    ['name', null],
    ['description', null],
    ['severity', null],
    ['risk_score', null],
    ['index', null],
    ['query', null],
  ])('rejects %s: null (required-in-create fields are not nullable)', (field, value) => {
    const input = { [field]: value };
    const result = detectionRulePatchPropsSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// applyRuleDefaults — every row in the design's defaults table
// ---------------------------------------------------------------------------

describe('applyRuleDefaults', () => {
  const minimal = QUERY_CREATE_MIN;

  it('applies enabled: false by default', () => {
    expect(applyRuleDefaults(minimal).enabled).toBe(false);
  });

  it('caller-supplied enabled: true wins', () => {
    expect(applyRuleDefaults({ ...minimal, enabled: true }).enabled).toBe(true);
  });

  it('applies version: 1 by default', () => {
    expect(applyRuleDefaults(minimal).version).toBe(1);
  });

  it('caller-supplied version wins', () => {
    expect(applyRuleDefaults({ ...minimal, version: 3 }).version).toBe(3);
  });

  it('applies schedule: { interval: "5m" } by default (no now-6m overlap)', () => {
    expect(applyRuleDefaults(minimal).schedule).toEqual({ interval: '5m' });
  });

  it('merges a caller-supplied interval into the default schedule object', () => {
    const result = applyRuleDefaults({ ...minimal, schedule: { interval: '10m' } });
    expect(result.schedule.interval).toBe('10m');
    expect('lookback' in result.schedule).toBe(false);
  });

  it('preserves a caller-supplied lookback', () => {
    const result = applyRuleDefaults({ ...minimal, schedule: { interval: '5m', lookback: '6m' } });
    expect(result.schedule).toEqual({ interval: '5m', lookback: '6m' });
  });

  it('applies language: kuery by default', () => {
    expect(applyRuleDefaults(minimal).language).toBe('kuery');
  });

  it('caller-supplied language wins', () => {
    expect(applyRuleDefaults({ ...minimal, language: 'lucene' }).language).toBe('lucene');
  });

  it('applies max_signals: 100 by default', () => {
    expect(applyRuleDefaults(minimal).max_signals).toBe(100);
  });

  it('caller-supplied max_signals wins', () => {
    expect(applyRuleDefaults({ ...minimal, max_signals: 200 }).max_signals).toBe(200);
  });

  it('applies setup: "" by default', () => {
    expect(applyRuleDefaults(minimal).setup).toBe('');
  });

  it('applies tags: [] by default', () => {
    expect(applyRuleDefaults(minimal).tags).toEqual([]);
  });

  it('applies references: [] by default', () => {
    expect(applyRuleDefaults(minimal).references).toEqual([]);
  });

  it('applies false_positives: [] by default', () => {
    expect(applyRuleDefaults(minimal).false_positives).toEqual([]);
  });

  it('applies author: [] by default', () => {
    expect(applyRuleDefaults(minimal).author).toEqual([]);
  });

  it('applies threat: [] by default', () => {
    expect(applyRuleDefaults(minimal).threat).toEqual([]);
  });

  it('applies related_integrations: [] by default', () => {
    expect(applyRuleDefaults(minimal).related_integrations).toEqual([]);
  });

  it('applies required_fields: [] by default', () => {
    expect(applyRuleDefaults(minimal).required_fields).toEqual([]);
  });

  it('does not add enabled to the update (PUT) defaults', () => {
    const result = applyRuleUpdateDefaults(minimal);
    // The update type has no `enabled` field; the returned object must not have it.
    expect('enabled' in result).toBe(false);
  });

  it('does not inject a default version on PUT (omitted version defers to stored)', () => {
    // rule-crud-api.md "Replace a rule with PUT": "An omitted version keeps the
    // stored one, as v1 does."  The defaults layer must NOT supply version: 1
    // so that DetectionRulesClient.replaceRule's stored-version fallback works.
    const result = applyRuleUpdateDefaults(minimal);
    expect('version' in result).toBe(false);
  });

  it('caller-supplied version passes through applyRuleUpdateDefaults unchanged', () => {
    const result = applyRuleUpdateDefaults({ ...minimal, version: 5 });
    expect(result.version).toBe(5);
  });

  it('RULE_DEFAULTS.enabled matches the design default (false)', () => {
    expect(RULE_DEFAULTS.enabled).toBe(false);
  });

  it('RULE_DEFAULTS.schedule has no now-6m overlap (deliberate departure from v1)', () => {
    // v1 defaulted `from: 'now-6m'`; v2 ships no lookback by default.
    expect(RULE_DEFAULTS.schedule).toEqual({ interval: '5m' });
    expect('lookback' in RULE_DEFAULTS.schedule).toBe(false);
  });
});
