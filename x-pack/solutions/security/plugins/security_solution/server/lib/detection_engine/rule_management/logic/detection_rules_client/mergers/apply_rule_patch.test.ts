/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AlertSuppressionDuration,
  PatchRuleRequestBody,
} from '../../../../../../../common/api/detection_engine';
import {
  getEsqlRuleSchemaMock,
  getRulesEqlSchemaMock,
  getRulesMlSchemaMock,
  getRulesNewTermsSchemaMock,
  getRulesSchemaMock,
  getRulesThresholdSchemaMock,
  getSavedQuerySchemaMock,
  getThreatMatchingSchemaMock,
} from '../../../../../../../common/api/detection_engine/model/rule_schema/mocks';
import type { PrebuiltRulesCustomizationStatus } from '../../../../../../../common/detection_engine/prebuilt_rules/prebuilt_rule_customization_status';
import { createPrebuiltRuleAssetsClient } from '../../../../prebuilt_rules/logic/rule_assets/__mocks__/prebuilt_rule_assets_client';
import { applyRulePatch } from './apply_rule_patch';

const prebuiltRuleAssetClient = createPrebuiltRuleAssetsClient();

const ruleCustomizationStatus: PrebuiltRulesCustomizationStatus = {
  isRulesCustomizationEnabled: true,
};

describe('applyRulePatch', () => {
  describe('EQL', () => {
    test('should accept EQL params when existing rule type is EQL', async () => {
      const rulePatch = {
        timestamp_field: 'event.created',
        event_category_override: 'event.not_category',
        tiebreaker_field: 'event.created',
      };
      const existingRule = getRulesEqlSchemaMock();
      const patchedRule = await applyRulePatch({
        rulePatch,
        existingRule,
        prebuiltRuleAssetClient,
        ruleCustomizationStatus,
      });
      expect(patchedRule).toEqual(
        expect.objectContaining({
          timestamp_field: 'event.created',
          event_category_override: 'event.not_category',
          tiebreaker_field: 'event.created',
        })
      );
    });
    test('should accept EQL params with suppression in snake case and convert to camel case when rule type is EQL', async () => {
      const rulePatch = {
        timestamp_field: 'event.created',
        event_category_override: 'event.not_category',
        tiebreaker_field: 'event.created',
        alert_suppression: {
          group_by: ['event.type'],
          duration: {
            value: 10,
            unit: 'm',
          } as AlertSuppressionDuration,
          missing_fields_strategy: 'suppress',
        },
      };
      const existingRule = getRulesEqlSchemaMock();
      const patchedRule = await applyRulePatch({
        rulePatch,
        existingRule,
        prebuiltRuleAssetClient,
        ruleCustomizationStatus,
      });
      expect(patchedRule).toEqual(
        expect.objectContaining({
          timestamp_field: 'event.created',
          event_category_override: 'event.not_category',
          tiebreaker_field: 'event.created',
          alert_suppression: {
            group_by: ['event.type'],
            duration: {
              value: 10,
              unit: 'm',
            },
            missing_fields_strategy: 'suppress',
          },
        })
      );
    });
    test('should reject invalid EQL params when existing rule type is EQL', async () => {
      const rulePatch = {
        timestamp_field: 1,
        event_category_override: 1,
        tiebreaker_field: 1,
      } as PatchRuleRequestBody;
      const existingRule = getRulesEqlSchemaMock();
      await expect(
        applyRulePatch({
          rulePatch,
          existingRule,
          prebuiltRuleAssetClient,
          ruleCustomizationStatus,
        })
      ).rejects.toThrowError(
        'event_category_override: Expected string, received number, tiebreaker_field: Expected string, received number, timestamp_field: Expected string, received number'
      );
    });
    test('should reject EQL params with invalid suppression group_by field', async () => {
      const rulePatch = {
        timestamp_field: 'event.created',
        event_category_override: 'event.not_category',
        tiebreaker_field: 'event.created',
        alert_suppression: {
          group_by: 'event.type',
          duration: {
            value: 10,
            unit: 'm',
          } as AlertSuppressionDuration,
          missing_fields_strategy: 'suppress',
        },
      };
      const existingRule = getRulesEqlSchemaMock();
      await expect(
        applyRulePatch({
          rulePatch,
          existingRule,
          prebuiltRuleAssetClient,
          ruleCustomizationStatus,
        })
      ).rejects.toThrowError('alert_suppression.group_by: Expected array, received string');
    });
  });

  test('should accept threat match params when existing rule type is threat match', async () => {
    const rulePatch = {
      threat_indicator_path: 'my.indicator',
      threat_query: 'test-query',
    };
    const existingRule = getThreatMatchingSchemaMock();
    const patchedRule = await applyRulePatch({
      rulePatch,
      existingRule,
      prebuiltRuleAssetClient,
      ruleCustomizationStatus,
    });
    expect(patchedRule).toEqual(
      expect.objectContaining({
        threat_indicator_path: 'my.indicator',
        threat_query: 'test-query',
      })
    );
  });

  test('should reject invalid threat match params when existing rule type is threat match', async () => {
    const rulePatch = {
      threat_indicator_path: 1,
      threat_query: 1,
    } as PatchRuleRequestBody;
    const existingRule = getThreatMatchingSchemaMock();
    await expect(
      applyRulePatch({
        rulePatch,
        existingRule,
        prebuiltRuleAssetClient,
        ruleCustomizationStatus,
      })
    ).rejects.toThrowError(
      'threat_query: Expected string, received number, threat_indicator_path: Expected string, received number'
    );
  });

  test('should accept query params when existing rule type is query', async () => {
    const rulePatch = {
      index: ['new-test-index'],
      language: 'lucene',
    } as PatchRuleRequestBody;
    const existingRule = getRulesSchemaMock();
    const patchedRule = await applyRulePatch({
      rulePatch,
      existingRule,
      prebuiltRuleAssetClient,
      ruleCustomizationStatus,
    });
    expect(patchedRule).toEqual(
      expect.objectContaining({
        index: ['new-test-index'],
        language: 'lucene',
      })
    );
  });

  test('should reject invalid query params when existing rule type is query', async () => {
    const rulePatch = {
      index: [1],
      language: 'non-language',
    } as PatchRuleRequestBody;
    const existingRule = getRulesSchemaMock();
    await expect(
      applyRulePatch({
        rulePatch,
        existingRule,
        prebuiltRuleAssetClient,
        ruleCustomizationStatus,
      })
    ).rejects.toThrowError(
      "index.0: Expected string, received number, language: Invalid enum value. Expected 'kuery' | 'lucene', received 'non-language'"
    );
  });

  test('should accept saved query params when existing rule type is saved query', async () => {
    const rulePatch = {
      index: ['new-test-index'],
      language: 'lucene',
    } as PatchRuleRequestBody;
    const existingRule = getSavedQuerySchemaMock();
    const patchedRule = await applyRulePatch({
      rulePatch,
      existingRule,
      prebuiltRuleAssetClient,
      ruleCustomizationStatus,
    });
    expect(patchedRule).toEqual(
      expect.objectContaining({
        index: ['new-test-index'],
        language: 'lucene',
      })
    );
  });

  test('should reject invalid saved query params when existing rule type is saved query', async () => {
    const rulePatch = {
      index: [1],
      language: 'non-language',
    } as PatchRuleRequestBody;
    const existingRule = getSavedQuerySchemaMock();
    await expect(
      applyRulePatch({
        rulePatch,
        existingRule,
        prebuiltRuleAssetClient,
        ruleCustomizationStatus,
      })
    ).rejects.toThrowError(
      "index.0: Expected string, received number, language: Invalid enum value. Expected 'kuery' | 'lucene', received 'non-language'"
    );
  });

  test('should accept threshold params when existing rule type is threshold', async () => {
    const rulePatch = {
      threshold: {
        field: ['host.name'],
        value: 107,
      },
    };
    const existingRule = getRulesThresholdSchemaMock();
    const patchedRule = await applyRulePatch({
      rulePatch,
      existingRule,
      prebuiltRuleAssetClient,
      ruleCustomizationStatus,
    });
    expect(patchedRule).toEqual(
      expect.objectContaining({
        threshold: {
          field: ['host.name'],
          value: 107,
        },
      })
    );
  });

  test('should reject invalid threshold params when existing rule type is threshold', async () => {
    const rulePatch = {
      threshold: {
        field: ['host.name'],
        value: 'invalid',
      },
    } as PatchRuleRequestBody;
    const existingRule = getRulesThresholdSchemaMock();
    await expect(
      applyRulePatch({
        rulePatch,
        existingRule,
        prebuiltRuleAssetClient,
        ruleCustomizationStatus,
      })
    ).rejects.toThrowError('threshold.value: Expected number, received string');
  });

  test('should accept ES|QL alerts suppression params', async () => {
    const rulePatch = {
      alert_suppression: {
        group_by: ['agent.name'],
        duration: { value: 4, unit: 'h' as const },
        missing_fields_strategy: 'doNotSuppress' as const,
      },
    };
    const existingRule = getEsqlRuleSchemaMock();
    const patchedRule = await applyRulePatch({
      rulePatch,
      existingRule,
      prebuiltRuleAssetClient,
      ruleCustomizationStatus,
    });
    expect(patchedRule).toEqual(
      expect.objectContaining({
        alert_suppression: {
          group_by: ['agent.name'],
          missing_fields_strategy: 'doNotSuppress',
          duration: { value: 4, unit: 'h' },
        },
      })
    );
  });

  test('should accept threshold alerts suppression params', async () => {
    const rulePatch = {
      alert_suppression: {
        duration: { value: 4, unit: 'h' as const },
      },
    };
    const existingRule = getRulesThresholdSchemaMock();
    const patchedRule = await applyRulePatch({
      rulePatch,
      existingRule,
      prebuiltRuleAssetClient,
      ruleCustomizationStatus,
    });
    expect(patchedRule).toEqual(
      expect.objectContaining({
        alert_suppression: {
          duration: { value: 4, unit: 'h' },
        },
      })
    );
  });

  test('should accept threat_match alerts suppression params', async () => {
    const rulePatch = {
      alert_suppression: {
        group_by: ['agent.name'],
        missing_fields_strategy: 'suppress' as const,
      },
    };
    const existingRule = getThreatMatchingSchemaMock();
    const patchedRule = await applyRulePatch({
      rulePatch,
      existingRule,
      prebuiltRuleAssetClient,
      ruleCustomizationStatus,
    });
    expect(patchedRule).toEqual(
      expect.objectContaining({
        alert_suppression: {
          group_by: ['agent.name'],
          missing_fields_strategy: 'suppress',
        },
      })
    );
  });

  test('should accept new_terms alerts suppression params', async () => {
    const rulePatch = {
      alert_suppression: {
        group_by: ['agent.name'],
        duration: { value: 4, unit: 'h' as const },
        missing_fields_strategy: 'suppress' as const,
      },
    };
    const existingRule = getRulesNewTermsSchemaMock();
    const patchedRule = await applyRulePatch({
      rulePatch,
      existingRule,
      prebuiltRuleAssetClient,
      ruleCustomizationStatus,
    });
    expect(patchedRule).toEqual(
      expect.objectContaining({
        alert_suppression: {
          group_by: ['agent.name'],
          missing_fields_strategy: 'suppress',
          duration: { value: 4, unit: 'h' },
        },
      })
    );
  });

  describe('machine learning rules', () => {
    test('should accept machine learning params when existing rule type is machine learning', async () => {
      const rulePatch = {
        anomaly_threshold: 5,
      };
      const existingRule = getRulesMlSchemaMock();
      const patchedRule = await applyRulePatch({
        rulePatch,
        existingRule,
        prebuiltRuleAssetClient,
        ruleCustomizationStatus,
      });
      expect(patchedRule).toEqual(
        expect.objectContaining({
          anomaly_threshold: 5,
        })
      );
    });

    test('should reject invalid machine learning params when existing rule type is machine learning', async () => {
      const rulePatch = {
        anomaly_threshold: 'invalid',
      } as PatchRuleRequestBody;
      const existingRule = getRulesMlSchemaMock();
      await expect(
        applyRulePatch({
          rulePatch,
          existingRule,
          prebuiltRuleAssetClient,
          ruleCustomizationStatus,
        })
      ).rejects.toThrowError('anomaly_threshold: Expected number, received string');
    });

    it('accepts suppression params', async () => {
      const rulePatch = {
        alert_suppression: {
          group_by: ['agent.name'],
          missing_fields_strategy: 'suppress' as const,
        },
      };
      const existingRule = getRulesMlSchemaMock();
      const patchedRule = await applyRulePatch({
        rulePatch,
        existingRule,
        prebuiltRuleAssetClient,
        ruleCustomizationStatus,
      });

      expect(patchedRule).toEqual(
        expect.objectContaining({
          alert_suppression: {
            group_by: ['agent.name'],
            missing_fields_strategy: 'suppress',
          },
        })
      );
    });
  });

  test('should accept new terms params when existing rule type is new terms', async () => {
    const rulePatch = {
      new_terms_fields: ['event.new_field'],
    };
    const existingRule = getRulesNewTermsSchemaMock();
    const patchedRule = await applyRulePatch({
      rulePatch,
      existingRule,
      prebuiltRuleAssetClient,
      ruleCustomizationStatus,
    });
    expect(patchedRule).toEqual(
      expect.objectContaining({
        new_terms_fields: ['event.new_field'],
      })
    );
  });

  test('should reject invalid new terms params when existing rule type is new terms', async () => {
    const rulePatch = {
      new_terms_fields: 'invalid',
    } as PatchRuleRequestBody;
    const existingRule = getRulesNewTermsSchemaMock();
    await expect(
      applyRulePatch({
        rulePatch,
        existingRule,
        prebuiltRuleAssetClient,
        ruleCustomizationStatus,
      })
    ).rejects.toThrowError('new_terms_fields: Expected array, received string');
  });

  test('should retain existing required_fields when not present in rule patch body', async () => {
    const rulePatch = {
      name: 'new name',
    } as PatchRuleRequestBody;
    const existingRule = {
      ...getRulesSchemaMock(),
      required_fields: [
        {
          name: 'event.action',
          type: 'keyword',
          ecs: true,
        },
      ],
    };
    const patchedRule = await applyRulePatch({
      rulePatch,
      existingRule,
      prebuiltRuleAssetClient,
      ruleCustomizationStatus,
    });
    expect(patchedRule).toEqual(
      expect.objectContaining({
        required_fields: [
          {
            name: 'event.action',
            type: 'keyword',
            ecs: true,
          },
        ],
      })
    );
  });
});
