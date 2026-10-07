/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MigrationTranslationResultEnum } from '../../../../../../common/siem_migrations/model/common.gen';
import type { OriginalRule } from '../../../../../../common/siem_migrations/model/rule_migration.gen';
import { getRulesSchemaMock } from '../../../../../../common/api/detection_engine/model/rule_schema/mocks';
import { ELASTIC_SEVERITY_TO_RISK_SCORE_MAP } from '../../constants';
import { transformToInternalUpdateRuleMigrationData } from './update_rules';

describe('transformToInternalUpdateRuleMigrationData', () => {
  const baseRule = { id: 'rule-1' };
  const emptyContext = { prebuiltRules: {}, storedRules: {} };

  describe('prebuilt rule match', () => {
    const target = {
      ...getRulesSchemaMock(),
      rule_id: 'prebuilt-1',
      name: 'Asset Name',
      description: 'Asset description',
      severity: 'critical' as const,
      risk_score: 99,
      related_integrations: [{ package: 'windows', version: '^1.0.0' }],
    };
    const notInstalled = { prebuiltRules: { 'prebuilt-1': { target } }, storedRules: {} };
    const matchRequest = {
      ...baseRule,
      elastic_rule: {
        prebuilt_rule_id: 'prebuilt-1',
        title: 'LLM title',
        integration_ids: ['llm'],
      },
    };

    it('should derive elastic_rule fields from the prebuilt rule, overwriting client values', async () => {
      const result = await transformToInternalUpdateRuleMigrationData(matchRequest, notInstalled);
      expect(result.elastic_rule).toEqual({
        prebuilt_rule_id: 'prebuilt-1',
        title: 'Asset Name',
        description: 'Asset description',
        severity: 'critical',
        risk_score: 99,
        integration_ids: ['windows'],
        id: undefined,
        query: null,
        query_language: null,
      });
    });

    it('should set elastic_rule.id to the installed rule id when the prebuilt rule is installed', async () => {
      const current = { ...getRulesSchemaMock(), id: 'installed-rule-so-id' };
      const result = await transformToInternalUpdateRuleMigrationData(matchRequest, {
        prebuiltRules: { 'prebuilt-1': { target, current } },
        storedRules: {},
      });
      expect(result.elastic_rule?.id).toBe('installed-rule-so-id');
    });

    it('should set translation_result to full', async () => {
      const result = await transformToInternalUpdateRuleMigrationData(matchRequest, notInstalled);
      expect(result.translation_result).toBe(MigrationTranslationResultEnum.full);
    });

    it('should throw naming the id when the prebuilt rule is not found', async () => {
      await expect(
        transformToInternalUpdateRuleMigrationData(
          { ...baseRule, elastic_rule: { prebuilt_rule_id: 'unknown-id' } },
          notInstalled
        )
      ).rejects.toThrow('Prebuilt rule "unknown-id" not found');
    });
  });

  describe('ES|QL query update', () => {
    const originalRule: OriginalRule = {
      id: 'orig-1',
      vendor: 'splunk',
      title: 'Original title',
      description: 'Original description',
      query: 'search index=main',
      query_language: 'spl',
      severity: '4', // Splunk scale → Elastic 'high' (SPLUNK_ELASTIC_ALERT_SEVERITY_MAP)
    };
    // The stored elastic_rule is not a source for any derived field.
    const storedRule = {
      original_rule: originalRule,
      elastic_rule: {
        title: 'Stored title',
        description: 'Stored description',
        severity: 'critical',
        risk_score: 99,
      },
    };
    const context = { prebuiltRules: {}, storedRules: { [baseRule.id]: storedRule } };
    const validQuery = 'FROM logs-endpoint.events.process-* | LIMIT 10';
    const esqlUpdate = { query: validQuery, query_language: 'esql' as const };

    it('should derive title, description, severity and risk_score from the original rule', async () => {
      const result = await transformToInternalUpdateRuleMigrationData(
        { ...baseRule, elastic_rule: esqlUpdate },
        context
      );
      expect(result.elastic_rule).toEqual({
        query: validQuery,
        query_language: 'esql',
        title: 'Original title',
        description: 'Original description',
        severity: 'high',
        risk_score: ELASTIC_SEVERITY_TO_RISK_SCORE_MAP.high,
      });
    });

    it('should keep the title and description sent in the update', async () => {
      const result = await transformToInternalUpdateRuleMigrationData(
        {
          ...baseRule,
          elastic_rule: { ...esqlUpdate, title: 'Edited title', description: 'Edited description' },
        },
        context
      );
      expect({
        title: result.elastic_rule?.title,
        description: result.elastic_rule?.description,
      }).toEqual({ title: 'Edited title', description: 'Edited description' });
    });

    it('should fall back to an empty description when the original rule has none', async () => {
      const result = await transformToInternalUpdateRuleMigrationData(
        { ...baseRule, elastic_rule: esqlUpdate },
        {
          prebuiltRules: {},
          storedRules: {
            [baseRule.id]: { original_rule: { ...originalRule, description: '' } },
          },
        }
      );
      expect(result.elastic_rule?.description).toBe('');
    });

    it('should keep prebuilt_rule_id: null and derive fields from the original rule on unmatch', async () => {
      const result = await transformToInternalUpdateRuleMigrationData(
        { ...baseRule, elastic_rule: { ...esqlUpdate, prebuilt_rule_id: null } },
        {
          prebuiltRules: {},
          storedRules: {
            [baseRule.id]: {
              original_rule: originalRule,
              elastic_rule: {
                prebuilt_rule_id: 'prebuilt-1',
                title: 'Prebuilt title',
                description: 'Prebuilt description',
                severity: 'critical',
                risk_score: 99,
              },
            },
          },
        }
      );
      expect(result.elastic_rule).toEqual({
        prebuilt_rule_id: null,
        query: validQuery,
        query_language: 'esql',
        title: 'Original title',
        description: 'Original description',
        severity: 'high',
        risk_score: ELASTIC_SEVERITY_TO_RISK_SCORE_MAP.high,
      });
    });

    it('should set translation_result to full for a valid query', async () => {
      const result = await transformToInternalUpdateRuleMigrationData(
        { ...baseRule, elastic_rule: esqlUpdate },
        context
      );
      expect(result.translation_result).toBe(MigrationTranslationResultEnum.full);
    });

    it('should set translation_result to partial for an invalid query', async () => {
      const result = await transformToInternalUpdateRuleMigrationData(
        { ...baseRule, elastic_rule: { ...esqlUpdate, query: 'INVALID ESQL THAT WONT PARSE !!!' } },
        context
      );
      expect(result.translation_result).toBe(MigrationTranslationResultEnum.partial);
    });
  });

  it('should return the rule unchanged when elastic_rule has no prebuilt_rule_id and no query', async () => {
    const input = { ...baseRule, elastic_rule: { title: 'Some Title' } };
    const result = await transformToInternalUpdateRuleMigrationData(input, emptyContext);
    expect(result).toEqual(input);
    expect(result).not.toHaveProperty('translation_result');
  });

  it('should return the rule unchanged when elastic_rule is absent', async () => {
    const input = { ...baseRule };
    const result = await transformToInternalUpdateRuleMigrationData(input, emptyContext);
    expect(result).toEqual(input);
    expect(result).not.toHaveProperty('translation_result');
  });
});
