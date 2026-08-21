/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { userProfileServiceMock } from '@kbn/core-user-profile-server-mocks';
import { rulesClientMock } from '@kbn/alerting-plugin/server/mocks';
import { actionsClientMock } from '@kbn/actions-plugin/server/actions_client/actions_client.mock';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { licenseMock } from '@kbn/licensing-plugin/common/licensing.mock';

import { buildMlAuthz } from '../../../../machine_learning/__mocks__/authz';
import { SecurityRuleChangeTrackingAction } from '../../../../../../common/detection_engine/rule_management/rule_change_tracking';
import { getImportRulesSchemaMock } from '../../../../../../common/api/detection_engine/rule_management/mocks';
import { getRulesSchemaMock } from '../../../../../../common/api/detection_engine/model/rule_schema/mocks';
import { createDetectionRulesClient } from './detection_rules_client';
import { checkRuleExceptionReferences } from '../import/check_rule_exception_references';
import { fetchPrebuiltImportContext } from '../import/fetch_prebuilt_import_context';
import { findInstalledRulesByRuleIds } from '../import/find_installed_rules_by_rule_ids';
import { createProductFeaturesServiceMock } from '../../../../product_features_service/mocks';
import { getMockRulesAuthz } from '../../__mocks__/authz';
import { createRuleImportErrorObject, isRuleImportError } from '../import/errors';
import { RULE_IMPORT_BATCH_SIZE } from '../../api/constants';
import { getChanges } from './methods/utils/get_changes';

jest.mock('../import/check_rule_exception_references');
jest.mock('../import/fetch_prebuilt_import_context');
jest.mock('../import/find_installed_rules_by_rule_ids');
jest.mock('./methods/utils/get_changes', () => {
  const actual = jest.requireActual('./methods/utils/get_changes');
  return { ...actual, getChanges: jest.fn(actual.getChanges) };
});

const emptyPrebuiltContext = () => ({
  matchingAssetsByRuleId: {},
  availableRuleAssetIds: new Set<string>(),
});

describe('detectionRulesClient.importRules', () => {
  let rulesClient: ReturnType<typeof rulesClientMock.create>;
  let subject: ReturnType<typeof createDetectionRulesClient>;
  const rulesAuthz = getMockRulesAuthz();

  beforeEach(() => {
    jest.clearAllMocks();
    (checkRuleExceptionReferences as jest.Mock).mockReturnValue([[], []]);
    (fetchPrebuiltImportContext as jest.Mock).mockResolvedValue(emptyPrebuiltContext());
    (findInstalledRulesByRuleIds as jest.Mock).mockResolvedValue({});

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
      rules: [],
      errors: [],
      total: 0,
      taskIdsFailedToBeEnabled: [],
    });
    rulesClient.bulkDisableRules.mockResolvedValue({
      rules: [],
      errors: [],
      total: 0,
    });

    subject = createDetectionRulesClient({
      actionsClient: actionsClientMock.create(),
      rulesClient,
      userProfile: userProfileServiceMock.createStart(),
      mlAuthz: buildMlAuthz(),
      rulesAuthz,
      savedObjectsClient: savedObjectsClientMock.create(),
      license: licenseMock.createLicenseMock(),
      productFeaturesService: createProductFeaturesServiceMock(),
    });
  });

  it('all-new disabled rules: single bulkCreateRules call, no conflicts', async () => {
    const ruleToImport = { ...getImportRulesSchemaMock(), enabled: false };
    rulesClient.bulkCreateRules.mockImplementationOnce(async (args) => ({
      successfulIds: args.rules.map((r) => (r.options as { id: string }).id),
      errors: [],
      total: args.rules.length,
    }));

    const { responses } = await subject.importRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: false,
      rules: [ruleToImport],
    });

    expect(rulesClient.bulkCreateRules).toHaveBeenCalledTimes(1);
    const args = rulesClient.bulkCreateRules.mock.calls[0][0];
    expect(args.rules[0].data.enabled).toBe(false);
    expect(rulesClient.bulkUpdateRules).not.toHaveBeenCalled();
    expect(responses).toEqual([{ rule_id: ruleToImport.rule_id }]);
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

  it('issues a single bulkCreateRules call regardless of input size (alerting batches internally)', async () => {
    const rules = Array.from({ length: 250 }, (_, i) => ({
      ...getImportRulesSchemaMock(),
      rule_id: `rule-${i}`,
    }));
    rulesClient.bulkCreateRules.mockImplementationOnce(async (args) => ({
      successfulIds: args.rules.map((r) => (r.options as { id: string }).id),
      errors: [],
      total: args.rules.length,
    }));

    const { responses } = await subject.importRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: false,
      rules,
    });

    expect(rulesClient.bulkCreateRules).toHaveBeenCalledTimes(1);
    expect(responses).toHaveLength(250);
  });

  it('mixed new+existing with overwriteRules:false reports conflict for existing', async () => {
    const r1 = { ...getImportRulesSchemaMock(), rule_id: 'new-rule' };
    const r2 = { ...getImportRulesSchemaMock(), rule_id: 'existing-rule' };

    (findInstalledRulesByRuleIds as jest.Mock).mockResolvedValueOnce({
      'existing-rule': getRulesSchemaMock(),
    });
    rulesClient.bulkCreateRules.mockImplementationOnce(async (args) => ({
      successfulIds: args.rules.map((r) => (r.options as { id: string }).id),
      errors: [],
      total: args.rules.length,
    }));

    const { responses } = await subject.importRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: false,
      rules: [r1, r2],
    });

    const conflicts = responses.filter((r) => isRuleImportError(r) && r.error.type === 'conflict');
    expect(conflicts).toHaveLength(1);
    expect(isRuleImportError(conflicts[0]) && conflicts[0].error.ruleId).toBe('existing-rule');
    expect(rulesClient.bulkCreateRules.mock.calls[0][0].rules).toHaveLength(1);
    expect(rulesClient.bulkUpdateRules).not.toHaveBeenCalled();
  });

  it('mixed new+existing with overwriteRules:true: existing go through bulkUpdateRules and surface as { rule_id }', async () => {
    const r1 = { ...getImportRulesSchemaMock(), rule_id: 'new-rule' };
    const r2 = { ...getImportRulesSchemaMock(), rule_id: 'existing-rule' };
    const existing = { ...getRulesSchemaMock(), rule_id: 'existing-rule', id: 'existing-id' };

    (findInstalledRulesByRuleIds as jest.Mock).mockResolvedValueOnce({
      'existing-rule': existing,
    });
    rulesClient.bulkUpdateRules.mockImplementationOnce(async (args) => ({
      successfulIds: args.rules.map((r) => r.id),
      errors: [],
      total: args.rules.length,
    }));
    rulesClient.bulkCreateRules.mockImplementationOnce(async (args) => ({
      successfulIds: args.rules.map((r) => (r.options as { id: string }).id),
      errors: [],
      total: args.rules.length,
    }));

    const { responses } = await subject.importRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: true,
      rules: [r1, r2],
    });

    expect(rulesClient.bulkUpdateRules).toHaveBeenCalledTimes(1);
    expect(rulesClient.bulkUpdateRules.mock.calls[0][0].rules).toHaveLength(1);
    expect(rulesClient.bulkUpdateRules.mock.calls[0][0].rules[0].id).toBe('existing-id');
    expect(rulesClient.bulkUpdateRules.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        batchSize: RULE_IMPORT_BATCH_SIZE,
      })
    );
    expect(rulesClient.bulkCreateRules.mock.calls[0][0].rules).toHaveLength(1);
    expect(responses).toEqual(
      expect.arrayContaining([{ rule_id: 'existing-rule' }, { rule_id: 'new-rule' }])
    );
  });

  it('overwrite of an unchanged rule skips bulkUpdateRules and still returns { rule_id }', async () => {
    const ruleToImport = { ...getImportRulesSchemaMock(), rule_id: 'existing-rule' };
    const existing = { ...getRulesSchemaMock(), rule_id: 'existing-rule', id: 'existing-id' };
    (findInstalledRulesByRuleIds as jest.Mock).mockResolvedValueOnce({
      'existing-rule': existing,
    });
    (getChanges as jest.Mock).mockReturnValueOnce([]);

    const { responses } = await subject.importRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: true,
      rules: [ruleToImport],
    });

    expect(rulesClient.bulkUpdateRules).not.toHaveBeenCalled();
    expect(responses).toEqual([{ rule_id: 'existing-rule' }]);
  });

  it('overwrite that only flips enabled skips the write and still calls bulkEnableRules', async () => {
    const ruleToImport = {
      ...getImportRulesSchemaMock(),
      rule_id: 'existing-rule',
      enabled: true,
    };
    const existing = {
      ...getRulesSchemaMock(),
      rule_id: 'existing-rule',
      id: 'existing-id',
      enabled: false,
    };
    (findInstalledRulesByRuleIds as jest.Mock).mockResolvedValueOnce({
      'existing-rule': existing,
    });
    (getChanges as jest.Mock).mockReturnValueOnce([]);

    const { responses } = await subject.importRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: true,
      rules: [ruleToImport],
    });

    expect(rulesClient.bulkUpdateRules).not.toHaveBeenCalled();
    expect(rulesClient.bulkEnableRules).toHaveBeenCalledWith({ ids: ['existing-id'] });
    expect(responses).toEqual([{ rule_id: 'existing-rule' }]);
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

    const { responses } = await subject.importRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: false,
      rules: [ruleToImport],
    });

    const errors = responses.filter(isRuleImportError);
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

    const { responses } = await subject.importRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: false,
      rules,
    });

    const errors = responses.filter(isRuleImportError);
    expect(errors).toHaveLength(2);
    expect(errors.map((e) => e.error.ruleId).sort()).toEqual(['rule-1', 'rule-2']);
    expect(errors.every((e) => e.error.message === 'unauthorized')).toBe(true);
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

    const { responses } = await subject.importRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: false,
      rules: [ruleToImport],
    });

    const errors = responses.filter(isRuleImportError);
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

    const { responses } = await subject.importRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: false,
      rules: [getImportRulesSchemaMock()],
    });

    const errors = responses.filter(isRuleImportError);
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

    const { responses } = await subject.importRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: false,
      rules: [ruleToImport],
    });

    const errors = responses.filter(isRuleImportError);
    expect(errors).toHaveLength(1);
    expect(errors[0].error.message).toBe('missing exception list');
    expect(responses).toContainEqual({ rule_id: ruleToImport.rule_id });
  });

  it('overwrite branch: per-row bulkUpdateRules error is re-paired to its source rule_id', async () => {
    const ruleToImport = { ...getImportRulesSchemaMock(), rule_id: 'existing-rule' };
    const existing = { ...getRulesSchemaMock(), rule_id: 'existing-rule', id: 'existing-id' };
    (findInstalledRulesByRuleIds as jest.Mock).mockResolvedValueOnce({
      'existing-rule': existing,
    });
    rulesClient.bulkUpdateRules.mockResolvedValueOnce({
      successfulIds: [],
      errors: [
        {
          message: 'overwrite failed',
          status: 500,
          rule: { id: 'existing-id', name: existing.name },
        },
      ],
      total: 1,
    });

    const { responses } = await subject.importRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: true,
      rules: [ruleToImport],
    });

    const errors = responses.filter(isRuleImportError);
    expect(errors).toHaveLength(1);
    expect(errors[0].error.ruleId).toBe('existing-rule');
    expect(errors[0].error.message).toBe('overwrite failed');
    expect(rulesClient.bulkCreateRules).not.toHaveBeenCalled();
  });

  it('overwrite branch: a thrown bulkUpdateRules (whole-batch pre-check) surfaces as per-rule errors, not a rejection', async () => {
    const ruleToImport = { ...getImportRulesSchemaMock(), rule_id: 'existing-rule' };
    (findInstalledRulesByRuleIds as jest.Mock).mockResolvedValueOnce({
      'existing-rule': { ...getRulesSchemaMock(), rule_id: 'existing-rule', id: 'existing-id' },
    });
    rulesClient.bulkUpdateRules.mockRejectedValueOnce(new Error('kaboom'));

    const { responses } = await subject.importRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: true,
      rules: [ruleToImport],
    });

    const errors = responses.filter(isRuleImportError);
    expect(errors).toHaveLength(1);
    expect(errors[0].error.ruleId).toBe('existing-rule');
    expect(errors[0].error.message).toBe('kaboom');
  });

  it('overwrite branch: forwards caller changeTracking to bulkUpdateRules and honors enabled via bulkEnable/bulkDisable', async () => {
    const ruleToImport = {
      ...getImportRulesSchemaMock(),
      rule_id: 'existing-rule',
      enabled: true,
    };
    const existing = {
      ...getRulesSchemaMock(),
      rule_id: 'existing-rule',
      id: 'existing-id',
      enabled: false,
    };
    (findInstalledRulesByRuleIds as jest.Mock).mockResolvedValueOnce({
      'existing-rule': existing,
    });
    rulesClient.bulkUpdateRules.mockImplementationOnce(async (args) => ({
      successfulIds: args.rules.map((r) => r.id),
      errors: [],
      total: args.rules.length,
    }));

    const { responses } = await subject.importRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: true,
      rules: [ruleToImport],
      changeTracking: {
        action: SecurityRuleChangeTrackingAction.ruleImport,
        metadata: { bulkCount: 12 },
      },
    });

    expect(responses).toEqual([{ rule_id: 'existing-rule' }]);
    expect(rulesClient.bulkUpdateRules).toHaveBeenCalledWith(
      expect.objectContaining({
        changeTracking: {
          action: SecurityRuleChangeTrackingAction.ruleImport,
          metadata: { bulkCount: 12 },
        },
      })
    );
    expect(rulesClient.bulkEnableRules).toHaveBeenCalledWith({ ids: ['existing-id'] });
    expect(rulesClient.bulkDisableRules).not.toHaveBeenCalled();
  });

  it('overwrite branch: a per-item bulkEnableRules error is the only result for that rule_id', async () => {
    const ruleToImport = {
      ...getImportRulesSchemaMock(),
      rule_id: 'existing-rule',
      enabled: true,
    };
    const existing = {
      ...getRulesSchemaMock(),
      rule_id: 'existing-rule',
      id: 'existing-id',
      enabled: false,
    };
    (findInstalledRulesByRuleIds as jest.Mock).mockResolvedValueOnce({
      'existing-rule': existing,
    });
    rulesClient.bulkUpdateRules.mockResolvedValueOnce({
      successfulIds: ['existing-id'],
      errors: [],
      total: 1,
    });
    rulesClient.bulkEnableRules.mockResolvedValueOnce({
      rules: [],
      errors: [
        {
          message: 'enable failed',
          status: 500,
          rule: { id: 'existing-id', name: existing.name },
        },
      ],
      total: 1,
      taskIdsFailedToBeEnabled: [],
    });

    const { responses } = await subject.importRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: true,
      rules: [ruleToImport],
    });

    const errors = responses.filter(isRuleImportError);
    expect(errors).toHaveLength(1);
    expect(errors[0].error.ruleId).toBe('existing-rule');
    expect(errors[0].error.message).toBe('enable failed');
    expect(responses).not.toContainEqual({ rule_id: 'existing-rule' });
  });

  it('a thrown prebuilt context fetch surfaces as per-rule errors, not a rejection', async () => {
    const rules = [
      { ...getImportRulesSchemaMock(), rule_id: 'rule-1' },
      { ...getImportRulesSchemaMock(), rule_id: 'rule-2' },
    ];
    (fetchPrebuiltImportContext as jest.Mock).mockRejectedValueOnce(new Error('search exploded'));

    const { responses } = await subject.importRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: false,
      rules,
    });

    const errors = responses.filter(isRuleImportError);
    expect(errors).toHaveLength(2);
    expect(errors.map((e) => e.error.ruleId).sort()).toEqual(['rule-1', 'rule-2']);
    expect(errors.every((e) => e.error.message === 'search exploded')).toBe(true);
    expect(rulesClient.bulkCreateRules).not.toHaveBeenCalled();
  });

  it('a thrown findInstalledRulesByRuleIds surfaces as per-rule errors, not a rejection', async () => {
    const rules = [
      { ...getImportRulesSchemaMock(), rule_id: 'rule-1' },
      { ...getImportRulesSchemaMock(), rule_id: 'rule-2' },
    ];
    (findInstalledRulesByRuleIds as jest.Mock).mockRejectedValueOnce(new Error('find exploded'));

    const { responses } = await subject.importRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: false,
      rules,
    });

    const errors = responses.filter(isRuleImportError);
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

    expect(result.responses).toEqual([]);
    expect(rulesClient.bulkCreateRules).not.toHaveBeenCalled();
    expect(fetchPrebuiltImportContext).not.toHaveBeenCalled();
    expect(findInstalledRulesByRuleIds).not.toHaveBeenCalled();
  });
});
