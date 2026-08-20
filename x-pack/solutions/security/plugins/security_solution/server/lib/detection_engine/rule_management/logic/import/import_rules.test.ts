/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getImportRulesSchemaMock } from '../../../../../../common/api/detection_engine/rule_management/mocks';

import { importRules } from './import_rules';
import type { IDetectionRulesClient } from '../detection_rules_client/detection_rules_client_interface';
import { detectionRulesClientMock } from '../detection_rules_client/__mocks__/detection_rules_client';
import { createRuleImportErrorObject } from '../detection_rules_client/methods/import_rules/errors';
import { RULE_IMPORT_BULK_CREATE_BATCH_SIZE } from '../../api/constants';

describe('importRules', () => {
  let ruleToImport: ReturnType<typeof getImportRulesSchemaMock>;
  let detectionRulesClient: jest.Mocked<IDetectionRulesClient>;

  beforeEach(() => {
    jest.clearAllMocks();

    detectionRulesClient = detectionRulesClientMock.create();
    detectionRulesClient.importRules.mockResolvedValue({ responses: [] });
    ruleToImport = getImportRulesSchemaMock();
  });

  it('returns an empty rules response if no rules to import', async () => {
    const result = await importRules({
      rules: [],
      overwriteRules: false,
      detectionRulesClient,
    });

    expect(result).toEqual([]);
  });

  it('sends all rules within a single batch to one importRules call', async () => {
    const r1 = { ...ruleToImport, rule_id: 'r1' };
    const r2 = { ...ruleToImport, rule_id: 'r2' };
    const r3 = { ...ruleToImport, rule_id: 'r3' };

    detectionRulesClient.importRules.mockResolvedValueOnce({
      responses: [{ rule_id: 'r1' }, { rule_id: 'r2' }, { rule_id: 'r3' }],
    });

    const result = await importRules({
      rules: [r1, r2, r3],
      overwriteRules: false,
      detectionRulesClient,
    });

    expect(detectionRulesClient.importRules).toHaveBeenCalledTimes(1);
    const args = detectionRulesClient.importRules.mock.calls[0][0];
    expect(args.rules.map((r) => r.rule_id)).toEqual(['r1', 'r2', 'r3']);
    expect(result).toEqual([
      { rule_id: 'r1', status_code: 200 },
      { rule_id: 'r2', status_code: 200 },
      { rule_id: 'r3', status_code: 200 },
    ]);
  });

  it('chunks the outer loop at RULE_IMPORT_BULK_CREATE_BATCH_SIZE', async () => {
    const total = RULE_IMPORT_BULK_CREATE_BATCH_SIZE + 1;
    const manyRules = Array.from({ length: total }, (_, i) => ({
      ...ruleToImport,
      rule_id: `r${i}`,
    }));

    detectionRulesClient.importRules.mockResolvedValue({ responses: [] });

    await importRules({
      rules: manyRules,
      overwriteRules: false,
      detectionRulesClient,
    });

    expect(detectionRulesClient.importRules).toHaveBeenCalledTimes(2);
    const [first, second] = detectionRulesClient.importRules.mock.calls;
    expect(first[0].rules).toHaveLength(RULE_IMPORT_BULK_CREATE_BATCH_SIZE);
    expect(second[0].rules).toHaveLength(1);
  });

  it('maps per-rule errors from importRules to 4xx import responses', async () => {
    detectionRulesClient.importRules.mockResolvedValueOnce({
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
      rules: [ruleToImport],
      overwriteRules: false,
      detectionRulesClient,
    });

    expect(result).toEqual([
      { error: { message: 'boom', status_code: 400 }, rule_id: 'rule-a' },
      { rule_id: 'rule-b', status_code: 200 },
      { error: { message: 'conflict', status_code: 409 }, rule_id: 'rule-c' },
    ]);
  });
});
