/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { userProfileServiceMock } from '@kbn/core-user-profile-server-mocks';
import type { ListArray } from '@kbn/securitysolution-io-ts-list-types';
import { rulesClientMock } from '@kbn/alerting-plugin/server/mocks';
import { actionsClientMock } from '@kbn/actions-plugin/server/actions_client/actions_client.mock';
import type { AnalyticsServiceSetup } from '@kbn/core/server';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { licenseMock } from '@kbn/licensing-plugin/common/licensing.mock';

import { buildMlAuthz } from '../../../../machine_learning/__mocks__/authz';
import { SecurityRuleChangeTrackingAction } from '../../../../../../common/detection_engine/rule_management/rule_change_tracking';
import { getImportRulesSchemaMock } from '../../../../../../common/api/detection_engine/rule_management/mocks';
import { getRulesSchemaMock } from '../../../../../../common/api/detection_engine/model/rule_schema/mocks';
import { createDetectionRulesClient } from './detection_rules_client';
import { checkRuleExceptionReferences } from './methods/import_rules/check_rule_exception_references';
import { fetchPrebuiltImportContext } from './methods/import_rules/fetch_prebuilt_import_context';
import { findInstalledRulesBySignatureIds } from './methods/import_rules/find_installed_rules_by_signature_ids';
import { createProductFeaturesServiceMock } from '../../../../product_features_service/mocks';
import { getMockRulesAuthz } from '../../__mocks__/authz';
import { createRuleImportErrorObject } from './methods/import_rules/errors';
import { DETECTION_RULE_IMPORT_EVENT } from '../../../../telemetry/event_based/events';
import { RULE_IMPORT_BATCH_SIZE } from '../../api/constants';

jest.mock('./methods/import_rules/check_rule_exception_references');
jest.mock('./methods/import_rules/fetch_prebuilt_import_context');
jest.mock('./methods/import_rules/find_installed_rules_by_signature_ids');

const emptyPrebuiltContext = () => ({
  matchingAssetsByRuleId: {},
  availableRuleAssetIds: new Set<string>(),
});

describe('detectionRulesClient.importRules', () => {
  let rulesClient: ReturnType<typeof rulesClientMock.create>;
  let subject: ReturnType<typeof createDetectionRulesClient>;
  let analytics: AnalyticsServiceSetup;
  const rulesAuthz = getMockRulesAuthz();

  beforeEach(() => {
    jest.clearAllMocks();
    (checkRuleExceptionReferences as jest.Mock).mockReturnValue([[], []]);
    (fetchPrebuiltImportContext as jest.Mock).mockResolvedValue(emptyPrebuiltContext());
    (findInstalledRulesBySignatureIds as jest.Mock).mockResolvedValue({});

    rulesClient = rulesClientMock.create();
    rulesClient.bulkCreateRules.mockResolvedValue({
      successfulIds: [],
      errors: [],
      total: 0,
    });
    rulesClient.bulkUpdateRules.mockResolvedValue({
      successfulIds: [],
      errors: [],
      total: 0,
    });
    rulesClient.bulkEnableRules.mockResolvedValue({
      errors: [],
      rules: [],
      total: 0,
      taskIdsFailedToBeEnabled: [],
    });
    rulesClient.bulkDisableRules.mockResolvedValue({
      errors: [],
      rules: [],
      total: 0,
    });
    analytics = { reportEvent: jest.fn() } as unknown as AnalyticsServiceSetup;

    const savedObjectsClient = savedObjectsClientMock.create();
    savedObjectsClient.find.mockResolvedValue({
      saved_objects: [],
      total: 0,
      per_page: 20,
      page: 1,
    });

    subject = createDetectionRulesClient({
      actionsClient: actionsClientMock.create(),
      rulesClient,
      userProfile: userProfileServiceMock.createStart(),
      mlAuthz: buildMlAuthz(),
      rulesAuthz,
      savedObjectsClient,
      license: licenseMock.createLicenseMock(),
      productFeaturesService: createProductFeaturesServiceMock(),
      analytics,
    });
  });

  it('all-new disabled rules: single bulkCreateRules call, no conflicts', async () => {
    const ruleToImport = { ...getImportRulesSchemaMock(), enabled: false };
    rulesClient.bulkCreateRules.mockImplementationOnce(async (args) => ({
      successfulIds: args.rules.map((r) => (r.options as { id: string }).id),
      errors: [],
      total: args.rules.length,
    }));

    const { successes, errors } = await subject.importRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: false,
      rules: [ruleToImport],
    });

    expect(rulesClient.bulkCreateRules).toHaveBeenCalledTimes(1);
    const args = rulesClient.bulkCreateRules.mock.calls[0][0];
    expect(args.rules[0].data.enabled).toBe(false);
    expect(rulesClient.bulkUpdateRules).not.toHaveBeenCalled();
    expect(errors).toEqual([]);
    expect(successes).toEqual([
      expect.objectContaining({
        rule_id: ruleToImport.rule_id,
        telemetry: expect.objectContaining({
          type: 'query',
          rule_source: { type: 'internal' },
        }),
      }),
    ]);
  });

  it('all-new enabled rules: preserves enabled flag in single bulk call', async () => {
    const ruleToImport = { ...getImportRulesSchemaMock(), enabled: true };
    rulesClient.bulkCreateRules.mockImplementationOnce(async (args) => ({
      successfulIds: args.rules.map((r) => (r.options as { id: string }).id),
      errors: [],
      total: args.rules.length,
    }));

    await subject.importRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: false,
      rules: [ruleToImport],
    });

    const args = rulesClient.bulkCreateRules.mock.calls[0][0];
    expect(args.rules[0].data.enabled).toBe(true);
  });

  it('forwards the default batchSize to bulkCreateRules without splitting the input', async () => {
    const total = RULE_IMPORT_BATCH_SIZE + 1;
    const rules = Array.from({ length: total }, (_, i) => ({
      ...getImportRulesSchemaMock(),
      rule_id: `rule-${i}`,
    }));
    rulesClient.bulkCreateRules.mockImplementation(async (args) => ({
      successfulIds: args.rules.map((r) => (r.options as { id: string }).id),
      errors: [],
      total: args.rules.length,
    }));

    const { successes } = await subject.importRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: false,
      rules,
    });

    expect(findInstalledRulesBySignatureIds).toHaveBeenCalledTimes(1);
    expect(rulesClient.bulkCreateRules).toHaveBeenCalledTimes(1);
    expect(rulesClient.bulkCreateRules.mock.calls[0][0].rules).toHaveLength(total);
    expect(rulesClient.bulkCreateRules.mock.calls[0][0].batchSize).toBe(RULE_IMPORT_BATCH_SIZE);
    expect(successes).toHaveLength(total);
  });

  it('forwards an explicit batchSize to bulkCreateRules without outer chunking', async () => {
    const rules = [
      { ...getImportRulesSchemaMock(), rule_id: 'r1' },
      { ...getImportRulesSchemaMock(), rule_id: 'r2' },
      { ...getImportRulesSchemaMock(), rule_id: 'r3' },
    ];
    rulesClient.bulkCreateRules.mockImplementation(async (args) => ({
      successfulIds: args.rules.map((r) => (r.options as { id: string }).id),
      errors: [],
      total: args.rules.length,
    }));

    await subject.importRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: false,
      rules,
      batchSize: 2,
    });

    expect(findInstalledRulesBySignatureIds).toHaveBeenCalledTimes(1);
    expect(rulesClient.bulkCreateRules).toHaveBeenCalledTimes(1);
    expect(rulesClient.bulkCreateRules.mock.calls[0][0].rules).toHaveLength(3);
    expect(rulesClient.bulkCreateRules.mock.calls[0][0].batchSize).toBe(2);
  });

  it('mixed new+existing with overwriteRules:false reports conflict for existing', async () => {
    const r1 = { ...getImportRulesSchemaMock(), rule_id: 'new-rule' };
    const r2 = { ...getImportRulesSchemaMock(), rule_id: 'existing-rule' };

    (findInstalledRulesBySignatureIds as jest.Mock).mockResolvedValueOnce({
      'existing-rule': getRulesSchemaMock(),
    });
    rulesClient.bulkCreateRules.mockImplementationOnce(async (args) => ({
      successfulIds: args.rules.map((r) => (r.options as { id: string }).id),
      errors: [],
      total: args.rules.length,
    }));

    const { successes, errors } = await subject.importRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: false,
      rules: [r1, r2],
    });

    const conflicts = errors.filter((error) => error.error.type === 'conflict');
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].error.ruleId).toBe('existing-rule');
    expect(successes).toEqual([expect.objectContaining({ rule_id: 'new-rule' })]);
    expect(rulesClient.bulkCreateRules.mock.calls[0][0].rules).toHaveLength(1);
    expect(rulesClient.bulkUpdateRules).not.toHaveBeenCalled();
  });

  it('mixed new+existing with overwriteRules:true: existing rules are updated in place and surface as { rule_id }', async () => {
    const r1 = { ...getImportRulesSchemaMock(), rule_id: 'new-rule' };
    const r2 = { ...getImportRulesSchemaMock(), rule_id: 'existing-rule' };
    const existingRule = { ...getRulesSchemaMock(), rule_id: 'existing-rule' };

    (findInstalledRulesBySignatureIds as jest.Mock).mockResolvedValueOnce({
      'existing-rule': existingRule,
    });
    rulesClient.bulkUpdateRules.mockResolvedValueOnce({
      successfulIds: [existingRule.id],
      errors: [],
      total: 1,
    });
    rulesClient.bulkCreateRules.mockImplementationOnce(async (args) => ({
      successfulIds: args.rules.map((r) => (r.options as { id: string }).id),
      errors: [],
      total: args.rules.length,
    }));

    const { successes, errors } = await subject.importRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: true,
      rules: [r1, r2],
    });

    expect(rulesClient.bulkUpdateRules).toHaveBeenCalledTimes(1);
    expect(rulesClient.bulkUpdateRules).toHaveBeenCalledWith(
      expect.objectContaining({
        rules: [expect.objectContaining({ id: existingRule.id })],
        batchSize: RULE_IMPORT_BATCH_SIZE,
      })
    );
    expect(rulesClient.bulkCreateRules.mock.calls[0][0].rules).toHaveLength(1);
    expect(errors).toEqual([]);
    expect(successes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rule_id: 'existing-rule' }),
        expect.objectContaining({ rule_id: 'new-rule' }),
      ])
    );
  });

  it('per-row bulk error is re-paired to its source rule_id via uuid', async () => {
    const ruleToImport = getImportRulesSchemaMock();
    rulesClient.bulkCreateRules.mockImplementationOnce(async (args) => {
      const id = (args.rules[0].options as { id: string }).id;
      return {
        successfulIds: [],
        errors: [{ message: 'boom', status: 500, rule: { id, name: ruleToImport.name } }],
        total: 1,
      };
    });

    const { successes, errors } = await subject.importRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: false,
      rules: [ruleToImport],
    });

    expect(successes).toEqual([]);
    expect(errors).toHaveLength(1);
    expect(errors[0].error.ruleId).toBe(ruleToImport.rule_id);
    expect(errors[0].error.message).toBe('boom');
  });

  it('a thrown bulkCreateRules (whole-batch pre-check) surfaces as per-rule errors, not a rejection', async () => {
    const rules = [
      { ...getImportRulesSchemaMock(), rule_id: 'rule-1' },
      { ...getImportRulesSchemaMock(), rule_id: 'rule-2' },
    ];
    rulesClient.bulkCreateRules.mockRejectedValueOnce(new Error('unauthorized'));

    const { successes, errors } = await subject.importRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: false,
      rules,
    });

    expect(successes).toEqual([]);
    expect(errors).toHaveLength(2);
    expect(errors.map((e) => e.error.ruleId).sort()).toEqual(['rule-1', 'rule-2']);
    expect(errors.every((e) => e.error.message === 'unauthorized')).toBe(true);
  });

  it('forwards caller changeTracking to rulesClient.bulkUpdateRules verbatim on overwrite', async () => {
    const existingRule = { ...getRulesSchemaMock(), rule_id: 'existing-rule' };
    (findInstalledRulesBySignatureIds as jest.Mock).mockResolvedValueOnce({
      'existing-rule': existingRule,
    });
    rulesClient.bulkUpdateRules.mockResolvedValueOnce({
      successfulIds: [existingRule.id],
      errors: [],
      total: 1,
    });

    await subject.importRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: true,
      rules: [{ ...getImportRulesSchemaMock(), rule_id: 'existing-rule' }],
      changeTracking: {
        action: SecurityRuleChangeTrackingAction.ruleImport,
        metadata: { bulkCount: 4200 },
      },
    });

    expect(rulesClient.bulkUpdateRules).toHaveBeenCalledWith(
      expect.objectContaining({
        changeTracking: {
          action: SecurityRuleChangeTrackingAction.ruleImport,
          metadata: { bulkCount: 4200 },
        },
      })
    );
  });

  it('forwards caller changeTracking to rulesClient.bulkCreateRules verbatim', async () => {
    const rules = [
      { ...getImportRulesSchemaMock(), rule_id: 'rule-1' },
      { ...getImportRulesSchemaMock(), rule_id: 'rule-2' },
    ];
    rulesClient.bulkCreateRules.mockResolvedValueOnce({
      successfulIds: [],
      errors: [],
      total: 0,
    });

    await subject.importRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: false,
      rules,
      changeTracking: {
        action: SecurityRuleChangeTrackingAction.ruleImport,
        metadata: { bulkCount: 4200 },
      },
    });

    expect(rulesClient.bulkCreateRules).toHaveBeenCalledWith(
      expect.objectContaining({
        changeTracking: {
          action: SecurityRuleChangeTrackingAction.ruleImport,
          metadata: { bulkCount: 4200 },
        },
      })
    );
  });

  it('prebuilt rule without a version is rejected before any lookup', async () => {
    (fetchPrebuiltImportContext as jest.Mock).mockResolvedValueOnce({
      ...emptyPrebuiltContext(),
      availableRuleAssetIds: new Set([getImportRulesSchemaMock().rule_id]),
    });
    const ruleToImport = { ...getImportRulesSchemaMock(), version: undefined };

    const { successes, errors } = await subject.importRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: false,
      rules: [ruleToImport],
    });

    expect(successes).toEqual([]);
    expect(errors).toHaveLength(1);
    expect(errors[0].error.ruleId).toBe(ruleToImport.rule_id);
    expect(errors[0].error.message).toContain('version');
    expect(rulesClient.bulkCreateRules).not.toHaveBeenCalled();
  });

  it('surfaces an ML authz failure as a per-rule error and skips the rule', async () => {
    (buildMlAuthz().validateRuleType as jest.Mock).mockResolvedValueOnce({
      valid: false,
      message: 'ML auth failed',
    });

    const { successes, errors } = await subject.importRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: false,
      rules: [getImportRulesSchemaMock()],
    });

    expect(successes).toEqual([]);
    expect(errors).toHaveLength(1);
    expect(errors[0].error.message).toBe('ML auth failed');
    expect(rulesClient.bulkCreateRules).not.toHaveBeenCalled();
  });

  it('surfaces exception reference errors while still creating the rule', async () => {
    const ruleToImport = getImportRulesSchemaMock();
    (checkRuleExceptionReferences as jest.Mock).mockReturnValueOnce([
      [
        createRuleImportErrorObject({
          ruleId: ruleToImport.rule_id,
          message: 'missing exception list',
        }),
      ],
      [],
    ]);
    rulesClient.bulkCreateRules.mockImplementationOnce(async (args) => ({
      successfulIds: args.rules.map((r) => (r.options as { id: string }).id),
      errors: [],
      total: args.rules.length,
    }));

    const { successes, errors } = await subject.importRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: false,
      rules: [ruleToImport],
    });

    expect(errors).toHaveLength(1);
    expect(errors[0].error.message).toBe('missing exception list');
    expect(successes).toEqual([expect.objectContaining({ rule_id: ruleToImport.rule_id })]);
  });

  it('overwrite branch: a thrown bulkUpdateRules error is re-paired to the rule_id', async () => {
    const ruleToImport = { ...getImportRulesSchemaMock(), rule_id: 'existing-rule' };
    (findInstalledRulesBySignatureIds as jest.Mock).mockResolvedValueOnce({
      'existing-rule': { ...getRulesSchemaMock(), rule_id: 'existing-rule' },
    });
    rulesClient.bulkUpdateRules.mockRejectedValueOnce(new Error('kaboom'));

    const { successes, errors } = await subject.importRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: true,
      rules: [ruleToImport],
    });

    expect(successes).toEqual([]);
    expect(errors).toHaveLength(1);
    expect(errors[0].error.ruleId).toBe('existing-rule');
    expect(errors[0].error.message).toBe('kaboom');
  });

  it('overwrite branch: a per-row bulkUpdateRules error is re-paired to the rule_id', async () => {
    const existingRule = { ...getRulesSchemaMock(), rule_id: 'existing-rule' };
    (findInstalledRulesBySignatureIds as jest.Mock).mockResolvedValueOnce({
      'existing-rule': existingRule,
    });
    rulesClient.bulkUpdateRules.mockResolvedValueOnce({
      successfulIds: [],
      errors: [{ message: 'bad action', status: 400, rule: { id: existingRule.id, name: 'n' } }],
      total: 1,
    });

    const { successes, errors } = await subject.importRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: true,
      rules: [{ ...getImportRulesSchemaMock(), rule_id: 'existing-rule' }],
    });

    expect(successes).toEqual([]);
    expect(errors).toHaveLength(1);
    expect(errors[0].error.ruleId).toBe('existing-rule');
    expect(errors[0].error.message).toBe('bad action');
  });

  it('overwrite branch: persists the checked exceptions list, not the imported one', async () => {
    const danglingExceptionsList: ListArray = [
      { id: 'stale-id', list_id: 'missing-list', type: 'detection', namespace_type: 'single' },
    ];
    const checkedExceptionsList: ListArray = [
      { id: 'local-id', list_id: 'existing-list', type: 'detection', namespace_type: 'single' },
    ];
    const ruleToImport = {
      ...getImportRulesSchemaMock(),
      rule_id: 'existing-rule',
      exceptions_list: danglingExceptionsList,
    };

    const existingRule = { ...getRulesSchemaMock(), rule_id: 'existing-rule' };
    (findInstalledRulesBySignatureIds as jest.Mock).mockResolvedValueOnce({
      'existing-rule': existingRule,
    });
    (checkRuleExceptionReferences as jest.Mock).mockReturnValueOnce([[], checkedExceptionsList]);
    rulesClient.bulkUpdateRules.mockResolvedValueOnce({
      successfulIds: [existingRule.id],
      errors: [],
      total: 1,
    });

    const { successes, errors } = await subject.importRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: true,
      rules: [ruleToImport],
    });

    expect(errors).toEqual([]);
    expect(successes).toEqual([
      expect.objectContaining({
        rule_id: 'existing-rule',
        telemetry: {
          id: getRulesSchemaMock().id,
          type: 'query',
          rule_source: { type: 'internal' },
        },
      }),
    ]);
    expect(rulesClient.bulkUpdateRules).toHaveBeenCalledWith(
      expect.objectContaining({
        rules: [
          expect.objectContaining({
            data: expect.objectContaining({
              params: expect.objectContaining({ exceptionsList: checkedExceptionsList }),
            }),
          }),
        ],
      })
    );
  });

  it('a thrown prebuilt context fetch surfaces as per-rule errors, not a rejection', async () => {
    const rules = [
      { ...getImportRulesSchemaMock(), rule_id: 'rule-1' },
      { ...getImportRulesSchemaMock(), rule_id: 'rule-2' },
    ];
    (fetchPrebuiltImportContext as jest.Mock).mockRejectedValueOnce(new Error('search exploded'));

    const { successes, errors } = await subject.importRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: false,
      rules,
    });

    expect(successes).toEqual([]);
    expect(errors).toHaveLength(2);
    expect(errors.map((e) => e.error.ruleId).sort()).toEqual(['rule-1', 'rule-2']);
    expect(errors.every((e) => e.error.message === 'search exploded')).toBe(true);
    expect(rulesClient.bulkCreateRules).not.toHaveBeenCalled();
  });

  it('a thrown findInstalledRulesBySignatureIds surfaces as per-rule errors, not a rejection', async () => {
    const rules = [
      { ...getImportRulesSchemaMock(), rule_id: 'rule-1' },
      { ...getImportRulesSchemaMock(), rule_id: 'rule-2' },
    ];
    (findInstalledRulesBySignatureIds as jest.Mock).mockRejectedValueOnce(
      new Error('find exploded')
    );

    const { successes, errors } = await subject.importRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: false,
      rules,
    });

    expect(successes).toEqual([]);
    expect(errors).toHaveLength(2);
    expect(errors.map((e) => e.error.ruleId).sort()).toEqual(['rule-1', 'rule-2']);
    expect(errors.every((e) => e.error.message === 'find exploded')).toBe(true);
    expect(rulesClient.bulkCreateRules).not.toHaveBeenCalled();
  });

  it('returns empty result for empty input without calling alerting/prebuilt context', async () => {
    const result = await subject.importRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: false,
      rules: [],
    });

    expect(result).toEqual({ successes: [], errors: [] });
    expect(rulesClient.bulkCreateRules).not.toHaveBeenCalled();
    expect(fetchPrebuiltImportContext).not.toHaveBeenCalled();
    expect(findInstalledRulesBySignatureIds).not.toHaveBeenCalled();
    expect(analytics.reportEvent).not.toHaveBeenCalled();
  });

  it('emits detection_rule_import for a successful create', async () => {
    const ruleToImport = { ...getImportRulesSchemaMock(), enabled: false };
    rulesClient.bulkCreateRules.mockImplementationOnce(async (args) => ({
      successfulIds: args.rules.map((r) => (r.options as { id: string }).id),
      errors: [],
      total: args.rules.length,
    }));

    const { successes } = await subject.importRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: false,
      rules: [ruleToImport],
    });

    expect(successes).toHaveLength(1);
    expect(analytics.reportEvent).toHaveBeenCalledTimes(1);
    expect(analytics.reportEvent).toHaveBeenCalledWith(DETECTION_RULE_IMPORT_EVENT.eventType, {
      ruleId: successes[0].telemetry.id,
      ruleType: 'query',
      isPrebuilt: false,
      isCustomized: false,
    });
  });

  it('emits detection_rule_import for a successful overwrite', async () => {
    const existingRule = { ...getRulesSchemaMock(), rule_id: 'existing-rule' };
    (findInstalledRulesBySignatureIds as jest.Mock).mockResolvedValueOnce({
      'existing-rule': existingRule,
    });
    rulesClient.bulkUpdateRules.mockResolvedValueOnce({
      successfulIds: [existingRule.id],
      errors: [],
      total: 1,
    });

    await subject.importRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: true,
      rules: [{ ...getImportRulesSchemaMock(), rule_id: 'existing-rule' }],
    });

    expect(analytics.reportEvent).toHaveBeenCalledTimes(1);
    expect(analytics.reportEvent).toHaveBeenCalledWith(DETECTION_RULE_IMPORT_EVENT.eventType, {
      ruleId: existingRule.id,
      ruleType: 'query',
      isPrebuilt: false,
      isCustomized: false,
    });
  });

  it('does not emit for conflicts or failed creates', async () => {
    const existingRule = { ...getRulesSchemaMock(), rule_id: 'existing-rule' };
    (findInstalledRulesBySignatureIds as jest.Mock).mockResolvedValueOnce({
      'existing-rule': existingRule,
    });
    rulesClient.bulkCreateRules.mockImplementationOnce(async (args) => {
      const id = (args.rules[0].options as { id: string }).id;
      return {
        successfulIds: [],
        errors: [{ message: 'boom', status: 500, rule: { id, name: 'new-rule' } }],
        total: 1,
      };
    });

    await subject.importRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: false,
      rules: [
        { ...getImportRulesSchemaMock(), rule_id: 'new-rule' },
        { ...getImportRulesSchemaMock(), rule_id: 'existing-rule' },
      ],
    });

    expect(analytics.reportEvent).not.toHaveBeenCalled();
  });

  it('does not emit when bulkCreateRules throws or overwrite update throws', async () => {
    rulesClient.bulkCreateRules.mockRejectedValueOnce(new Error('unauthorized'));

    await subject.importRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: false,
      rules: [{ ...getImportRulesSchemaMock(), rule_id: 'rule-1' }],
    });

    expect(analytics.reportEvent).not.toHaveBeenCalled();

    (findInstalledRulesBySignatureIds as jest.Mock).mockResolvedValueOnce({
      'existing-rule': { ...getRulesSchemaMock(), rule_id: 'existing-rule' },
    });
    rulesClient.bulkUpdateRules.mockRejectedValueOnce(new Error('kaboom'));

    await subject.importRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: true,
      rules: [{ ...getImportRulesSchemaMock(), rule_id: 'existing-rule' }],
    });

    expect(analytics.reportEvent).not.toHaveBeenCalled();
  });

  it('overwrite branch: forwards allowMissingConnectorSecrets to bulkUpdateRules', async () => {
    const existingRule = { ...getRulesSchemaMock(), rule_id: 'existing-rule' };
    (findInstalledRulesBySignatureIds as jest.Mock).mockResolvedValueOnce({
      'existing-rule': existingRule,
    });
    rulesClient.bulkUpdateRules.mockResolvedValueOnce({
      successfulIds: [existingRule.id],
      errors: [],
      total: 1,
    });

    await subject.importRules({
      allowMissingConnectorSecrets: true,
      overwriteRules: true,
      rules: [{ ...getImportRulesSchemaMock(), rule_id: 'existing-rule' }],
    });

    expect(rulesClient.bulkUpdateRules).toHaveBeenCalledWith(
      expect.objectContaining({ allowMissingConnectorSecrets: true })
    );
  });

  it('overwrite branch: enable-only flip calls bulkEnableRules after a successful write', async () => {
    const existingRule = { ...getRulesSchemaMock(), rule_id: 'existing-rule', enabled: false };
    (findInstalledRulesBySignatureIds as jest.Mock).mockResolvedValueOnce({
      'existing-rule': existingRule,
    });
    rulesClient.bulkUpdateRules.mockResolvedValueOnce({
      successfulIds: [existingRule.id],
      errors: [],
      total: 1,
    });

    const { successes, errors } = await subject.importRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: true,
      rules: [{ ...getImportRulesSchemaMock(), rule_id: 'existing-rule', enabled: true }],
    });

    expect(errors).toEqual([]);
    expect(successes).toEqual([expect.objectContaining({ rule_id: 'existing-rule' })]);
    expect(rulesClient.bulkEnableRules).toHaveBeenCalledWith({ ids: [existingRule.id] });
    expect(rulesClient.bulkDisableRules).not.toHaveBeenCalled();
  });

  it('overwrite branch: a per-item enable failure is an error, not a success', async () => {
    const existingRule = { ...getRulesSchemaMock(), rule_id: 'existing-rule', enabled: false };
    (findInstalledRulesBySignatureIds as jest.Mock).mockResolvedValueOnce({
      'existing-rule': existingRule,
    });
    rulesClient.bulkUpdateRules.mockResolvedValueOnce({
      successfulIds: [existingRule.id],
      errors: [],
      total: 1,
    });
    rulesClient.bulkEnableRules.mockResolvedValueOnce({
      errors: [{ message: 'enable failed', rule: { id: existingRule.id, name: 'n' } }],
      rules: [],
      total: 1,
      taskIdsFailedToBeEnabled: [],
    });

    const { successes, errors } = await subject.importRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: true,
      rules: [{ ...getImportRulesSchemaMock(), rule_id: 'existing-rule', enabled: true }],
    });

    expect(successes).toEqual([]);
    expect(errors).toEqual([
      expect.objectContaining({
        error: expect.objectContaining({ ruleId: 'existing-rule', message: 'enable failed' }),
      }),
    ]);
  });

  it('overwrite branch: a Task Manager enable failure is an error, not a success', async () => {
    const existingRule = { ...getRulesSchemaMock(), rule_id: 'existing-rule', enabled: false };
    (findInstalledRulesBySignatureIds as jest.Mock).mockResolvedValueOnce({
      'existing-rule': existingRule,
    });
    rulesClient.bulkUpdateRules.mockResolvedValueOnce({
      successfulIds: [existingRule.id],
      errors: [],
      total: 1,
    });
    rulesClient.bulkEnableRules.mockResolvedValueOnce({
      errors: [],
      rules: [],
      total: 1,
      taskIdsFailedToBeEnabled: [existingRule.id],
    });

    const { successes, errors } = await subject.importRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: true,
      rules: [{ ...getImportRulesSchemaMock(), rule_id: 'existing-rule', enabled: true }],
    });

    expect(successes).toEqual([]);
    expect(errors).toEqual([
      expect.objectContaining({
        error: expect.objectContaining({
          ruleId: 'existing-rule',
          message: 'Failed to enable task',
        }),
      }),
    ]);
  });

  it('overwrite branch: a rejected bulk enable only fails its rules and continues disable and create', async () => {
    const toEnable = {
      ...getRulesSchemaMock(),
      id: 'enable-id',
      rule_id: 'enable-rule',
      enabled: false,
    };
    const toDisable = {
      ...getRulesSchemaMock(),
      id: 'disable-id',
      rule_id: 'disable-rule',
      enabled: true,
    };
    const unchanged = {
      ...getRulesSchemaMock(),
      id: 'unchanged-id',
      rule_id: 'unchanged-rule',
      enabled: true,
    };
    (findInstalledRulesBySignatureIds as jest.Mock).mockResolvedValueOnce({
      'enable-rule': toEnable,
      'disable-rule': toDisable,
      'unchanged-rule': unchanged,
    });
    rulesClient.bulkUpdateRules.mockResolvedValueOnce({
      successfulIds: [toEnable.id, toDisable.id, unchanged.id],
      errors: [],
      total: 3,
    });
    rulesClient.bulkEnableRules.mockRejectedValueOnce(new Error('enable exploded'));
    rulesClient.bulkCreateRules.mockImplementationOnce(async (args) => ({
      successfulIds: args.rules.map((rule) => (rule.options as { id: string }).id),
      errors: [],
      total: args.rules.length,
    }));

    const { successes, errors } = await subject.importRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: true,
      rules: [
        { ...getImportRulesSchemaMock(), rule_id: 'enable-rule', enabled: true },
        { ...getImportRulesSchemaMock(), rule_id: 'disable-rule', enabled: false },
        { ...getImportRulesSchemaMock(), rule_id: 'unchanged-rule', enabled: true },
        { ...getImportRulesSchemaMock(), rule_id: 'new-rule', enabled: false },
      ],
    });

    expect(rulesClient.bulkDisableRules).toHaveBeenCalledWith({ ids: [toDisable.id] });
    expect(rulesClient.bulkCreateRules).toHaveBeenCalledTimes(1);
    expect(successes.map(({ rule_id: ruleId }) => ruleId).sort()).toEqual([
      'disable-rule',
      'new-rule',
      'unchanged-rule',
    ]);
    expect(errors).toEqual([
      expect.objectContaining({
        error: expect.objectContaining({ ruleId: 'enable-rule', message: 'enable exploded' }),
      }),
    ]);
  });

  it('overwrite branch: a rejected bulk disable only fails its rules and preserves other work', async () => {
    const toEnable = {
      ...getRulesSchemaMock(),
      id: 'enable-id',
      rule_id: 'enable-rule',
      enabled: false,
    };
    const toDisable = {
      ...getRulesSchemaMock(),
      id: 'disable-id',
      rule_id: 'disable-rule',
      enabled: true,
    };
    const unchanged = {
      ...getRulesSchemaMock(),
      id: 'unchanged-id',
      rule_id: 'unchanged-rule',
      enabled: true,
    };
    (findInstalledRulesBySignatureIds as jest.Mock).mockResolvedValueOnce({
      'enable-rule': toEnable,
      'disable-rule': toDisable,
      'unchanged-rule': unchanged,
    });
    rulesClient.bulkUpdateRules.mockResolvedValueOnce({
      successfulIds: [toEnable.id, toDisable.id, unchanged.id],
      errors: [],
      total: 3,
    });
    rulesClient.bulkDisableRules.mockRejectedValueOnce(new Error('disable exploded'));
    rulesClient.bulkCreateRules.mockImplementationOnce(async (args) => ({
      successfulIds: args.rules.map((rule) => (rule.options as { id: string }).id),
      errors: [],
      total: args.rules.length,
    }));

    const { successes, errors } = await subject.importRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: true,
      rules: [
        { ...getImportRulesSchemaMock(), rule_id: 'enable-rule', enabled: true },
        { ...getImportRulesSchemaMock(), rule_id: 'disable-rule', enabled: false },
        { ...getImportRulesSchemaMock(), rule_id: 'unchanged-rule', enabled: true },
        { ...getImportRulesSchemaMock(), rule_id: 'new-rule', enabled: false },
      ],
    });

    expect(rulesClient.bulkEnableRules).toHaveBeenCalledWith({ ids: [toEnable.id] });
    expect(rulesClient.bulkCreateRules).toHaveBeenCalledTimes(1);
    expect(successes.map(({ rule_id: ruleId }) => ruleId).sort()).toEqual([
      'enable-rule',
      'new-rule',
      'unchanged-rule',
    ]);
    expect(errors).toEqual([
      expect.objectContaining({
        error: expect.objectContaining({ ruleId: 'disable-rule', message: 'disable exploded' }),
      }),
    ]);
  });
});
