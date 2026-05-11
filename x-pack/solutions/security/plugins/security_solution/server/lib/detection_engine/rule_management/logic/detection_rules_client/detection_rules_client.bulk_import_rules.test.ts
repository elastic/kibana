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
import { __testing_escapeKql } from './methods/bulk_import_rules';
import { isRuleImportError } from '../import/errors';

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
      rules: [],
      errors: [],
      total: 0,
      taskIdsFailedToBeEnabled: [],
    });

    mockRuleSourceImporter = ruleSourceImporterMock.create();
    mockRuleSourceImporter.calculateRuleSource.mockReturnValue({
      ruleSource: { type: 'internal' },
      immutable: false,
    });
  });

  it('all-new disabled rules: single bulkCreateRules call, no findRules conflicts', async () => {
    const ruleToImport = { ...getImportRulesSchemaMock(), enabled: false };
    rulesClient.bulkCreateRules.mockResolvedValueOnce({
      rules: [getRuleMock(getQueryRuleParams())],
      errors: [],
      total: 1,
      taskIdsFailedToBeEnabled: [],
    });

    await subject.bulkImportRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: false,
      ruleSourceImporter: mockRuleSourceImporter,
      rules: [ruleToImport],
    });

    expect(rulesClient.bulkCreateRules).toHaveBeenCalledTimes(1);
    const args = rulesClient.bulkCreateRules.mock.calls[0][0];
    expect(args.rules[0].data.enabled).toBe(false);
    expect(importRule).not.toHaveBeenCalled();
  });

  it('all-new enabled rules: preserves enabled flag in single bulk call', async () => {
    const ruleToImport = { ...getImportRulesSchemaMock(), enabled: true };
    rulesClient.bulkCreateRules.mockResolvedValueOnce({
      rules: [getRuleMock(getQueryRuleParams())],
      errors: [],
      total: 1,
      taskIdsFailedToBeEnabled: [],
    });

    await subject.bulkImportRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: false,
      ruleSourceImporter: mockRuleSourceImporter,
      rules: [ruleToImport],
    });

    const args = rulesClient.bulkCreateRules.mock.calls[0][0];
    expect(args.rules[0].data.enabled).toBe(true);
  });

  it('mixed new+existing with overwriteRules:false reports conflict for existing', async () => {
    const r1 = { ...getImportRulesSchemaMock(), rule_id: 'new-rule' };
    const r2 = { ...getImportRulesSchemaMock(), rule_id: 'existing-rule' };

    (findRules as jest.Mock).mockResolvedValueOnce({
      data: [getRuleMock({ ...getQueryRuleParams(), ruleId: 'existing-rule' })],
    });
    rulesClient.bulkCreateRules.mockResolvedValueOnce({
      rules: [getRuleMock(getQueryRuleParams())],
      errors: [],
      total: 1,
      taskIdsFailedToBeEnabled: [],
    });

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

  it('mixed new+existing with overwriteRules:true: existing fall through to per-rule importRule', async () => {
    const r1 = { ...getImportRulesSchemaMock(), rule_id: 'new-rule' };
    const r2 = { ...getImportRulesSchemaMock(), rule_id: 'existing-rule' };

    (findRules as jest.Mock).mockResolvedValueOnce({
      data: [getRuleMock({ ...getQueryRuleParams(), ruleId: 'existing-rule' })],
    });
    rulesClient.bulkCreateRules.mockResolvedValueOnce({
      rules: [getRuleMock(getQueryRuleParams())],
      errors: [],
      total: 1,
      taskIdsFailedToBeEnabled: [],
    });

    await subject.bulkImportRules({
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
  });

  it('per-row bulk error is re-paired to its source rule_id via uuid', async () => {
    const ruleToImport = getImportRulesSchemaMock();
    rulesClient.bulkCreateRules.mockImplementationOnce(async (args) => {
      const id = (args.rules[0].options as { id: string }).id;
      return {
        rules: [],
        errors: [{ message: 'boom', status: 500, rule: { id, name: ruleToImport.name } }],
        total: 1,
        taskIdsFailedToBeEnabled: [],
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

  it('taskIdsFailedToBeEnabled surfaces as a per-rule warning (non-deferred mode)', async () => {
    const ruleToImport = { ...getImportRulesSchemaMock(), enabled: true };
    const created = getRuleMock(getQueryRuleParams());
    rulesClient.bulkCreateRules.mockImplementationOnce(async (args) => {
      const id = (args.rules[0].options as { id: string }).id;
      return {
        rules: [created],
        errors: [],
        total: 1,
        taskIdsFailedToBeEnabled: [id],
      };
    });

    const { responses } = await subject.bulkImportRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: false,
      ruleSourceImporter: mockRuleSourceImporter,
      rules: [ruleToImport],
    });

    expect(responses.length).toBeGreaterThanOrEqual(2);
    const warnings = responses.filter(
      (r) => isRuleImportError(r) && r.error.message.includes('task could not be enabled')
    );
    expect(warnings).toHaveLength(1);
    expect(isRuleImportError(warnings[0]) && warnings[0].error.ruleId).toBe(ruleToImport.rule_id);
  });

  it('skipTaskEnabling: passes flag through and returns pending task ids', async () => {
    const ruleToImport = { ...getImportRulesSchemaMock(), enabled: true };
    const created = getRuleMock(getQueryRuleParams());
    rulesClient.bulkCreateRules.mockImplementationOnce(async (args) => {
      const id = (args.rules[0].options as { id: string }).id;
      return {
        rules: [{ ...created, id }],
        errors: [],
        total: 1,
        taskIdsFailedToBeEnabled: [id],
      };
    });

    const { responses, taskIdsFailedToBeEnabled } = await subject.bulkImportRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: false,
      ruleSourceImporter: mockRuleSourceImporter,
      rules: [ruleToImport],
      skipTaskEnabling: true,
    });

    expect(rulesClient.bulkCreateRules.mock.calls[0][0].skipTaskEnabling).toBe(true);
    expect(taskIdsFailedToBeEnabled).toHaveLength(1);
    const warnings = responses.filter(
      (r) => isRuleImportError(r) && r.error.message.includes('task could not be enabled')
    );
    expect(warnings).toHaveLength(0);
  });

  it('returns empty result for empty input without calling alerting/findRules', async () => {
    const result = await subject.bulkImportRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: false,
      ruleSourceImporter: mockRuleSourceImporter,
      rules: [],
    });

    expect(result.responses).toEqual([]);
    expect(result.taskIdsFailedToBeEnabled).toEqual([]);
    expect(rulesClient.bulkCreateRules).not.toHaveBeenCalled();
    expect(findRules).not.toHaveBeenCalled();
  });
});

describe('bulk_import_rules KQL escape', () => {
  it('escapes backslashes', () => {
    expect(__testing_escapeKql('foo\\bar')).toBe('foo\\\\bar');
  });
  it('escapes double quotes', () => {
    expect(__testing_escapeKql('a"b')).toBe('a\\"b');
  });
  it('escapes both', () => {
    expect(__testing_escapeKql('a\\"b')).toBe('a\\\\\\"b');
  });
});
