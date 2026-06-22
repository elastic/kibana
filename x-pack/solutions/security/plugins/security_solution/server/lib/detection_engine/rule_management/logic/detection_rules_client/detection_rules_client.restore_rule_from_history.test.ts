/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rulesClientMock } from '@kbn/alerting-plugin/server/rules_client.mock';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { RuleChangeHistoryDocument } from '@kbn/alerting-plugin/server';
import type { SanitizedRule } from '@kbn/alerting-types';
import { generateChangeHistoryDocument } from '@kbn/change-history/test_utils';

import { getRuleMock, resolveRuleMock } from '../../../routes/__mocks__/request_responses';
import { getQueryRuleParams } from '../../../rule_schema/mocks';
import type { RuleParams } from '../../../rule_schema';
import { buildMlAuthz } from '../../../../machine_learning/authz';
import { throwAuthzError } from '../../../../machine_learning/validation';
import { createDetectionRulesClient } from './detection_rules_client';
import type { IDetectionRulesClient } from './detection_rules_client_interface';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { licenseMock } from '@kbn/licensing-plugin/common/licensing.mock';
import { createProductFeaturesServiceMock } from '../../../../product_features_service/mocks';
import { getMockRulesAuthz } from '../../__mocks__/authz';

jest.mock('../../../../machine_learning/authz');
jest.mock('../../../../machine_learning/validation');

const RULE_ID = '04128c15-0d1b-4716-a4c5-46997ac7f3bd';
const CHANGE_ID = 'change-abc-123';

describe('DetectionRulesClient.restoreRuleFromHistory', () => {
  let rulesClient: ReturnType<typeof rulesClientMock.create>;
  let detectionRulesClient: IDetectionRulesClient;

  const mlAuthz = (buildMlAuthz as jest.Mock)();
  const rulesAuthz = getMockRulesAuthz();

  const liveAlertingRule = resolveRuleMock(getQueryRuleParams());
  const snapshotAlertingRule = getRuleMock(
    getQueryRuleParams({ description: 'snapshot description' })
  );

  const buildHistoryResult = (
    ruleSnapshot: SanitizedRule<RuleParams>,
    changeId: string
  ): { total: number; items: RuleChangeHistoryDocument<RuleParams>[] } => ({
    total: 1,
    items: [
      {
        ...generateChangeHistoryDocument({
          event: {
            id: changeId,
            action: 'rule_update',
            type: 'change',
            module: 'security',
            dataset: 'alerting-rules',
          },
        }),
        rule: ruleSnapshot,
      } as unknown as RuleChangeHistoryDocument<RuleParams>,
    ],
  });

  beforeEach(() => {
    rulesClient = rulesClientMock.create();

    const savedObjectsClient = savedObjectsClientMock.create();
    // Return an empty hits structure so prebuilt asset lookups don't throw.
    savedObjectsClient.search.mockResolvedValue({
      hits: { hits: [], total: { value: 0, relation: 'eq' } },
    } as never);

    detectionRulesClient = createDetectionRulesClient({
      actionsClient: {
        isSystemAction: jest.fn((id: string) => id === 'system-connector-.cases'),
      } as unknown as jest.Mocked<ActionsClient>,
      rulesClient,
      mlAuthz,
      rulesAuthz,
      savedObjectsClient,
      license: licenseMock.createLicenseMock(),
      productFeaturesService: createProductFeaturesServiceMock(),
    });
  });

  it('restores a custom rule and calls rulesClient.update with snapshot params', async () => {
    rulesClient.resolve.mockResolvedValue(liveAlertingRule);
    rulesClient.getHistory.mockResolvedValue(buildHistoryResult(snapshotAlertingRule, CHANGE_ID));
    rulesClient.update.mockResolvedValue(getRuleMock(getQueryRuleParams()));

    await detectionRulesClient.restoreRuleFromHistory({ ruleId: RULE_ID, changeId: CHANGE_ID });

    expect(rulesClient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: liveAlertingRule.id,
        data: expect.objectContaining({
          params: expect.objectContaining({
            description: snapshotAlertingRule.params.description,
          }),
        }),
      })
    );
  });

  it('restores a customized prebuilt rule', async () => {
    const customizedPrebuiltLiveRule = resolveRuleMock(
      getQueryRuleParams({
        immutable: true,
        ruleSource: { type: 'external', isCustomized: true },
      })
    );

    const customizedPrebuiltSnapshot = getRuleMock(
      getQueryRuleParams({
        description: 'customized prebuilt snapshot',
        immutable: true,
        ruleSource: { type: 'external', isCustomized: true },
      })
    );

    rulesClient.resolve.mockResolvedValue(customizedPrebuiltLiveRule);
    rulesClient.getHistory.mockResolvedValue(
      buildHistoryResult(customizedPrebuiltSnapshot, CHANGE_ID)
    );
    rulesClient.update.mockResolvedValue(getRuleMock(getQueryRuleParams()));

    await detectionRulesClient.restoreRuleFromHistory({ ruleId: RULE_ID, changeId: CHANGE_ID });

    expect(rulesClient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: customizedPrebuiltLiveRule.id,
        data: expect.objectContaining({
          params: expect.objectContaining({
            description: customizedPrebuiltSnapshot.params.description,
          }),
        }),
      })
    );
  });

  it('restores a non-customized prebuilt rule', async () => {
    const purePrebuiltLiveRule = resolveRuleMock(
      getQueryRuleParams({
        immutable: true,
        ruleSource: { type: 'external', isCustomized: false },
      })
    );

    const purePrebuiltSnapshot = getRuleMock(
      getQueryRuleParams({
        description: 'pure prebuilt snapshot',
        immutable: true,
        ruleSource: { type: 'external', isCustomized: false },
      })
    );

    rulesClient.resolve.mockResolvedValue(purePrebuiltLiveRule);
    rulesClient.getHistory.mockResolvedValue(buildHistoryResult(purePrebuiltSnapshot, CHANGE_ID));
    rulesClient.update.mockResolvedValue(getRuleMock(getQueryRuleParams()));

    await detectionRulesClient.restoreRuleFromHistory({ ruleId: RULE_ID, changeId: CHANGE_ID });

    expect(rulesClient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: purePrebuiltLiveRule.id,
        data: expect.objectContaining({
          params: expect.objectContaining({
            description: purePrebuiltSnapshot.params.description,
          }),
        }),
      })
    );
  });

  it('throws 404 when the rule is not found', async () => {
    const notFoundError = Object.assign(new Error('Not Found'), { output: { statusCode: 404 } });
    rulesClient.resolve.mockRejectedValue(notFoundError);

    await expect(
      detectionRulesClient.restoreRuleFromHistory({ ruleId: RULE_ID, changeId: CHANGE_ID })
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(rulesClient.update).not.toHaveBeenCalled();
  });

  it('throws 404 when the changeId is not found', async () => {
    rulesClient.resolve.mockResolvedValue(liveAlertingRule);
    rulesClient.getHistory.mockResolvedValue({ total: 0, items: [] });

    await expect(
      detectionRulesClient.restoreRuleFromHistory({ ruleId: RULE_ID, changeId: CHANGE_ID })
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(rulesClient.update).not.toHaveBeenCalled();
  });

  it('preserves the current enabled state', async () => {
    const disabledLiveRule = getRuleMock(getQueryRuleParams(), { enabled: false });
    const enabledSnapshot = getRuleMock(getQueryRuleParams({ description: 'enabled snapshot' }), {
      enabled: true,
    });

    rulesClient.resolve.mockResolvedValue(disabledLiveRule as never);
    rulesClient.getHistory.mockResolvedValue(buildHistoryResult(enabledSnapshot, CHANGE_ID));
    rulesClient.update.mockResolvedValue(getRuleMock(getQueryRuleParams()));

    await detectionRulesClient.restoreRuleFromHistory({ ruleId: RULE_ID, changeId: CHANGE_ID });

    expect(rulesClient.enableRule).not.toHaveBeenCalled();
    expect(rulesClient.disableRule).not.toHaveBeenCalled();
  });

  it('fetches the target history entry by event.id with size 1', async () => {
    rulesClient.resolve.mockResolvedValue(liveAlertingRule);
    rulesClient.getHistory.mockResolvedValue(buildHistoryResult(snapshotAlertingRule, CHANGE_ID));
    rulesClient.update.mockResolvedValue(getRuleMock(getQueryRuleParams()));

    await detectionRulesClient.restoreRuleFromHistory({ ruleId: RULE_ID, changeId: CHANGE_ID });

    expect(rulesClient.getHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        module: 'security',
        ruleId: RULE_ID,
        size: 1,
        filters: [{ term: { 'event.id': CHANGE_ID } }],
      })
    );
  });

  it('throws if mlAuth fails', async () => {
    (throwAuthzError as jest.Mock).mockImplementationOnce(() => {
      throw new Error('mocked MLAuth error');
    });

    rulesClient.resolve.mockResolvedValue(liveAlertingRule);
    rulesClient.getHistory.mockResolvedValue(buildHistoryResult(snapshotAlertingRule, CHANGE_ID));

    await expect(
      detectionRulesClient.restoreRuleFromHistory({ ruleId: RULE_ID, changeId: CHANGE_ID })
    ).rejects.toThrow('mocked MLAuth error');

    expect(rulesClient.update).not.toHaveBeenCalled();
  });

  it('returns a converted RuleResponse wrapping the updated rule', async () => {
    rulesClient.resolve.mockResolvedValue(liveAlertingRule);
    rulesClient.getHistory.mockResolvedValue(buildHistoryResult(snapshotAlertingRule, CHANGE_ID));
    rulesClient.update.mockResolvedValue(getRuleMock(getQueryRuleParams()));

    const result = await detectionRulesClient.restoreRuleFromHistory({
      ruleId: RULE_ID,
      changeId: CHANGE_ID,
    });

    expect(result.rule).toMatchObject({
      id: liveAlertingRule.id,
      rule_source: { type: 'internal' },
    });
  });
});
