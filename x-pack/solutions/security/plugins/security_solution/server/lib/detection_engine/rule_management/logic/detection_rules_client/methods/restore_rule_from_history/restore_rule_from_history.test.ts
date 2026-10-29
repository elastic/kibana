/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withSpan } from '@kbn/apm-utils';
import { rulesClientMock } from '@kbn/alerting-plugin/server/rules_client.mock';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { RuleChangeHistoryDocument } from '@kbn/alerting-plugin/server';
import type { SanitizedRule } from '@kbn/alerting-types';
import { generateChangeHistoryDocument } from '@kbn/change-history/test_utils';

import { SecurityRuleChangeTrackingAction } from '../../../../../../../../common/detection_engine/rule_management/rule_change_tracking';
import { getRuleMock, resolveRuleMock } from '../../../../../routes/__mocks__/request_responses';
import { getQueryRuleParams } from '../../../../../rule_schema/mocks';
import type { RuleParams } from '../../../../../rule_schema';
import { buildMlAuthz } from '../../../../../../machine_learning/authz';
import { getMockRulesAuthz } from '../../../../__mocks__/authz';
import { createPrebuiltRuleAssetsClient } from '../../../../../prebuilt_rules/logic/rule_assets/__mocks__/prebuilt_rule_assets_client';
import { restoreRuleFromHistory } from '.';

jest.mock('@kbn/apm-utils', () => ({
  withSpan: jest.fn((_opts: unknown, cb: () => Promise<unknown>) => cb()),
}));

jest.mock('../../../../../../machine_learning/authz');
jest.mock('../../../../../../machine_learning/validation');

const withSpanMock = withSpan as jest.MockedFunction<typeof withSpan>;

const RULE_ID = '04128c15-0d1b-4716-a4c5-46997ac7f3bd';
const CHANGE_ID = 'change-abc-123';

const FETCH_HISTORY_SPAN = expect.objectContaining({
  name: 'DetectionRulesClient.restoreRuleFromHistory.fetchHistory',
  labels: { solution: 'security' },
});

const RESTORE_RULE_STATE_SPAN = expect.objectContaining({
  name: 'DetectionRulesClient.restoreRuleFromHistory.restoreRuleState',
  labels: { solution: 'security' },
});

const RESTORE_DELETED_RULE_SPAN = expect.objectContaining({
  name: 'DetectionRulesClient.restoreRuleFromHistory.restoreDeletedRule',
  labels: { solution: 'security' },
});

describe('restoreRuleFromHistory', () => {
  let rulesClient: ReturnType<typeof rulesClientMock.create>;
  let actionsClient: jest.Mocked<ActionsClient>;

  const mlAuthz = (buildMlAuthz as jest.Mock)();
  const rulesAuthz = getMockRulesAuthz();
  const prebuiltRuleAssetClient = createPrebuiltRuleAssetsClient();

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
    withSpanMock.mockClear();
    rulesClient = rulesClientMock.create();
    actionsClient = {
      isSystemAction: jest.fn(() => false),
    } as unknown as jest.Mocked<ActionsClient>;
  });

  describe('APM spans', () => {
    it('emits the fetchHistory and restoreRuleState spans and calls rulesClient.update when restoring an existing rule', async () => {
      rulesClient.resolve.mockResolvedValue(liveAlertingRule);
      rulesClient.getHistory.mockResolvedValue(buildHistoryResult(snapshotAlertingRule, CHANGE_ID));
      rulesClient.update.mockResolvedValue(getRuleMock(getQueryRuleParams()));

      await restoreRuleFromHistory({
        actionsClient,
        rulesClient,
        prebuiltRuleAssetClient,
        mlAuthz,
        rulesAuthz,
        ruleId: RULE_ID,
        changeId: CHANGE_ID,
        currentRuleRevision: liveAlertingRule.revision,
      });

      expect(rulesClient.getHistory).toHaveBeenCalledWith({
        module: 'security',
        ruleId: RULE_ID,
        size: 1,
        filters: [{ term: { 'event.id': CHANGE_ID } }],
      });
      expect(withSpanMock).toHaveBeenCalledWith(FETCH_HISTORY_SPAN, expect.any(Function));
      expect(withSpanMock).toHaveBeenCalledWith(RESTORE_RULE_STATE_SPAN, expect.any(Function));
      expect(rulesClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: liveAlertingRule.id,
          data: expect.objectContaining({
            params: expect.objectContaining({ description: 'snapshot description' }),
          }),
          changeTracking: expect.objectContaining({
            action: SecurityRuleChangeTrackingAction.ruleRestore,
            metadata: {
              restoredFromChangeId: CHANGE_ID,
              restoredFromRevision: snapshotAlertingRule.revision,
            },
          }),
        })
      );
    });

    it('emits the fetchHistory and restoreDeletedRule spans and calls rulesClient.create when restoring a deleted rule', async () => {
      const notFoundError = Object.assign(new Error('Not Found'), { output: { statusCode: 404 } });
      rulesClient.resolve.mockRejectedValue(notFoundError);
      rulesClient.getHistory.mockResolvedValue(buildHistoryResult(snapshotAlertingRule, CHANGE_ID));
      rulesClient.find.mockResolvedValue({ data: [], page: 1, perPage: 1, total: 0 });
      rulesClient.create.mockResolvedValue(getRuleMock(getQueryRuleParams()));

      await restoreRuleFromHistory({
        actionsClient,
        rulesClient,
        prebuiltRuleAssetClient,
        mlAuthz,
        rulesAuthz,
        ruleId: RULE_ID,
        changeId: CHANGE_ID,
      });

      expect(rulesClient.getHistory).toHaveBeenCalledWith({
        module: 'security',
        ruleId: RULE_ID,
        size: 1,
        filters: [{ term: { 'event.id': CHANGE_ID } }],
      });
      expect(withSpanMock).toHaveBeenCalledWith(FETCH_HISTORY_SPAN, expect.any(Function));
      expect(withSpanMock).toHaveBeenCalledWith(RESTORE_DELETED_RULE_SPAN, expect.any(Function));
      expect(rulesClient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            params: expect.objectContaining({ description: 'snapshot description' }),
          }),
          options: { id: RULE_ID, initialRevision: snapshotAlertingRule.revision + 1 },
          changeTracking: expect.objectContaining({
            action: SecurityRuleChangeTrackingAction.ruleRestore,
            metadata: {
              restoredFromChangeId: CHANGE_ID,
              restoredFromRevision: snapshotAlertingRule.revision,
            },
          }),
        })
      );
    });

    it('emits only the fetchHistory span, and never applyRestore, when the changeId is not found', async () => {
      rulesClient.resolve.mockResolvedValue(liveAlertingRule);
      rulesClient.getHistory.mockResolvedValue({ total: 0, items: [] });

      await expect(
        restoreRuleFromHistory({
          actionsClient,
          rulesClient,
          prebuiltRuleAssetClient,
          mlAuthz,
          rulesAuthz,
          ruleId: RULE_ID,
          changeId: CHANGE_ID,
          currentRuleRevision: liveAlertingRule.revision,
        })
      ).rejects.toMatchObject({ statusCode: 404 });

      expect(rulesClient.update).not.toHaveBeenCalled();
      expect(withSpanMock).toHaveBeenCalledWith(FETCH_HISTORY_SPAN, expect.any(Function));
      expect(withSpanMock).not.toHaveBeenCalledWith(RESTORE_RULE_STATE_SPAN, expect.any(Function));
      expect(withSpanMock).not.toHaveBeenCalledWith(
        RESTORE_DELETED_RULE_SPAN,
        expect.any(Function)
      );
    });

    it('propagates the 409 concurrency error after the fetchHistory span', async () => {
      rulesClient.resolve.mockResolvedValue(liveAlertingRule);
      rulesClient.getHistory.mockResolvedValue(buildHistoryResult(snapshotAlertingRule, CHANGE_ID));

      await expect(
        restoreRuleFromHistory({
          actionsClient,
          rulesClient,
          prebuiltRuleAssetClient,
          mlAuthz,
          rulesAuthz,
          ruleId: RULE_ID,
          changeId: CHANGE_ID,
          currentRuleRevision: liveAlertingRule.revision + 1,
        })
      ).rejects.toMatchObject({ statusCode: 409 });

      expect(rulesClient.getHistory).toHaveBeenCalled();
      expect(withSpanMock).toHaveBeenCalledWith(FETCH_HISTORY_SPAN, expect.any(Function));
      expect(withSpanMock).not.toHaveBeenCalledWith(RESTORE_RULE_STATE_SPAN, expect.any(Function));
      expect(withSpanMock).not.toHaveBeenCalledWith(
        RESTORE_DELETED_RULE_SPAN,
        expect.any(Function)
      );
    });

    it('returns no_change and skips rulesClient.update when the snapshot is identical to the current rule', async () => {
      rulesClient.resolve.mockResolvedValue(liveAlertingRule);
      rulesClient.getHistory.mockResolvedValue(buildHistoryResult(liveAlertingRule, CHANGE_ID));

      const result = await restoreRuleFromHistory({
        actionsClient,
        rulesClient,
        prebuiltRuleAssetClient,
        mlAuthz,
        rulesAuthz,
        ruleId: RULE_ID,
        changeId: CHANGE_ID,
        currentRuleRevision: liveAlertingRule.revision,
      });

      expect(result.no_change).toBe(true);
      expect(rulesClient.update).not.toHaveBeenCalled();
      expect(withSpanMock).toHaveBeenCalledWith(RESTORE_RULE_STATE_SPAN, expect.any(Function));
    });

    it('throws a 409 when the rule has been deleted but a currentRuleRevision is still supplied', async () => {
      const notFoundError = Object.assign(new Error('Not Found'), { output: { statusCode: 404 } });
      rulesClient.resolve.mockRejectedValue(notFoundError);
      rulesClient.getHistory.mockResolvedValue(buildHistoryResult(snapshotAlertingRule, CHANGE_ID));

      await expect(
        restoreRuleFromHistory({
          actionsClient,
          rulesClient,
          prebuiltRuleAssetClient,
          mlAuthz,
          rulesAuthz,
          ruleId: RULE_ID,
          changeId: CHANGE_ID,
          currentRuleRevision: liveAlertingRule.revision,
        })
      ).rejects.toMatchObject({ statusCode: 409 });

      expect(rulesClient.getHistory).toHaveBeenCalled();
      expect(withSpanMock).toHaveBeenCalledWith(FETCH_HISTORY_SPAN, expect.any(Function));
      expect(withSpanMock).not.toHaveBeenCalledWith(RESTORE_RULE_STATE_SPAN, expect.any(Function));
      expect(withSpanMock).not.toHaveBeenCalledWith(
        RESTORE_DELETED_RULE_SPAN,
        expect.any(Function)
      );
    });

    it('propagates a hydration-failure error from inside the fetchHistory span when the snapshot rule is missing', async () => {
      rulesClient.resolve.mockResolvedValue(liveAlertingRule);
      rulesClient.getHistory.mockResolvedValue({
        total: 1,
        items: [
          {
            ...generateChangeHistoryDocument({
              event: {
                id: CHANGE_ID,
                action: 'rule_update',
                type: 'change',
                module: 'security',
                dataset: 'alerting-rules',
              },
            }),
            rule: undefined,
          } as unknown as RuleChangeHistoryDocument<RuleParams>,
        ],
      });

      await expect(
        restoreRuleFromHistory({
          actionsClient,
          rulesClient,
          prebuiltRuleAssetClient,
          mlAuthz,
          rulesAuthz,
          ruleId: RULE_ID,
          changeId: CHANGE_ID,
          currentRuleRevision: liveAlertingRule.revision,
        })
      ).rejects.toThrow(/could not be hydrated/);

      expect(withSpanMock).toHaveBeenCalledWith(FETCH_HISTORY_SPAN, expect.any(Function));
      expect(withSpanMock).not.toHaveBeenCalledWith(RESTORE_RULE_STATE_SPAN, expect.any(Function));
      expect(withSpanMock).not.toHaveBeenCalledWith(
        RESTORE_DELETED_RULE_SPAN,
        expect.any(Function)
      );
    });

    it('throws a 409 when restoring a deleted rule would collide with an existing rule_id', async () => {
      const notFoundError = Object.assign(new Error('Not Found'), { output: { statusCode: 404 } });
      rulesClient.resolve.mockRejectedValue(notFoundError);
      rulesClient.getHistory.mockResolvedValue(buildHistoryResult(snapshotAlertingRule, CHANGE_ID));
      rulesClient.find.mockResolvedValue({
        data: [getRuleMock(getQueryRuleParams())],
        page: 1,
        perPage: 1,
        total: 1,
      });

      await expect(
        restoreRuleFromHistory({
          actionsClient,
          rulesClient,
          prebuiltRuleAssetClient,
          mlAuthz,
          rulesAuthz,
          ruleId: RULE_ID,
          changeId: CHANGE_ID,
        })
      ).rejects.toMatchObject({ statusCode: 409 });

      expect(rulesClient.create).not.toHaveBeenCalled();
      expect(withSpanMock).not.toHaveBeenCalledWith(
        RESTORE_DELETED_RULE_SPAN,
        expect.any(Function)
      );
    });

    it('throws a 403 when the caller lacks permission to write an updated field', async () => {
      rulesClient.resolve.mockResolvedValue(liveAlertingRule);
      rulesClient.getHistory.mockResolvedValue(buildHistoryResult(snapshotAlertingRule, CHANGE_ID));

      await expect(
        restoreRuleFromHistory({
          actionsClient,
          rulesClient,
          prebuiltRuleAssetClient,
          mlAuthz,
          rulesAuthz: { ...getMockRulesAuthz(), canEditExceptions: false },
          ruleId: RULE_ID,
          changeId: CHANGE_ID,
          currentRuleRevision: liveAlertingRule.revision,
        })
      ).rejects.toMatchObject({ statusCode: 403 });

      expect(rulesClient.update).not.toHaveBeenCalled();
    });

    it('throws a 403 when the caller lacks permission to write a field while restoring a deleted rule', async () => {
      const notFoundError = Object.assign(new Error('Not Found'), { output: { statusCode: 404 } });
      rulesClient.resolve.mockRejectedValue(notFoundError);
      rulesClient.getHistory.mockResolvedValue(buildHistoryResult(snapshotAlertingRule, CHANGE_ID));
      rulesClient.find.mockResolvedValue({ data: [], page: 1, perPage: 1, total: 0 });

      await expect(
        restoreRuleFromHistory({
          actionsClient,
          rulesClient,
          prebuiltRuleAssetClient,
          mlAuthz,
          rulesAuthz: { ...getMockRulesAuthz(), canEditExceptions: false },
          ruleId: RULE_ID,
          changeId: CHANGE_ID,
        })
      ).rejects.toMatchObject({ statusCode: 403 });

      expect(rulesClient.create).not.toHaveBeenCalled();
    });
  });
});
