/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rulesClientMock } from '@kbn/alerting-plugin/server/mocks';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { licenseMock } from '@kbn/licensing-plugin/common/licensing.mock';

import { SecurityRuleChangeTrackingAction } from '../../../../../../common/detection_engine/rule_management/rule_change_tracking';
import { getCreateRulesSchemaMock } from '../../../../../../common/api/detection_engine/model/rule_schema/mocks';
import { buildMlAuthz } from '../../../../machine_learning/authz';
import { throwAuthzError } from '../../../../machine_learning/validation';
import { createDetectionRulesClient } from './detection_rules_client';
import type { IDetectionRulesClient } from './detection_rules_client_interface';
import { createProductFeaturesServiceMock } from '../../../../product_features_service/mocks';
import { getMockRulesAuthz } from '../../__mocks__/authz';

jest.mock('../../../../machine_learning/authz');
jest.mock('../../../../machine_learning/validation');

describe('DetectionRulesClient.bulkCreatePrebuiltRules', () => {
  let rulesClient: ReturnType<typeof rulesClientMock.create>;
  let detectionRulesClient: IDetectionRulesClient;

  const mlAuthz = (buildMlAuthz as jest.Mock)();
  const rulesAuthz = getMockRulesAuthz();
  const actionsClient: jest.Mocked<ActionsClient> = {
    isSystemAction: jest.fn(),
  } as unknown as jest.Mocked<ActionsClient>;

  beforeEach(() => {
    rulesClient = rulesClientMock.create();
    (throwAuthzError as jest.Mock).mockReset();
    detectionRulesClient = createDetectionRulesClient({
      actionsClient,
      rulesClient,
      mlAuthz,
      rulesAuthz,
      savedObjectsClient: savedObjectsClientMock.create(),
      license: licenseMock.createLicenseMock(),
      productFeaturesService: createProductFeaturesServiceMock(),
    });
  });

  it('issues a single bulkCreateRules call with disabled, immutable rules and emits { id, rule_id, version } pairs', async () => {
    const asset1 = { ...getCreateRulesSchemaMock(), version: 1, rule_id: 'rule-1' };
    const asset2 = { ...getCreateRulesSchemaMock(), version: 2, rule_id: 'rule-2' };

    rulesClient.bulkCreateRules.mockImplementationOnce(async (args) => {
      const ids = args.rules.map((r) => (r.options as { id: string }).id);
      return { successfulIds: ids, errors: [], total: ids.length };
    });

    const { results, errors } = await detectionRulesClient.bulkCreatePrebuiltRules({
      rules: [asset1, asset2],
    });

    expect(rulesClient.bulkCreateRules).toHaveBeenCalledTimes(1);
    const callArgs = rulesClient.bulkCreateRules.mock.calls[0][0];
    expect(callArgs.rules).toHaveLength(2);
    expect(callArgs.rules.every((r) => r.data.enabled === false)).toBe(true);
    expect(callArgs.rules.every((r) => r.data.params.immutable === true)).toBe(true);
    expect(errors).toEqual([]);
    expect(results).toHaveLength(2);
    const callIds = callArgs.rules.map((r) => (r.options as { id: string }).id);
    expect(results[0].result).toEqual({ id: callIds[0], rule_id: 'rule-1', version: 1 });
    expect(results[1].result).toEqual({ id: callIds[1], rule_id: 'rule-2', version: 2 });
  });

  it('issues a single bulkCreateRules call regardless of input size (alerting batches internally)', async () => {
    const assets = Array.from({ length: 250 }, (_, i) => ({
      ...getCreateRulesSchemaMock(),
      version: 1,
      rule_id: `rule-${i}`,
    }));

    rulesClient.bulkCreateRules.mockImplementationOnce(async (args) => ({
      successfulIds: args.rules.map((r) => (r.options as { id: string }).id),
      errors: [],
      total: args.rules.length,
    }));

    const { results, errors } = await detectionRulesClient.bulkCreatePrebuiltRules({
      rules: assets,
    });

    expect(rulesClient.bulkCreateRules).toHaveBeenCalledTimes(1);
    expect(results).toHaveLength(250);
    expect(errors).toEqual([]);
  });

  it('reports per-rule errors from the alerting layer', async () => {
    const asset = { ...getCreateRulesSchemaMock(), version: 1, rule_id: 'rule-1' };

    rulesClient.bulkCreateRules.mockImplementationOnce(async (args) => {
      const id = (args.rules[0].options as { id: string }).id;
      return {
        successfulIds: [],
        errors: [{ message: 'boom', status: 500, rule: { id, name: asset.name } }],
        total: 1,
      };
    });

    const { results, errors } = await detectionRulesClient.bulkCreatePrebuiltRules({
      rules: [asset],
    });

    expect(results).toEqual([]);
    expect(errors).toHaveLength(1);
    expect(errors[0].item).toBe(asset);
    expect(errors[0].error.message).toBe('boom');
  });

  it('returns ML-auth failures as per-rule errors without calling bulkCreateRules', async () => {
    const asset = { ...getCreateRulesSchemaMock(), version: 1, rule_id: 'rule-1' };
    (throwAuthzError as jest.Mock).mockImplementation(() => {
      throw new Error('ML auth denied');
    });

    const { results, errors } = await detectionRulesClient.bulkCreatePrebuiltRules({
      rules: [asset],
    });

    expect(rulesClient.bulkCreateRules).not.toHaveBeenCalled();
    expect(results).toEqual([]);
    expect(errors[0].error.message).toBe('ML auth denied');
  });

  it('returns empty result for empty input', async () => {
    const result = await detectionRulesClient.bulkCreatePrebuiltRules({ rules: [] });
    expect(result).toEqual({ results: [], errors: [] });
    expect(rulesClient.bulkCreateRules).not.toHaveBeenCalled();
  });

  it('forwards ruleInstall action and rules.length as bulkCount to rulesClient.bulkCreateRules', async () => {
    const assets = Array.from({ length: 3 }, (_, i) => ({
      ...getCreateRulesSchemaMock(),
      version: 1,
      rule_id: `rule-${i}`,
    }));

    rulesClient.bulkCreateRules.mockResolvedValueOnce({
      successfulIds: [],
      errors: [],
      total: 0,
    });

    await detectionRulesClient.bulkCreatePrebuiltRules({ rules: assets });

    expect(rulesClient.bulkCreateRules).toHaveBeenCalledWith(
      expect.objectContaining({
        changeTracking: {
          action: SecurityRuleChangeTrackingAction.ruleInstall,
          metadata: { bulkCount: assets.length },
        },
      })
    );
  });
});
