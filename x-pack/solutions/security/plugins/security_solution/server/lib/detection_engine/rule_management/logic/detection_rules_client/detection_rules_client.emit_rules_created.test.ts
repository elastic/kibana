/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { userProfileServiceMock } from '@kbn/core-user-profile-server-mocks';
import { rulesClientMock } from '@kbn/alerting-plugin/server/mocks';
import { actionsClientMock } from '@kbn/actions-plugin/server/actions_client/actions_client.mock';
import { httpServerMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { licenseMock } from '@kbn/licensing-plugin/common/licensing.mock';

import { buildMlAuthz } from '../../../../machine_learning/__mocks__/authz';
import {
  getCreateRulesSchemaMock,
  getRulesSchemaMock,
} from '../../../../../../common/api/detection_engine/model/rule_schema/mocks';
import { getImportRulesSchemaMock } from '../../../../../../common/api/detection_engine/rule_management/mocks';
import { SecurityRuleChangeTrackingAction } from '../../../../../../common/detection_engine/rule_management/rule_change_tracking';
import type { RuleResponse } from '../../../../../../common/api/detection_engine';
import {
  detectionRulesCreatedTriggerDef,
  MAX_RULES_PER_TRIGGER,
} from '../../../../../../common/workflows/triggers';
import { SecuritySolutionEventBus } from '../../../../../events/event_bus';
import type { DetectionRulesCreatedPayload } from '../../../../../events/types';
import { getRuleMock } from '../../../routes/__mocks__/request_responses';
import { getQueryRuleParams } from '../../../rule_schema/mocks';
import { createProductFeaturesServiceMock } from '../../../../product_features_service/mocks';
import { getMockRulesAuthz } from '../../__mocks__/authz';
import { createDetectionRulesClient } from './detection_rules_client';
import { checkRuleExceptionReferences } from './methods/import_rules/check_rule_exception_references';
import { fetchPrebuiltImportContext } from './methods/import_rules/fetch_prebuilt_import_context';
import { findInstalledRulesBySignatureIds } from './methods/import_rules/find_installed_rules_by_signature_ids';

jest.mock('./methods/import_rules/check_rule_exception_references');
jest.mock('./methods/import_rules/fetch_prebuilt_import_context');
jest.mock('./methods/import_rules/find_installed_rules_by_signature_ids');

describe('DetectionRulesClient emits detectionRulesCreated', () => {
  const request = httpServerMock.createKibanaRequest();
  let rulesClient: ReturnType<typeof rulesClientMock.create>;
  let eventBus: SecuritySolutionEventBus;
  let events: Array<{ payload: DetectionRulesCreatedPayload; requestSeen: unknown }>;

  const buildClient = (deps: { withBus?: boolean; withRequest?: boolean } = {}) => {
    const { withBus = true, withRequest = true } = deps;
    return createDetectionRulesClient({
      actionsClient: actionsClientMock.create(),
      rulesClient,
      userProfile: userProfileServiceMock.createStart(),
      mlAuthz: buildMlAuthz(),
      rulesAuthz: getMockRulesAuthz(),
      savedObjectsClient: savedObjectsClientMock.create(),
      license: licenseMock.createLicenseMock(),
      productFeaturesService: createProductFeaturesServiceMock(),
      logger: loggingSystemMock.createLogger(),
      eventBus: withBus ? eventBus : undefined,
      request: withRequest ? request : undefined,
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (checkRuleExceptionReferences as jest.Mock).mockReturnValue([[], []]);
    (fetchPrebuiltImportContext as jest.Mock).mockResolvedValue({
      matchingAssetsByRuleId: {},
      availableRuleAssetIds: new Set<string>(),
    });
    (findInstalledRulesBySignatureIds as jest.Mock).mockResolvedValue({});

    rulesClient = rulesClientMock.create();
    rulesClient.bulkCreateRules.mockImplementation(async ({ rules }) => ({
      successfulIds: rules.map((r) => (r.options as { id: string }).id),
      errors: [],
      total: rules.length,
    }));
    rulesClient.bulkUpdateRules.mockResolvedValue({ successfulIds: [], errors: [], total: 0 });
    rulesClient.bulkEnableRules.mockResolvedValue({
      errors: [],
      rules: [],
      total: 0,
      taskIdsFailedToBeEnabled: [],
    });
    rulesClient.bulkDisableRules.mockResolvedValue({ errors: [], rules: [], total: 0 });

    eventBus = new SecuritySolutionEventBus();
    events = [];
    eventBus.onDetectionRulesCreated((event) => {
      events.push({ payload: event.payload, requestSeen: event.request });
    });
  });

  describe('createCustomRule', () => {
    beforeEach(() => {
      rulesClient.create.mockResolvedValue(
        getRuleMock(getQueryRuleParams({ ruleId: 'custom-rule' }), { tags: ['t1'] })
      );
    });

    it('emits one event carrying the saved object id, and the emitting request', async () => {
      const created = await buildClient().createCustomRule({ params: getCreateRulesSchemaMock() });

      expect(events).toHaveLength(1);
      expect(events[0].payload).toEqual({
        ids: [created.id],
        types: ['query'],
        tags: ['t1'],
        totalCount: 1,
        source: 'api',
      });
      // The workflow runs as whoever created the rule, so the event must carry that request.
      expect(events[0].requestSeen).toBe(request);
    });

    // rule_id has no length limit in the API. An event that fails validation is dropped, so it
    // must never carry values the trigger schema can reject.
    it('emits an event the trigger schema accepts for a very long rule_id and long tags', async () => {
      rulesClient.create.mockResolvedValue(
        getRuleMock(getQueryRuleParams({ ruleId: 'r'.repeat(600) }), {
          tags: ['t'.repeat(600), ...Array.from({ length: 150 }, (_, i) => `tag-${i}`)],
        })
      );

      await buildClient().createCustomRule({ params: getCreateRulesSchemaMock() });

      expect(events).toHaveLength(1);
      expect(() =>
        detectionRulesCreatedTriggerDef.eventSchema.parse(events[0].payload)
      ).not.toThrow();
    });

    it('does not emit when the rule fails to create', async () => {
      rulesClient.create.mockRejectedValue(new Error('conflict'));

      await expect(
        buildClient().createCustomRule({ params: getCreateRulesSchemaMock() })
      ).rejects.toThrow('conflict');
      expect(events).toHaveLength(0);
    });

    it.each([
      { name: 'event bus', deps: { withBus: false } },
      { name: 'request', deps: { withRequest: false } },
    ])('is a no-op without an $name and still creates the rule', async ({ deps }) => {
      await expect(
        buildClient(deps).createCustomRule({ params: getCreateRulesSchemaMock() })
      ).resolves.toBeDefined();
      expect(events).toHaveLength(0);
    });

    it('never fails rule creation when emitting throws', async () => {
      jest.spyOn(eventBus, 'emitDetectionRulesCreated').mockImplementation(() => {
        throw new Error('bus down');
      });

      await expect(
        buildClient().createCustomRule({ params: getCreateRulesSchemaMock() })
      ).resolves.toBeDefined();
    });
  });

  describe('createPrebuiltRule', () => {
    it('emits one event with source prebuilt_install', async () => {
      rulesClient.create.mockResolvedValue(getRuleMock(getQueryRuleParams({ ruleId: 'prebuilt' })));

      const created = await buildClient().createPrebuiltRule({
        params: { ...getCreateRulesSchemaMock(), version: 1 },
      });

      expect(events).toHaveLength(1);
      expect(events[0].payload).toMatchObject({
        ids: [created.id],
        totalCount: 1,
        source: 'prebuilt_install',
      });
    });
  });

  describe('bulkCreatePrebuiltRules', () => {
    const changeTracking = { action: SecurityRuleChangeTrackingAction.ruleInstall } as const;

    const assets = (count: number) =>
      Array.from({ length: count }, (_, i) => ({
        ...getCreateRulesSchemaMock(`rule-${i}`),
        rule_id: `rule-${i}`,
        version: 1,
        tags: [`tag-${i % 3}`],
      }));

    it('emits one event with the saved object ids of the rules that were created', async () => {
      await buildClient().bulkCreatePrebuiltRules({ rules: assets(3), changeTracking });

      expect(events).toHaveLength(1);
      const { ids, tags, totalCount, source } = events[0].payload;
      expect(ids).toHaveLength(3);
      expect(new Set(ids).size).toBe(3);
      expect(tags).toEqual(['tag-0', 'tag-1', 'tag-2']);
      expect(totalCount).toBe(3);
      expect(source).toBe('prebuilt_install');
    });

    it('omits rules that failed to create', async () => {
      let createdId = '';
      rulesClient.bulkCreateRules.mockImplementation(async ({ rules }) => {
        createdId = (rules[0].options as { id: string }).id;
        return { successfulIds: [createdId], errors: [], total: rules.length };
      });

      await buildClient().bulkCreatePrebuiltRules({ rules: assets(2), changeTracking });

      expect(events).toHaveLength(1);
      expect(events[0].payload.ids).toEqual([createdId]);
      expect(events[0].payload.totalCount).toBe(1);
    });

    it('splits creations over the cap into several events', async () => {
      await buildClient().bulkCreatePrebuiltRules({
        rules: assets(MAX_RULES_PER_TRIGGER + 1),
        changeTracking,
      });

      expect(events).toHaveLength(2);
      expect(events.map(({ payload }) => payload.ids.length)).toEqual([MAX_RULES_PER_TRIGGER, 1]);
      expect(events.every(({ payload }) => payload.totalCount === MAX_RULES_PER_TRIGGER + 1)).toBe(
        true
      );
    });

    it('does not emit when nothing was created', async () => {
      await buildClient().bulkCreatePrebuiltRules({ rules: [], changeTracking });
      expect(events).toHaveLength(0);
    });
  });

  describe('importRules', () => {
    it('emits only for newly created rules, not for overwritten ones', async () => {
      const newRule = { ...getImportRulesSchemaMock(), rule_id: 'new-rule', tags: ['n'] };
      const existing = { ...getImportRulesSchemaMock(), rule_id: 'existing-rule' };
      const existingRule = { ...getRulesSchemaMock(), rule_id: 'existing-rule' };
      (findInstalledRulesBySignatureIds as jest.Mock).mockResolvedValue({
        'existing-rule': existingRule,
      });
      rulesClient.bulkUpdateRules.mockResolvedValue({
        successfulIds: [existingRule.id],
        errors: [],
        total: 1,
      });

      await buildClient().importRules({
        allowMissingConnectorSecrets: false,
        overwriteRules: true,
        rules: [newRule, existing],
      });

      expect(events).toHaveLength(1);
      expect(events[0].payload).toMatchObject({
        tags: ['n'],
        totalCount: 1,
        source: 'import',
      });
      expect(events[0].payload.ids).not.toContain(existingRule.id);
    });

    it('does not emit for rules that failed to import', async () => {
      rulesClient.bulkCreateRules.mockResolvedValue({
        successfulIds: [],
        errors: [],
        total: 0,
      });

      await buildClient().importRules({
        allowMissingConnectorSecrets: false,
        overwriteRules: false,
        rules: [{ ...getImportRulesSchemaMock(), rule_id: 'never-created' }],
      });

      expect(events).toHaveLength(0);
    });
  });
  describe('batching one-at-a-time creations into a single event', () => {
    it.each([
      {
        method: 'createCustomRule' as const,
        create: (client: ReturnType<typeof buildClient>) =>
          client.createCustomRule({
            params: getCreateRulesSchemaMock(),
            suppressCreatedEvent: true,
          }),
      },
      {
        method: 'createPrebuiltRule' as const,
        create: (client: ReturnType<typeof buildClient>) =>
          client.createPrebuiltRule({
            params: { ...getCreateRulesSchemaMock(), version: 1 },
            suppressCreatedEvent: true,
          }),
      },
    ])(
      '$method creates the rule but emits nothing when suppressCreatedEvent is set',
      async ({ create }) => {
        rulesClient.create.mockResolvedValue(getRuleMock(getQueryRuleParams()));

        await expect(create(buildClient())).resolves.toBeDefined();

        expect(rulesClient.create).toHaveBeenCalledTimes(1);
        expect(events).toHaveLength(0);
      }
    );

    it('notifyRulesCreated emits one event for all given rules with the given source', () => {
      buildClient().notifyRulesCreated({
        rules: [
          { ...getRulesSchemaMock(), id: 'so-1', rule_id: 'rule-1', type: 'query', tags: ['a'] },
          { ...getRulesSchemaMock(), id: 'so-2', rule_id: 'rule-2', type: 'eql', tags: [] },
        ] as RuleResponse[],
        source: 'siem_migration',
      });

      expect(events).toHaveLength(1);
      expect(events[0].payload).toEqual({
        ids: ['so-1', 'so-2'],
        types: ['query', 'eql'],
        tags: ['a'],
        totalCount: 2,
        source: 'siem_migration',
      });
      expect(events[0].requestSeen).toBe(request);
    });

    it('notifyRulesCreated splits more than the cap into several events', () => {
      const rules = Array.from({ length: MAX_RULES_PER_TRIGGER + 1 }, (_, i) => ({
        ...getRulesSchemaMock(),
        id: `so-${i}`,
        rule_id: `rule-${i}`,
      }));

      buildClient().notifyRulesCreated({ rules, source: 'prebuilt_install' });

      expect(events.map(({ payload }) => payload.ids.length)).toEqual([MAX_RULES_PER_TRIGGER, 1]);
    });

    // The creation already succeeded, so a bad notification must not turn it into a failure.
    it('notifyRulesCreated never throws, even for input it cannot summarise', () => {
      expect(() =>
        buildClient().notifyRulesCreated({
          rules: [undefined as unknown as RuleResponse],
          source: 'api',
        })
      ).not.toThrow();
      expect(events).toHaveLength(0);
    });

    it.each([
      { name: 'event bus', deps: { withBus: false } },
      { name: 'request', deps: { withRequest: false } },
    ])('notifyRulesCreated is a no-op without an $name', ({ deps }) => {
      expect(() =>
        buildClient(deps).notifyRulesCreated({ rules: [getRulesSchemaMock()], source: 'api' })
      ).not.toThrow();
      expect(events).toHaveLength(0);
    });
  });
});
