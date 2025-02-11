/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rulesClientMock } from '@kbn/alerting-plugin/server/mocks';
import { actionsClientMock } from '@kbn/actions-plugin/server/actions_client/actions_client.mock';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';

import { buildMlAuthz } from '../../../../machine_learning/__mocks__/authz';
import { getImportRulesSchemaMock } from '../../../../../../common/api/detection_engine/rule_management/mocks';
import { getRulesSchemaMock } from '../../../../../../common/api/detection_engine/model/rule_schema/mocks';
import { ruleSourceImporterMock } from '../import/rule_source_importer/rule_source_importer.mock';
import { createDetectionRulesClient } from './detection_rules_client';
import { importRule } from './methods/import_rule';
import { createRuleImportErrorObject } from '../import/errors';
import { checkRuleExceptionReferences } from '../import/check_rule_exception_references';
import { licenseMock } from '@kbn/licensing-plugin/common/licensing.mock';
import type { ExperimentalFeatures } from '../../../../../../common';
import { createProductFeaturesServiceMock } from '../../../../product_features_service/mocks';

jest.mock('./methods/import_rule');
jest.mock('../import/check_rule_exception_references');

describe('detectionRulesClient.importRules', () => {
  let subject: ReturnType<typeof createDetectionRulesClient>;
  let ruleToImport: ReturnType<typeof getImportRulesSchemaMock>;
  let mockRuleSourceImporter: ReturnType<typeof ruleSourceImporterMock.create>;

  beforeEach(() => {
    subject = createDetectionRulesClient({
      actionsClient: actionsClientMock.create(),
      rulesClient: rulesClientMock.create(),
      mlAuthz: buildMlAuthz(),
      savedObjectsClient: savedObjectsClientMock.create(),
      license: licenseMock.createLicenseMock(),
      experimentalFeatures: { prebuiltRulesCustomizationEnabled: true } as ExperimentalFeatures,
      productFeaturesService: createProductFeaturesServiceMock(),
    });

    (checkRuleExceptionReferences as jest.Mock).mockReturnValue([[], []]);
    (importRule as jest.Mock).mockResolvedValue(getRulesSchemaMock());

    ruleToImport = getImportRulesSchemaMock();
    mockRuleSourceImporter = ruleSourceImporterMock.create();
    mockRuleSourceImporter.calculateRuleSource.mockReturnValue({
      ruleSource: { type: 'internal' },
      immutable: false,
    });
  });

  it('returns imported rules as RuleResponses if import was successful', async () => {
    const result = await subject.importRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: false,
      ruleSourceImporter: mockRuleSourceImporter,
      rules: [ruleToImport, ruleToImport],
    });

    expect(result).toEqual([getRulesSchemaMock(), getRulesSchemaMock()]);
  });

  it('returns an import error if rule import throws an import error', async () => {
    const importError = createRuleImportErrorObject({
      ruleId: 'rule-id',
      message: 'an error occurred',
    });
    (importRule as jest.Mock).mockReset().mockRejectedValueOnce(importError);

    const result = await subject.importRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: false,
      ruleSourceImporter: mockRuleSourceImporter,
      rules: [ruleToImport],
    });

    expect(result).toEqual([importError]);
  });

  it('returns a generic error if rule import throws unexpectedly', async () => {
    const genericError = new Error('an unexpected error occurred');
    (importRule as jest.Mock).mockReset().mockRejectedValueOnce(genericError);

    const result = await subject.importRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: false,
      ruleSourceImporter: mockRuleSourceImporter,
      rules: [ruleToImport],
    });

    expect(result).toEqual([
      expect.objectContaining({
        error: expect.objectContaining({
          message: 'an unexpected error occurred',
          ruleId: ruleToImport.rule_id,
          type: 'unknown',
        }),
      }),
    ]);
  });

  describe('when rule has no exception list references', () => {
    beforeEach(() => {
      (checkRuleExceptionReferences as jest.Mock).mockReset().mockReturnValueOnce([
        [
          createRuleImportErrorObject({
            ruleId: 'rule-id',
            message: 'list not found',
          }),
        ],
        [],
      ]);
    });

    it('returns both exception list reference errors and the imported rule if import succeeds', async () => {
      const result = await subject.importRules({
        allowMissingConnectorSecrets: false,
        overwriteRules: false,
        ruleSourceImporter: mockRuleSourceImporter,
        rules: [ruleToImport],
      });

      expect(result).toEqual([
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'list not found',
            ruleId: 'rule-id',
            type: 'unknown',
          }),
        }),
        getRulesSchemaMock(),
      ]);
    });

    it('returns both exception list reference errors and the imported rule if import throws an error', async () => {
      const importError = createRuleImportErrorObject({
        ruleId: 'rule-id',
        message: 'an error occurred',
      });
      (importRule as jest.Mock).mockReset().mockRejectedValueOnce(importError);

      const result = await subject.importRules({
        allowMissingConnectorSecrets: false,
        overwriteRules: false,
        ruleSourceImporter: mockRuleSourceImporter,
        rules: [ruleToImport],
      });

      expect(result).toEqual([
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'list not found',
            ruleId: 'rule-id',
            type: 'unknown',
          }),
        }),
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'an error occurred',
            ruleId: 'rule-id',
            type: 'unknown',
          }),
        }),
      ]);
    });
  });
});
