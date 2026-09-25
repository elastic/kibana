/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MigrationTranslationResultEnum } from '../../../../../../common/siem_migrations/model/common.gen';
import { transformToInternalUpdateRuleMigrationData } from './update_rules';

describe('transformToInternalUpdateRuleMigrationData', () => {
  const baseRule = { id: 'rule-1' };

  it('sets translation_result to full when prebuilt_rule_id is truthy', () => {
    const result = transformToInternalUpdateRuleMigrationData({
      ...baseRule,
      elastic_rule: { prebuilt_rule_id: 'some-prebuilt-uuid' },
    });
    expect(result.translation_result).toBe(MigrationTranslationResultEnum.full);
  });

  it('falls through to the query branch when prebuilt_rule_id is null (unmatch + esql)', () => {
    // This is the unmatch case: ES|QL update cleared prebuilt_rule_id to null and set a new query.
    const result = transformToInternalUpdateRuleMigrationData({
      ...baseRule,
      elastic_rule: {
        prebuilt_rule_id: null,
        query: 'FROM logs-endpoint.events.process-* | LIMIT 10',
        query_language: 'esql' as const,
      },
    });
    // The query is valid, so result should be full (not partial/untranslatable)
    expect(result.translation_result).toBe(MigrationTranslationResultEnum.full);
  });

  it('recomputes translation_result from a valid query when no prebuilt_rule_id', () => {
    const result = transformToInternalUpdateRuleMigrationData({
      ...baseRule,
      elastic_rule: {
        query: 'FROM logs-endpoint.events.process-* | LIMIT 10',
        query_language: 'esql' as const,
      },
    });
    expect(result.translation_result).toBe(MigrationTranslationResultEnum.full);
  });

  it('recomputes translation_result as partial for an invalid query', () => {
    const result = transformToInternalUpdateRuleMigrationData({
      ...baseRule,
      elastic_rule: {
        query: 'INVALID ESQL THAT WONT PARSE !!!',
        query_language: 'esql' as const,
      },
    });
    expect(result.translation_result).toBe(MigrationTranslationResultEnum.partial);
  });

  it('returns the rule unchanged when elastic_rule has no prebuilt_rule_id and no query', () => {
    const input = { ...baseRule, elastic_rule: { title: 'Some Title' } };
    const result = transformToInternalUpdateRuleMigrationData(input);
    expect(result).toEqual(input);
    expect(result).not.toHaveProperty('translation_result');
  });

  it('returns the rule unchanged when elastic_rule is absent', () => {
    const input = { ...baseRule };
    const result = transformToInternalUpdateRuleMigrationData(input);
    expect(result).toEqual(input);
    expect(result).not.toHaveProperty('translation_result');
  });
});
