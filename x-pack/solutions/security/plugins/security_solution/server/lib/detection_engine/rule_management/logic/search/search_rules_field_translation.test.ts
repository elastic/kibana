/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  REQUIRED_TRANSFORM_SO_FIELDS,
  VALID_SEARCH_FIELDS,
  translateSearchFieldsToSoFields,
} from './search_rules_field_translation';

describe('translateSearchFieldsToSoFields', () => {
  it('returns undefined for empty/undefined input', () => {
    expect(translateSearchFieldsToSoFields(undefined)).toBeUndefined();
    expect(translateSearchFieldsToSoFields([])).toBeUndefined();
  });

  it('translates snake_case API names to camelCase SO attributes', () => {
    const out = translateSearchFieldsToSoFields(['updated_at', 'created_at', 'updated_by']);
    expect(out).toEqual(expect.arrayContaining(['updatedAt', 'createdAt', 'updatedBy']));
    // The snake_case API names must NOT be passed through to the SO layer.
    expect(out).not.toEqual(expect.arrayContaining(['updated_at', 'created_at', 'updated_by']));
  });

  it('always unions in the required transform fields', () => {
    const out = translateSearchFieldsToSoFields(['name']);
    for (const f of REQUIRED_TRANSFORM_SO_FIELDS) {
      expect(out).toContain(f);
    }
    expect(out).toContain('name');
  });

  it('expands `execution_summary` to all SO attributes the summary depends on', () => {
    const out = translateSearchFieldsToSoFields(['execution_summary']);
    expect(out).toEqual(expect.arrayContaining(['monitoring', 'lastRun', 'running']));
  });

  it('dedupes overlapping expansions', () => {
    const out = translateSearchFieldsToSoFields(['updated_at', 'updated_at']);
    expect(out?.filter((f) => f === 'updatedAt')).toHaveLength(1);
  });

  it('produces no SO projection path for `id` (lives on the SO root)', () => {
    const out = translateSearchFieldsToSoFields(['id']);
    // Only the required transform fields should appear — no 'id' attribute.
    expect(out).toEqual(expect.arrayContaining([...REQUIRED_TRANSFORM_SO_FIELDS]));
    expect(out).not.toContain('id');
  });
});

describe('VALID_SEARCH_FIELDS', () => {
  it('is derived from the RuleResponse schema and contains common fields', () => {
    // Fields shared by every RuleResponse variant via SharedResponseProps.
    const commonFields = ['name', 'description', 'risk_score', 'severity', 'tags', 'enabled'];
    for (const field of commonFields) {
      expect(VALID_SEARCH_FIELDS.has(field)).toBe(true);
    }
  });

  it('contains type-specific fields from each variant', () => {
    expect(VALID_SEARCH_FIELDS.has('query')).toBe(true); // query rule
    expect(VALID_SEARCH_FIELDS.has('threshold')).toBe(true); // threshold rule
    expect(VALID_SEARCH_FIELDS.has('machine_learning_job_id')).toBe(true); // ML rule
  });

  it('does not contain Alerting Framework internal field names', () => {
    expect(VALID_SEARCH_FIELDS.has('rule_type_id')).toBe(false);
    expect(VALID_SEARCH_FIELDS.has('params')).toBe(false);
    expect(VALID_SEARCH_FIELDS.has('snooze_schedule')).toBe(false);
  });
});
