/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rulesClientMock } from '@kbn/alerting-plugin/server/mocks';
import { actionsClientMock } from '@kbn/actions-plugin/server/actions_client/actions_client.mock';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { licenseMock } from '@kbn/licensing-plugin/common/licensing.mock';

import { buildMlAuthz } from '../../../../machine_learning/__mocks__/authz';
import { SecurityRuleChangeTrackingAction } from '../../../../../../common/detection_engine/rule_management/rule_change_tracking';
import { getImportRulesSchemaMock } from '../../../../../../common/api/detection_engine/rule_management/mocks';
import { getRulesSchemaMock } from '../../../../../../common/api/detection_engine/model/rule_schema/mocks';
import { getRuleMock } from '../../../routes/__mocks__/request_responses';
import { getQueryRuleParams } from '../../../rule_schema/mocks';
import { ruleSourceImporterMock } from '../import/rule_source_importer/rule_source_importer.mock';
import { createDetectionRulesClient } from './detection_rules_client';
import { importRule } from './methods/import_rule';
import { checkRuleExceptionReferences } from '../import/check_rule_exception_references';
import { findRules } from '../search/find_rules';
import { createProductFeaturesServiceMock } from '../../../../product_features_service/mocks';
import { getMockRulesAuthz } from '../../__mocks__/authz';
import { createRuleImportErrorObject, isRuleImportError } from '../import/errors';

jest.mock('./methods/import_rule');
jest.mock('../import/check_rule_exception_references');
jest.mock('../search/find_rules');

describe('detectionRulesClient.bulkImportRules', () => {
  let rulesClient: ReturnType<typeof rulesClientMock.create>;
  let subject: ReturnType<typeof createDetectionRulesClient>;
  let mockRuleSourceImporter: ReturnType<typeof ruleSourceImporterMock.create>;
  const rulesAuthz = getMockRulesAuthz();

  beforeEach(() => {
    (findRules as jest.Mock).mockReset();
    (importRule as jest.Mock).mockReset();
    rulesClient = rulesClientMock.create();
    subject = createDetectionRulesClient({
      actionsClient: actionsClientMock.create(),
      rulesClient,
      mlAuthz: buildMlAuthz(),
      rulesAuthz,
      savedObjectsClient: savedObjectsClientMock.create(),
      license: licenseMock.createLicenseMock(),
      productFeaturesService: createProductFeaturesServiceMock(),
    });

    (checkRuleExceptionReferences as jest.Mock).mockReturnValue([[], []]);
    (findRules as jest.Mock).mockResolvedValue({ data: [] });
    (importRule as jest.Mock).mockResolvedValue(getRulesSchemaMock());
    rulesClient.bulkCreateRules.mockResolvedValue({
      successfulIds: [],
      errors: [],
      total: 0,
    });

    mockRuleSourceImporter = ruleSourceImporterMock.create();
    mockRuleSourceImporter.calculateRuleSource.mockReturnValue({
      ruleSource: { type: 'internal' },
      immutable: false,
    });
  });

  it('all-new disabled rules: single bulkCreateRules call, no findRules conflicts', async () => {
    const ruleToImport = { ...getImportRulesSchemaMock(), enabled: false };
    rulesClient.bulkCreateRules.mockImplementationOnce(async (args) => ({
      successfulIds: args.rules.map((r) => (r.options as { id: string }).id),
      errors: [],
      total: args.rules.length,
    }));

    const { responses } = await subject.bulkImportRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: false,
      ruleSourceImporter: mockRuleSourceImporter,
      rules: [ruleToImport],
    });

    expect(rulesClient.bulkCreateRules).toHaveBeenCalledTimes(1);
    const args = rulesClient.bulkCreateRules.mock.calls[0][0];
    expect(args.rules[0].data.enabled).toBe(false);
    expect(importRule).not.toHaveBeenCalled();
    expect(responses).toEqual([{ rule_id: ruleToImport.rule_id }]);
  });

  it('all-new enabled rules: preserves enabled flag in single bulk call', async () => {
    const ruleToImport = { ...getImportRulesSchemaMock(), enabled: true };
    rulesClient.bulkCreateRules.mockImplementationOnce(async (args) => ({
      successfulIds: args.rules.map((r) => (r.options as { id: string }).id),
      errors: [],
      total: args.rules.length,
    }));

    await subject.bulkImportRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: false,
      ruleSourceImporter: mockRuleSourceImporter,
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

    const { responses } = await subject.bulkImportRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: false,
      ruleSourceImporter: mockRuleSourceImporter,
      rules,
    });

    expect(rulesClient.bulkCreateRules).toHaveBeenCalledTimes(1);
    expect(responses).toHaveLength(250);
  });

  it('mixed new+existing with overwriteRules:false reports conflict for existing', async () => {
    const r1 = { ...getImportRulesSchemaMock(), rule_id: 'new-rule' };
    const r2 = { ...getImportRulesSchemaMock(), rule_id: 'existing-rule' };

    (findRules as jest.Mock).mockResolvedValueOnce({
      data: [getRuleMock({ ...getQueryRuleParams(), ruleId: 'existing-rule' })],
    });
    rulesClient.bulkCreateRules.mockImplementationOnce(async (args) => ({
      successfulIds: args.rules.map((r) => (r.options as { id: string }).id),
      errors: [],
      total: args.rules.length,
    }));

    const { responses } = await subject.bulkImportRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: false,
      ruleSourceImporter: mockRuleSourceImporter,
      rules: [r1, r2],
    });

    const conflicts = responses.filter((r) => isRuleImportError(r) && r.error.type === 'conflict');
    expect(conflicts).toHaveLength(1);
    expect(isRuleImportError(conflicts[0]) && conflicts[0].error.ruleId).toBe('existing-rule');
    expect(rulesClient.bulkCreateRules.mock.calls[0][0].rules).toHaveLength(1);
    expect(importRule).not.toHaveBeenCalled();
  });

  it('mixed new+existing with overwriteRules:true: existing fall through to per-rule importRule and surface as { rule_id }', async () => {
    const r1 = { ...getImportRulesSchemaMock(), rule_id: 'new-rule' };
    const r2 = { ...getImportRulesSchemaMock(), rule_id: 'existing-rule' };

    (findRules as jest.Mock).mockResolvedValueOnce({
      data: [getRuleMock({ ...getQueryRuleParams(), ruleId: 'existing-rule' })],
    });
    (importRule as jest.Mock).mockResolvedValueOnce({
      ...getRulesSchemaMock(),
      rule_id: 'existing-rule',
    });
    rulesClient.bulkCreateRules.mockImplementationOnce(async (args) => ({
      successfulIds: args.rules.map((r) => (r.options as { id: string }).id),
      errors: [],
      total: args.rules.length,
    }));

    const { responses } = await subject.bulkImportRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: true,
      ruleSourceImporter: mockRuleSourceImporter,
      rules: [r1, r2],
    });

    expect(importRule).toHaveBeenCalledTimes(1);
    expect((importRule as jest.Mock).mock.calls[0][0].importRulePayload.ruleToImport.rule_id).toBe(
      'existing-rule'
    );
    expect(rulesClient.bulkCreateRules.mock.calls[0][0].rules).toHaveLength(1);
    expect(responses).toEqual(
      expect.arrayContaining([{ rule_id: 'existing-rule' }, { rule_id: 'new-rule' }])
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

    const { responses } = await subject.bulkImportRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: false,
      ruleSourceImporter: mockRuleSourceImporter,
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

    const { responses } = await subject.bulkImportRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: false,
      ruleSourceImporter: mockRuleSourceImporter,
      rules,
    });

    const errors = responses.filter(isRuleImportError);
    expect(errors).toHaveLength(2);
    expect(errors.map((e) => e.error.ruleId).sort()).toEqual(['rule-1', 'rule-2']);
    expect(errors.every((e) => e.error.message === 'unauthorized')).toBe(true);
  });

  it('forwards caller changeTracking to rulesClient.bulkCreateRules and forces ruleImport action', async () => {
    const rules = [
      { ...getImportRulesSchemaMock(), rule_id: 'rule-1' },
      { ...getImportRulesSchemaMock(), rule_id: 'rule-2' },
      { ...getImportRulesSchemaMock(), rule_id: 'rule-3' },
    ];
    rulesClient.bulkCreateRules.mockResolvedValueOnce({
      successfulIds: [],
      errors: [],
      total: 0,
    });

    // Caller supplies the pre-batching NDJSON count as bulkCount.
    const originalBulkCount = 4200;
    await subject.bulkImportRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: false,
      ruleSourceImporter: mockRuleSourceImporter,
      rules,
      changeTracking: { metadata: { bulkCount: originalBulkCount } },
    });

    expect(rulesClient.bulkCreateRules).toHaveBeenCalledWith(
      expect.objectContaining({
        changeTracking: {
          action: SecurityRuleChangeTrackingAction.ruleImport,
          metadata: { bulkCount: originalBulkCount },
        },
      })
    );
  });

  it('prebuilt rule without a version is rejected before any lookup', async () => {
    mockRuleSourceImporter.isPrebuiltRule.mockReturnValue(true);
    const ruleToImport = { ...getImportRulesSchemaMock(), version: undefined };

    const { responses } = await subject.bulkImportRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: false,
      ruleSourceImporter: mockRuleSourceImporter,
      rules: [ruleToImport],
    });

    const errors = responses.filter(isRuleImportError);
    expect(errors).toHaveLength(1);
    expect(errors[0].error.ruleId).toBe(ruleToImport.rule_id);
    expect(errors[0].error.message).toContain('version');
    expect(findRules).not.toHaveBeenCalled();
    expect(rulesClient.bulkCreateRules).not.toHaveBeenCalled();
  });

  it('surfaces an ML authz failure as a per-rule error and skips the rule', async () => {
    (buildMlAuthz().validateRuleType as jest.Mock).mockResolvedValueOnce({
      valid: false,
      message: 'ML auth failed',
    });

    const { responses } = await subject.bulkImportRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: false,
      ruleSourceImporter: mockRuleSourceImporter,
      rules: [getImportRulesSchemaMock()],
    });

    const errors = responses.filter(isRuleImportError);
    expect(errors).toHaveLength(1);
    expect(errors[0].error.message).toBe('ML auth failed');
    expect(findRules).not.toHaveBeenCalled();
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

    const { responses } = await subject.bulkImportRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: false,
      ruleSourceImporter: mockRuleSourceImporter,
      rules: [ruleToImport],
    });

    const errors = responses.filter(isRuleImportError);
    expect(errors).toHaveLength(1);
    expect(errors[0].error.message).toBe('missing exception list');
    expect(responses).toContainEqual({ rule_id: ruleToImport.rule_id });
  });

  it('overwrite branch: importRule returning an import error is surfaced', async () => {
    const ruleToImport = { ...getImportRulesSchemaMock(), rule_id: 'existing-rule' };
    (findRules as jest.Mock).mockResolvedValueOnce({
      data: [getRuleMock({ ...getQueryRuleParams(), ruleId: 'existing-rule' })],
    });
    (importRule as jest.Mock).mockResolvedValueOnce(
      createRuleImportErrorObject({ ruleId: 'existing-rule', message: 'overwrite failed' })
    );

    const { responses } = await subject.bulkImportRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: true,
      ruleSourceImporter: mockRuleSourceImporter,
      rules: [ruleToImport],
    });

    const errors = responses.filter(isRuleImportError);
    expect(errors).toHaveLength(1);
    expect(errors[0].error.ruleId).toBe('existing-rule');
    expect(errors[0].error.message).toBe('overwrite failed');
  });

  it('overwrite branch: a thrown importRule error is re-paired to the rule_id', async () => {
    const ruleToImport = { ...getImportRulesSchemaMock(), rule_id: 'existing-rule' };
    (findRules as jest.Mock).mockResolvedValueOnce({
      data: [getRuleMock({ ...getQueryRuleParams(), ruleId: 'existing-rule' })],
    });
    (importRule as jest.Mock).mockRejectedValueOnce(new Error('kaboom'));

    const { responses } = await subject.bulkImportRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: true,
      ruleSourceImporter: mockRuleSourceImporter,
      rules: [ruleToImport],
    });

    const errors = responses.filter(isRuleImportError);
    expect(errors).toHaveLength(1);
    expect(errors[0].error.ruleId).toBe('existing-rule');
    expect(errors[0].error.message).toBe('kaboom');
  });

  it('a thrown conflict lookup surfaces as per-rule errors, not a rejection', async () => {
    const rules = [
      { ...getImportRulesSchemaMock(), rule_id: 'rule-1' },
      { ...getImportRulesSchemaMock(), rule_id: 'rule-2' },
    ];
    (findRules as jest.Mock).mockRejectedValueOnce(new Error('search exploded'));

    const { responses } = await subject.bulkImportRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: false,
      ruleSourceImporter: mockRuleSourceImporter,
      rules,
    });

    const errors = responses.filter(isRuleImportError);
    expect(errors).toHaveLength(2);
    expect(errors.map((e) => e.error.ruleId).sort()).toEqual(['rule-1', 'rule-2']);
    expect(errors.every((e) => e.error.message === 'search exploded')).toBe(true);
    expect(rulesClient.bulkCreateRules).not.toHaveBeenCalled();
  });

  it('returns empty result for empty input without calling alerting/findRules', async () => {
    const result = await subject.bulkImportRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: false,
      ruleSourceImporter: mockRuleSourceImporter,
      rules: [],
    });

    expect(result.responses).toEqual([]);
    expect(rulesClient.bulkCreateRules).not.toHaveBeenCalled();
    expect(findRules).not.toHaveBeenCalled();
  });
});
