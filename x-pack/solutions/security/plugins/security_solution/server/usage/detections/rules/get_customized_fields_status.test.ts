/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { getCustomizedFieldsStatus } from './get_customized_fields_status';
import { getInitialCustomizedFieldsStatus } from './get_initial_usage';
import { createPrebuiltRuleAssetsClient as createPrebuiltRuleAssetsClientMock } from '../../../lib/detection_engine/prebuilt_rules/logic/rule_assets/__mocks__/prebuilt_rule_assets_client';
import { savedRuleMock } from '../../../../public/detection_engine/rule_management/logic/mock';
import type { QueryRule } from '../../../../common/api/detection_engine/model/rule_schema/rule_schemas.gen';

let mockPrebuiltRuleAssetsClient: ReturnType<typeof createPrebuiltRuleAssetsClientMock>;
jest.mock(
  '../../../lib/detection_engine/prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client',
  () => ({
    createPrebuiltRuleAssetsClient: () => mockPrebuiltRuleAssetsClient,
  })
);

describe('getCustomizedFieldsStatus', () => {
  const logger = loggingSystemMock.createLogger();
  const savedObjectsClient = savedObjectsClientMock.create();

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrebuiltRuleAssetsClient = createPrebuiltRuleAssetsClientMock();
  });

  it('returns initial status if no rule objects', async () => {
    const result = await getCustomizedFieldsStatus({
      savedObjectsClient,
      ruleResponsesForPrebuiltRules: [],
      logger,
    });
    expect(result).toEqual(getInitialCustomizedFieldsStatus());
  });

  it('logs and returns initial status if an error is thrown', async () => {
    const ruleResponsesForPrebuiltRules = [savedRuleMock];
    mockPrebuiltRuleAssetsClient.fetchAssetsByVersion.mockResolvedValueOnce([
      {
        rule_id: '5370d4cd-2bb3-4d71-abf5-1e1d0ff5a2de',
        version: '5',
      },
    ]);

    const result = await getCustomizedFieldsStatus({
      savedObjectsClient,
      ruleResponsesForPrebuiltRules,
      logger,
    });
    expect(logger.error).toHaveBeenCalled();
    expect(result).toEqual(getInitialCustomizedFieldsStatus());
  });

  it('returns empty breakdown for a non-customized rule', async () => {
    const ruleResponsesForPrebuiltRules = [savedRuleMock]; // This is the current version of the rule

    // This is the base version (also used as the target version in the diff)
    mockPrebuiltRuleAssetsClient.fetchAssetsByVersion.mockResolvedValueOnce([
      {
        name: savedRuleMock.name,
        description: savedRuleMock.description,
        rule_id: savedRuleMock.rule_id,
        rule_type: savedRuleMock.type,
        language: (savedRuleMock as QueryRule).language,
        index: (savedRuleMock as QueryRule).index,
        query: (savedRuleMock as QueryRule).query,
        filters: (savedRuleMock as QueryRule).filters,
        type: savedRuleMock.type,
        risk_score: savedRuleMock.risk_score,
        severity: savedRuleMock.severity,
        version: savedRuleMock.version,
        tags: savedRuleMock.tags,
      },
    ]);
    const result = await getCustomizedFieldsStatus({
      savedObjectsClient,
      ruleResponsesForPrebuiltRules,
      logger,
    });
    expect(result).toEqual({
      rules_with_missing_base_version: 0,
      customized_fields_breakdown: [],
    });
  });

  it('returns breakdown for a customized rule', async () => {
    const ruleResponsesForPrebuiltRules = [savedRuleMock]; // This is the current version of the rule

    // This is the base version (also used as the target version in the diff)
    // Simulate a customized rule by changing some fields in the base version
    mockPrebuiltRuleAssetsClient.fetchAssetsByVersion.mockResolvedValueOnce([
      {
        name: 'Base Rule Name', // Different name
        description: 'Base Rule Description', // Different description
        rule_id: savedRuleMock.rule_id,
        rule_type: savedRuleMock.type,
        language: (savedRuleMock as QueryRule).language,
        index: (savedRuleMock as QueryRule).index,
        query: (savedRuleMock as QueryRule).query,
        filters: (savedRuleMock as QueryRule).filters,
        type: savedRuleMock.type,
        risk_score: savedRuleMock.risk_score,
        severity: savedRuleMock.severity,
        version: savedRuleMock.version,
        tags: savedRuleMock.tags,
      },
    ]);
    const result = await getCustomizedFieldsStatus({
      savedObjectsClient,
      ruleResponsesForPrebuiltRules,
      logger,
    });
    expect(result).toEqual({
      rules_with_missing_base_version: 0,
      customized_fields_breakdown: [
        {
          count: 1,
          field: 'name',
        },
        {
          count: 1,
          field: 'description',
        },
      ],
    });
  });

  it('returns breakdown for two customized rules', async () => {
    const savedRuleMock2 = {
      ...savedRuleMock,
      rule_id: 'bbd3106e-b4b5-4d7c-a1a2-47531d6a2baf-2', // rule_id must be unique, it is used as a key
    };
    const ruleResponsesForPrebuiltRules = [savedRuleMock, savedRuleMock2]; // This is the current version of the rule

    // This is the base version (also used as the target version in the diff)
    // Simulate a customized rule by changing some fields in the base version
    mockPrebuiltRuleAssetsClient.fetchAssetsByVersion.mockResolvedValueOnce([
      {
        name: 'Base Rule Name', // Different name
        description: 'Base Rule Description', // Different description
        rule_id: savedRuleMock.rule_id,
        rule_type: savedRuleMock.type,
        language: (savedRuleMock as QueryRule).language,
        index: (savedRuleMock as QueryRule).index,
        query: (savedRuleMock as QueryRule).query,
        filters: (savedRuleMock as QueryRule).filters,
        type: savedRuleMock.type,
        risk_score: savedRuleMock.risk_score,
        severity: savedRuleMock.severity,
        version: savedRuleMock.version,
        tags: savedRuleMock.tags,
      },
      {
        name: 'Base Rule Name 2', // Different name
        description: 'Base Rule Description 2', // Different description
        rule_id: 'bbd3106e-b4b5-4d7c-a1a2-47531d6a2baf-2', // rule_id must match the second rule
        rule_type: savedRuleMock2.type,
        language: (savedRuleMock2 as QueryRule).language,
        index: (savedRuleMock2 as QueryRule).index,
        query: (savedRuleMock2 as QueryRule).query,
        filters: (savedRuleMock2 as QueryRule).filters,
        type: savedRuleMock2.type,
        risk_score: savedRuleMock2.risk_score,
        severity: savedRuleMock2.severity,
        version: savedRuleMock2.version,
        tags: [...savedRuleMock2.tags, 'new-tag'], // Adding a new tag to simulate customization
      },
    ]);
    const result = await getCustomizedFieldsStatus({
      savedObjectsClient,
      ruleResponsesForPrebuiltRules,
      logger,
    });
    expect(result).toEqual({
      rules_with_missing_base_version: 0,
      customized_fields_breakdown: [
        {
          count: 2,
          field: 'name',
        },
        {
          count: 2,
          field: 'description',
        },
        {
          count: 1,
          field: 'tags',
        },
      ],
    });
  });

  it('returns breakdown for two customized rules, one missing base version', async () => {
    const savedRuleMock2 = {
      ...savedRuleMock,
      rule_id: 'bbd3106e-b4b5-4d7c-a1a2-47531d6a2baf-2', // rule_id must be unique, it is used as a key
    };
    const ruleResponsesForPrebuiltRules = [savedRuleMock, savedRuleMock2]; // This is the current version of the rule

    // This is the base version (also used as the target version in the diff)
    // Simulate a customized rule by changing some fields in the base version
    // This time we return only one asset, simulating that the second rule, savedRuleMock2, is missing its base version
    mockPrebuiltRuleAssetsClient.fetchAssetsByVersion.mockResolvedValueOnce([
      {
        name: 'Base Rule Name', // Different name
        description: 'Base Rule Description', // Different description
        rule_id: savedRuleMock.rule_id,
        rule_type: savedRuleMock.type,
        language: (savedRuleMock as QueryRule).language,
        index: (savedRuleMock as QueryRule).index,
        query: (savedRuleMock as QueryRule).query,
        filters: (savedRuleMock as QueryRule).filters,
        type: savedRuleMock.type,
        risk_score: savedRuleMock.risk_score,
        severity: 'medium', // Different severity
        version: savedRuleMock.version,
        tags: savedRuleMock.tags,
      },
    ]);
    const result = await getCustomizedFieldsStatus({
      savedObjectsClient,
      ruleResponsesForPrebuiltRules,
      logger,
    });
    expect(result).toEqual({
      rules_with_missing_base_version: 1,
      customized_fields_breakdown: [
        {
          count: 1,
          field: 'name',
        },
        {
          count: 1,
          field: 'description',
        },
        {
          count: 1,
          field: 'severity',
        },
      ],
    });
  });

  it('returns breakdown for many rules, testing batch processing', async () => {
    const ruleResponsesForPrebuiltRules = Array.from({ length: 30 }, (_, i) => ({
      ...savedRuleMock,
      rule_id: `rule-id-${i + 1}`,
    }));

    // This is the base version (also used as the target version in the diff)
    // Simulate a customized rule by changing some fields in the base version
    // This time we return only one asset, simulating that the second rule, savedRuleMock2, is missing its base version
    mockPrebuiltRuleAssetsClient.fetchAssetsByVersion.mockResolvedValueOnce(
      Array.from({ length: 30 }, (_, i) => ({
        name: `Base Rule Name ${i + 1}`, // Different name
        description: `Base Rule Description ${i + 1}`, // Different description
        rule_id: `rule-id-${i + 1}`,
        rule_type: savedRuleMock.type,
        language: (savedRuleMock as QueryRule).language,
        index: (savedRuleMock as QueryRule).index,
        query: (savedRuleMock as QueryRule).query,
        filters: (savedRuleMock as QueryRule).filters,
        type: savedRuleMock.type,
        risk_score: 74, // Different risk score
        severity: `medium`, // Different severity
        version: savedRuleMock.version,
        tags: savedRuleMock.tags,
      }))
    );
    const result = await getCustomizedFieldsStatus({
      savedObjectsClient,
      ruleResponsesForPrebuiltRules,
      logger,
    });
    expect(result).toEqual({
      rules_with_missing_base_version: 0,
      customized_fields_breakdown: [
        {
          count: 30,
          field: 'name',
        },
        {
          count: 30,
          field: 'description',
        },
        {
          count: 30,
          field: 'severity',
        },
        {
          count: 30,
          field: 'risk_score',
        },
      ],
    });
  });
});
