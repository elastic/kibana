/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { getImportRulesSchemaMock } from '../../../../../../common/api/detection_engine/rule_management/mocks';
import { getRulesSchemaMock } from '../../../../../../common/api/detection_engine/model/rule_schema/rule_response_schema.mock';
import { requestContextMock } from '../../../routes/__mocks__';

import { createRuleImportErrorObject } from './errors';

// eslint-disable-next-line no-restricted-imports
import { importRulesLegacy } from './import_rules_legacy';

describe('importRulesLegacy', () => {
  const { clients, context } = requestContextMock.createTools();
  const ruleToImport = getImportRulesSchemaMock();

  let savedObjectsClient: jest.Mocked<SavedObjectsClientContract>;

  beforeEach(() => {
    jest.clearAllMocks();

    savedObjectsClient = savedObjectsClientMock.create();
  });

  it('returns an empty rules response if no rules to import', async () => {
    const result = await importRulesLegacy({
      ruleChunks: [],
      overwriteRules: false,
      detectionRulesClient: context.securitySolution.getDetectionRulesClient(),
      savedObjectsClient,
    });

    expect(result).toEqual([]);
  });

  it('returns 409 error if DetectionRulesClient throws with 409 - existing rule', async () => {
    clients.detectionRulesClient.importRule.mockImplementationOnce(async () => {
      throw createRuleImportErrorObject({
        ruleId: ruleToImport.rule_id,
        type: 'conflict',
        message: `rule_id: "${ruleToImport.rule_id}" already exists`,
      });
    });

    const ruleChunk = [ruleToImport];
    const result = await importRulesLegacy({
      ruleChunks: [ruleChunk],
      overwriteRules: false,
      detectionRulesClient: context.securitySolution.getDetectionRulesClient(),
      savedObjectsClient,
    });

    expect(result).toEqual([
      {
        error: {
          message: `rule_id: "${ruleToImport.rule_id}" already exists`,
          status_code: 409,
        },
        rule_id: ruleToImport.rule_id,
      },
    ]);
  });

  it('creates rule if no matching existing rule found', async () => {
    clients.detectionRulesClient.importRule.mockResolvedValue({
      ...getRulesSchemaMock(),
      rule_id: ruleToImport.rule_id,
    });

    const ruleChunk = [ruleToImport];
    const result = await importRulesLegacy({
      ruleChunks: [ruleChunk],
      overwriteRules: false,
      detectionRulesClient: context.securitySolution.getDetectionRulesClient(),
      savedObjectsClient,
    });

    expect(result).toEqual([{ rule_id: ruleToImport.rule_id, status_code: 200 }]);
  });

  it('rejects a prebuilt rule specifying an immutable value of true', async () => {
    const prebuiltRuleToImport = {
      ...getImportRulesSchemaMock(),
      immutable: true,
      version: 1,
    };
    const result = await importRulesLegacy({
      ruleChunks: [[prebuiltRuleToImport]],
      overwriteRules: false,
      detectionRulesClient: context.securitySolution.getDetectionRulesClient(),
      savedObjectsClient,
    });

    expect(result).toEqual([
      {
        error: {
          message: `Importing prebuilt rules is not supported. To import this rule as a custom rule, first duplicate the rule and then export it. [rule_id: ${prebuiltRuleToImport.rule_id}]`,
          status_code: 400,
        },
        rule_id: prebuiltRuleToImport.rule_id,
      },
    ]);
  });
});
