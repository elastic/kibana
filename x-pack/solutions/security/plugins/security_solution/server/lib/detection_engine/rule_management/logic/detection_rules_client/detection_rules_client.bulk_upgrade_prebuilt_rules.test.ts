/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { userProfileServiceMock } from '@kbn/core-user-profile-server-mocks';
import { rulesClientMock } from '@kbn/alerting-plugin/server/mocks';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { licenseMock } from '@kbn/licensing-plugin/common/licensing.mock';
import { SecurityRuleChangeTrackingAction } from '../../../../../../common/detection_engine/rule_management/rule_change_tracking';
import {
  getCreateEqlRuleSchemaMock,
  getCreateRulesSchemaMock,
  getRulesEqlSchemaMock,
  getRulesSchemaMock,
} from '../../../../../../common/api/detection_engine/model/rule_schema/mocks';
import type { PrebuiltRuleAsset } from '../../../prebuilt_rules';
import { PREBUILT_RULES_UPGRADE_BATCH_SIZE } from '../../../prebuilt_rules/constants';
import { buildMlAuthz } from '../../../../machine_learning/authz';
import { throwAuthzError } from '../../../../machine_learning/validation';
import { createProductFeaturesServiceMock } from '../../../../product_features_service/mocks';
import { getMockRulesAuthz } from '../../__mocks__/authz';
import { createDetectionRulesClient } from './detection_rules_client';
import type { IDetectionRulesClient } from './detection_rules_client_interface';
import { getRuleByRuleId } from './methods/get_rule_by_rule_id';
import { upgradePrebuiltRule } from './methods/upgrade_prebuilt_rule';
import { bulkUpdateRules } from './methods/bulk_update_rules';
import { applyRuleUpdate } from './mergers/apply_rule_update';

jest.mock('../../../../machine_learning/authz');
jest.mock('../../../../machine_learning/validation');
jest.mock('./methods/get_rule_by_rule_id');
jest.mock('./methods/upgrade_prebuilt_rule');
jest.mock('./methods/bulk_update_rules');
jest.mock('./mergers/apply_rule_update');

const queryAsset = (ruleId: string, version = 2): PrebuiltRuleAsset => ({
  ...getCreateRulesSchemaMock(ruleId),
  version,
});

const eqlAsset = (ruleId: string, version = 2): PrebuiltRuleAsset => ({
  ...getCreateEqlRuleSchemaMock(ruleId),
  version,
});

describe('DetectionRulesClient.bulkUpgradePrebuiltRules', () => {
  let rulesClient: ReturnType<typeof rulesClientMock.create>;
  let detectionRulesClient: IDetectionRulesClient;

  const mlAuthz = (buildMlAuthz as jest.Mock)();
  const rulesAuthz = getMockRulesAuthz();
  const actionsClient = {
    isSystemAction: jest.fn((id: string) => id === 'system-connector-.cases'),
  } as unknown as jest.Mocked<ActionsClient>;
  const changeTracking = { metadata: { bulkCount: 1 } };

  beforeEach(() => {
    jest.clearAllMocks();
    rulesClient = rulesClientMock.create();
    detectionRulesClient = createDetectionRulesClient({
      actionsClient,
      rulesClient,
      userProfile: userProfileServiceMock.createStart(),
      mlAuthz,
      rulesAuthz,
      savedObjectsClient: savedObjectsClientMock.create(),
      license: licenseMock.createLicenseMock(),
      productFeaturesService: createProductFeaturesServiceMock(),
    });

    (applyRuleUpdate as jest.Mock).mockImplementation(async ({ existingRule, ruleUpdate }) => ({
      ...existingRule,
      name: ruleUpdate.name,
      version: ruleUpdate.version,
    }));
    (upgradePrebuiltRule as jest.Mock).mockImplementation(async ({ ruleAsset }) => ({
      ...getRulesEqlSchemaMock(),
      id: `upgraded-${ruleAsset.rule_id}`,
      rule_id: ruleAsset.rule_id,
      version: ruleAsset.version,
    }));
    (bulkUpdateRules as jest.Mock).mockImplementation(async ({ args: { rules } }) => ({
      successfulIds: rules.map((rule: { id: string }) => rule.id),
      errors: [],
      total: rules.length,
    }));
  });

  it('returns empty results for empty input', async () => {
    const result = await detectionRulesClient.bulkUpgradePrebuiltRules({
      rules: [],
      changeTracking,
    });

    expect(result).toEqual({ results: [], errors: [] });
    expect(getRuleByRuleId).not.toHaveBeenCalled();
    expect(bulkUpdateRules).not.toHaveBeenCalled();
    expect(upgradePrebuiltRule).not.toHaveBeenCalled();
  });

  it('same-type: writes via bulkUpdateRules, not delete+create', async () => {
    const existing = { ...getRulesSchemaMock(), id: 'so-1', rule_id: 'same-type' };
    (getRuleByRuleId as jest.Mock).mockResolvedValue(existing);

    const result = await detectionRulesClient.bulkUpgradePrebuiltRules({
      rules: [queryAsset('same-type', 3)],
      changeTracking,
    });

    expect(upgradePrebuiltRule).not.toHaveBeenCalled();
    expect(bulkUpdateRules).toHaveBeenCalledWith(
      expect.objectContaining({
        args: expect.objectContaining({
          batchSize: PREBUILT_RULES_UPGRADE_BATCH_SIZE,
          rules: [expect.objectContaining({ id: 'so-1', rule_id: 'same-type', version: 3 })],
          changeTracking: expect.objectContaining({
            action: SecurityRuleChangeTrackingAction.ruleUpgrade,
            metadata: { bulkCount: 1 },
          }),
        }),
      })
    );
    expect(result).toEqual({
      results: [{ id: 'so-1', rule_id: 'same-type', version: 3 }],
      errors: [],
    });
  });

  it('same-type: keeps existing actions', async () => {
    const actions = [{ group: 'default', id: 'connector-1', action_type_id: '.index', params: {} }];
    const existing = { ...getRulesSchemaMock(), id: 'so-1', rule_id: 'same-type', actions };
    (getRuleByRuleId as jest.Mock).mockResolvedValue(existing);
    (applyRuleUpdate as jest.Mock).mockResolvedValueOnce({
      ...existing,
      actions: [],
      version: 3,
    });

    await detectionRulesClient.bulkUpgradePrebuiltRules({
      rules: [queryAsset('same-type', 3)],
      changeTracking,
    });

    expect(bulkUpdateRules).toHaveBeenCalledWith(
      expect.objectContaining({
        args: expect.objectContaining({
          rules: [expect.objectContaining({ id: 'so-1', actions })],
        }),
      })
    );
  });

  it('type-change: delete+create via upgradePrebuiltRule, not bulkUpdateRules', async () => {
    const existing = { ...getRulesSchemaMock(), id: 'so-1', rule_id: 'type-change', type: 'query' };
    (getRuleByRuleId as jest.Mock).mockResolvedValue(existing);

    const result = await detectionRulesClient.bulkUpgradePrebuiltRules({
      rules: [eqlAsset('type-change', 4)],
      changeTracking,
    });

    expect(bulkUpdateRules).not.toHaveBeenCalled();
    expect(upgradePrebuiltRule).toHaveBeenCalledWith(
      expect.objectContaining({
        ruleAsset: expect.objectContaining({ rule_id: 'type-change', type: 'eql' }),
        changeTracking,
      })
    );
    expect(result).toEqual({
      results: [{ id: 'upgraded-type-change', rule_id: 'type-change', version: 4 }],
      errors: [],
    });
  });

  it('mixed batch: type-change via upgradePrebuiltRule, same-type via bulkUpdateRules', async () => {
    (getRuleByRuleId as jest.Mock).mockImplementation(async ({ ruleId }) => {
      if (ruleId === 'keep-query') {
        return { ...getRulesSchemaMock(), id: 'so-same', rule_id: 'keep-query', type: 'query' };
      }
      if (ruleId === 'to-eql') {
        return { ...getRulesSchemaMock(), id: 'so-change', rule_id: 'to-eql', type: 'query' };
      }
      return null;
    });

    const result = await detectionRulesClient.bulkUpgradePrebuiltRules({
      rules: [queryAsset('keep-query', 2), eqlAsset('to-eql', 2)],
      changeTracking: { metadata: { bulkCount: 2 } },
    });

    expect(upgradePrebuiltRule).toHaveBeenCalledTimes(1);
    expect(upgradePrebuiltRule).toHaveBeenCalledWith(
      expect.objectContaining({ ruleAsset: expect.objectContaining({ rule_id: 'to-eql' }) })
    );
    expect(bulkUpdateRules).toHaveBeenCalledWith(
      expect.objectContaining({
        args: expect.objectContaining({
          rules: [expect.objectContaining({ id: 'so-same', rule_id: 'keep-query' })],
        }),
      })
    );
    expect(result.results).toEqual([
      { id: 'upgraded-to-eql', rule_id: 'to-eql', version: 2 },
      { id: 'so-same', rule_id: 'keep-query', version: 2 },
    ]);
    expect(result.errors).toEqual([]);
  });

  it('missing installed rule is a per-item error; siblings still write', async () => {
    (getRuleByRuleId as jest.Mock).mockImplementation(async ({ ruleId }) => {
      if (ruleId === 'exists') {
        return { ...getRulesSchemaMock(), id: 'so-1', rule_id: 'exists' };
      }
      return null;
    });

    const result = await detectionRulesClient.bulkUpgradePrebuiltRules({
      rules: [queryAsset('missing'), queryAsset('exists')],
      changeTracking,
    });

    expect(bulkUpdateRules).toHaveBeenCalledWith(
      expect.objectContaining({
        args: expect.objectContaining({
          rules: [expect.objectContaining({ rule_id: 'exists' })],
        }),
      })
    );
    expect(result.results).toEqual([{ id: 'so-1', rule_id: 'exists', version: 2 }]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].item.rule_id).toBe('missing');
    expect(result.errors[0].error.message).toContain('Failed to find rule missing');
  });

  it('ML authz failure is a per-item error; does not throw the call', async () => {
    (throwAuthzError as jest.Mock).mockImplementationOnce(() => {
      throw new Error('mocked MLAuth error');
    });
    const existing = { ...getRulesSchemaMock(), id: 'so-1', rule_id: 'ml-fail' };
    (getRuleByRuleId as jest.Mock).mockResolvedValue(existing);

    const result = await detectionRulesClient.bulkUpgradePrebuiltRules({
      rules: [queryAsset('ml-fail')],
      changeTracking,
    });

    expect(bulkUpdateRules).not.toHaveBeenCalled();
    expect(upgradePrebuiltRule).not.toHaveBeenCalled();
    expect(result.results).toEqual([]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].error.message).toBe('mocked MLAuth error');
  });

  it('maps a per-row bulkUpdateRules error back to the asset', async () => {
    const existing = { ...getRulesSchemaMock(), id: 'so-1', rule_id: 'row-fail' };
    (getRuleByRuleId as jest.Mock).mockResolvedValue(existing);
    (bulkUpdateRules as jest.Mock).mockResolvedValueOnce({
      successfulIds: [],
      errors: [{ message: 'schema boom', rule: { id: 'so-1', name: 'n/a' } }],
      total: 1,
    });

    const result = await detectionRulesClient.bulkUpgradePrebuiltRules({
      rules: [queryAsset('row-fail')],
      changeTracking,
    });

    expect(result.results).toEqual([]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].item.rule_id).toBe('row-fail');
    expect(result.errors[0].error.message).toBe('schema boom');
  });
});
