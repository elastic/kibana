/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getImportRulesSchemaMock } from '../../../../../../common/api/detection_engine/rule_management/mocks';
import { getRulesSchemaMock } from '../../../../../../common/api/detection_engine/model/rule_schema/rule_response_schema.mock';

import { importRules } from './import_rules';
import type { IDetectionRulesClient } from '../detection_rules_client/detection_rules_client_interface';
import { detectionRulesClientMock } from '../detection_rules_client/__mocks__/detection_rules_client';
import { ruleSourceImporterMock } from './rule_source_importer/rule_source_importer.mock';
import { createRuleImportErrorObject } from './errors';

describe('importRules', () => {
  let ruleToImport: ReturnType<typeof getImportRulesSchemaMock>;

  let detectionRulesClient: jest.Mocked<IDetectionRulesClient>;
  let mockRuleSourceImporter: ReturnType<typeof ruleSourceImporterMock.create>;

  beforeEach(() => {
    jest.clearAllMocks();

    detectionRulesClient = detectionRulesClientMock.create();
    detectionRulesClient.importRules.mockResolvedValue([]);
    ruleToImport = getImportRulesSchemaMock();
    mockRuleSourceImporter = ruleSourceImporterMock.create();
  });

  it('returns an empty rules response if no rules to import', async () => {
    const result = await importRules({
      ruleChunks: [],
      overwriteRules: false,
      detectionRulesClient,
      ruleSourceImporter: mockRuleSourceImporter,
    });

    expect(result).toEqual([]);
  });

  it('returns 400 errors if client import returns generic errors', async () => {
    detectionRulesClient.importRules.mockResolvedValueOnce([
      createRuleImportErrorObject({
        ruleId: 'rule-id',
        message: 'import error',
      }),
      createRuleImportErrorObject({
        ruleId: 'rule-id-2',
        message: 'import error',
      }),
    ]);

    const result = await importRules({
      ruleChunks: [[ruleToImport]],
      overwriteRules: false,
      detectionRulesClient,
      ruleSourceImporter: mockRuleSourceImporter,
    });

    expect(result).toEqual([
      {
        error: {
          message: 'import error',
          status_code: 400,
        },
        rule_id: 'rule-id',
      },
      {
        error: {
          message: 'import error',
          status_code: 400,
        },
        rule_id: 'rule-id-2',
      },
    ]);
  });

  it('returns multiple errors for the same rule if client import returns generic errors', async () => {
    detectionRulesClient.importRules.mockResolvedValueOnce([
      createRuleImportErrorObject({
        ruleId: 'rule-id',
        message: 'import error',
      }),
      createRuleImportErrorObject({
        ruleId: 'rule-id',
        message: 'import error 2',
      }),
    ]);

    const result = await importRules({
      ruleChunks: [[ruleToImport]],
      overwriteRules: false,
      detectionRulesClient,
      ruleSourceImporter: mockRuleSourceImporter,
    });

    expect(result).toEqual([
      {
        error: {
          message: 'import error',
          status_code: 400,
        },
        rule_id: 'rule-id',
      },
      {
        error: {
          message: 'import error 2',
          status_code: 400,
        },
        rule_id: 'rule-id',
      },
    ]);
  });

  it('returns 409 errors if client import returns conflict errors', async () => {
    detectionRulesClient.importRules.mockResolvedValueOnce([
      createRuleImportErrorObject({
        ruleId: 'rule-id',
        message: 'import conflict',
        type: 'conflict',
      }),
      createRuleImportErrorObject({
        ruleId: 'rule-id-2',
        message: 'import conflict',
        type: 'conflict',
      }),
    ]);

    const result = await importRules({
      ruleChunks: [[ruleToImport]],
      overwriteRules: false,
      detectionRulesClient,
      ruleSourceImporter: mockRuleSourceImporter,
    });

    expect(result).toEqual([
      {
        error: {
          message: 'import conflict',
          status_code: 409,
        },
        rule_id: 'rule-id',
      },
      {
        error: {
          message: 'import conflict',
          status_code: 409,
        },
        rule_id: 'rule-id-2',
      },
    ]);
  });

  it('returns a combination of 200s and 4xxs if some rules were imported and some errored', async () => {
    detectionRulesClient.importRules.mockResolvedValueOnce([
      createRuleImportErrorObject({
        ruleId: 'rule-id',
        message: 'parse error',
      }),
      getRulesSchemaMock(),
      createRuleImportErrorObject({
        ruleId: 'rule-id-2',
        message: 'import conflict',
        type: 'conflict',
      }),
      getRulesSchemaMock(),
    ]);
    const successfulRuleId = getRulesSchemaMock().rule_id;

    const result = await importRules({
      ruleChunks: [[ruleToImport]],
      overwriteRules: false,
      detectionRulesClient,
      ruleSourceImporter: mockRuleSourceImporter,
    });

    expect(result).toEqual([
      {
        error: {
          message: 'parse error',
          status_code: 400,
        },
        rule_id: 'rule-id',
      },
      { rule_id: successfulRuleId, status_code: 200 },
      {
        error: {
          message: 'import conflict',
          status_code: 409,
        },
        rule_id: 'rule-id-2',
      },
      { rule_id: successfulRuleId, status_code: 200 },
    ]);
  });

  it('returns 200s if all rules were imported successfully', async () => {
    detectionRulesClient.importRules.mockResolvedValueOnce([
      getRulesSchemaMock(),
      getRulesSchemaMock(),
    ]);
    const successfulRuleId = getRulesSchemaMock().rule_id;

    const result = await importRules({
      ruleChunks: [[ruleToImport]],
      overwriteRules: false,
      detectionRulesClient,
      ruleSourceImporter: mockRuleSourceImporter,
    });

    expect(result).toEqual([
      { rule_id: successfulRuleId, status_code: 200 },
      { rule_id: successfulRuleId, status_code: 200 },
    ]);
  });

  describe('bulk path (bulkCreateRulesEnabled)', () => {
    const experimentalFeatures = { bulkCreateRulesEnabled: true } as never;

    it('flattens all chunks into a single bulkImportRules call (no skipTaskEnabling, no bulkEnableTasks follow-up)', async () => {
      const r1 = { ...ruleToImport, rule_id: 'r1' };
      const r2 = { ...ruleToImport, rule_id: 'r2' };
      const r3 = { ...ruleToImport, rule_id: 'r3' };

      detectionRulesClient.bulkImportRules.mockResolvedValueOnce({
        responses: [{ rule_id: 'r1' }, { rule_id: 'r2' }, { rule_id: 'r3' }],
      });

      const result = await importRules({
        ruleChunks: [[r1, r2], [r3]],
        overwriteRules: false,
        detectionRulesClient,
        ruleSourceImporter: mockRuleSourceImporter,
        experimentalFeatures,
      });

      expect(detectionRulesClient.bulkImportRules).toHaveBeenCalledTimes(1);
      const args = detectionRulesClient.bulkImportRules.mock.calls[0][0];
      expect(args).not.toHaveProperty('skipTaskEnabling');
      expect(args.rules.map((r) => r.rule_id)).toEqual(['r1', 'r2', 'r3']);
      expect(result).toEqual([
        { rule_id: 'r1', status_code: 200 },
        { rule_id: 'r2', status_code: 200 },
        { rule_id: 'r3', status_code: 200 },
      ]);
    });

    it('maps per-rule errors from bulkImportRules to 4xx import responses', async () => {
      detectionRulesClient.bulkImportRules.mockResolvedValueOnce({
        responses: [
          createRuleImportErrorObject({ ruleId: 'rule-a', message: 'boom' }),
          { rule_id: 'rule-b' },
          createRuleImportErrorObject({
            ruleId: 'rule-c',
            message: 'conflict',
            type: 'conflict',
          }),
        ],
      });

      const result = await importRules({
        ruleChunks: [[ruleToImport]],
        overwriteRules: false,
        detectionRulesClient,
        ruleSourceImporter: mockRuleSourceImporter,
        experimentalFeatures,
      });

      expect(result).toEqual([
        { error: { message: 'boom', status_code: 400 }, rule_id: 'rule-a' },
        { rule_id: 'rule-b', status_code: 200 },
        { error: { message: 'conflict', status_code: 409 }, rule_id: 'rule-c' },
      ]);
    });
  });
});
