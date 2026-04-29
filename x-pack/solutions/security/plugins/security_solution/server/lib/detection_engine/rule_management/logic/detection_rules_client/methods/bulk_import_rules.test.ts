/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rulesClientMock } from '@kbn/alerting-plugin/server/mocks';
import { actionsClientMock } from '@kbn/actions-plugin/server/actions_client/actions_client.mock';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';

import { buildMlAuthz } from '../../../../../machine_learning/__mocks__/authz';
import { getImportRulesSchemaMock } from '../../../../../../../common/api/detection_engine/rule_management/mocks';
import { getRulesSchemaMock } from '../../../../../../../common/api/detection_engine/model/rule_schema/mocks';
import { ruleSourceImporterMock } from '../../import/rule_source_importer/rule_source_importer.mock';
import { findRules } from '../../search/find_rules';
import { checkRuleExceptionReferences } from '../../import/check_rule_exception_references';
import { createRuleImportErrorObject } from '../../import/errors';
import { convertAlertingRuleToRuleResponse } from '../converters/convert_alerting_rule_to_rule_response';
import { convertRuleResponseToAlertingRule } from '../converters/convert_rule_response_to_alerting_rule';
import { applyRuleDefaults } from '../mergers/apply_rule_defaults';
import { detectionRulesClientMock } from '../__mocks__/detection_rules_client';
import { bulkImportRules } from './bulk_import_rules';

jest.mock('../../search/find_rules');
jest.mock('../../import/check_rule_exception_references');
jest.mock('../../import/gather_referenced_exceptions', () => ({
  getReferencedExceptionLists: jest.fn().mockResolvedValue([]),
}));
jest.mock('../converters/convert_alerting_rule_to_rule_response');
jest.mock('../converters/convert_rule_response_to_alerting_rule');
jest.mock('../mergers/apply_rule_defaults');

const mockFindRulesEmpty = () => {
  (findRules as jest.Mock).mockResolvedValue({ data: [], total: 0, page: 1, perPage: 0 });
};

describe('bulkImportRules', () => {
  let rulesClient: ReturnType<typeof rulesClientMock.create>;
  let actionsClient: ReturnType<typeof actionsClientMock.create>;
  let savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;
  let detectionRulesClient: ReturnType<typeof detectionRulesClientMock.create>;
  let mockRuleSourceImporter: ReturnType<typeof ruleSourceImporterMock.create>;

  beforeEach(() => {
    jest.clearAllMocks();

    rulesClient = rulesClientMock.create();
    actionsClient = actionsClientMock.create();
    savedObjectsClient = savedObjectsClientMock.create();
    detectionRulesClient = detectionRulesClientMock.create();
    mockRuleSourceImporter = ruleSourceImporterMock.create();

    mockRuleSourceImporter.calculateRuleSource.mockReturnValue({
      ruleSource: { type: 'internal' },
      immutable: false,
    });
    mockRuleSourceImporter.isPrebuiltRule.mockReturnValue(false);

    (checkRuleExceptionReferences as jest.Mock).mockReturnValue([[], []]);
    (applyRuleDefaults as jest.Mock).mockImplementation((rule) => rule);
    (convertRuleResponseToAlertingRule as jest.Mock).mockImplementation((rule) => ({
      name: rule.name,
      tags: rule.tags ?? [],
      params: { ruleId: rule.rule_id },
      schedule: { interval: '5m' },
      actions: [],
      systemActions: [],
    }));
    // Default: identity-ish converter that surfaces rule_id from the alerting
    // rule's params so we can re-pair without depending on the real converter.
    (convertAlertingRuleToRuleResponse as jest.Mock).mockImplementation((rule) => ({
      ...getRulesSchemaMock(),
      id: rule.id,
      rule_id: rule.params?.ruleId ?? rule.rule_id ?? 'mock-rule-id',
      enabled: rule.enabled ?? false,
    }));
    mockFindRulesEmpty();

    rulesClient.bulkCreateRules.mockResolvedValue({ rules: [], errors: [], total: 0 });
    rulesClient.bulkEnableRules.mockResolvedValue({
      rules: [],
      errors: [],
      total: 0,
      taskIdsFailedToBeEnabled: [],
    });
  });

  const callBulkImport = (overrides: Record<string, unknown> = {}) => {
    return bulkImportRules({
      actionsClient,
      rulesClient,
      detectionRulesClient,
      mlAuthz: buildMlAuthz(),
      savedObjectsClient,
      rules: [getImportRulesSchemaMock()],
      overwriteRules: false,
      ruleSourceImporter: mockRuleSourceImporter,
      allowMissingConnectorSecrets: false,
      ...overrides,
    });
  };

  it('returns an empty result for an empty input', async () => {
    const result = await bulkImportRules({
      actionsClient,
      rulesClient,
      detectionRulesClient,
      mlAuthz: buildMlAuthz(),
      savedObjectsClient,
      rules: [],
      overwriteRules: false,
      ruleSourceImporter: mockRuleSourceImporter,
    });

    expect(result).toEqual([]);
    expect(rulesClient.bulkCreateRules).not.toHaveBeenCalled();
    expect(rulesClient.bulkEnableRules).not.toHaveBeenCalled();
  });

  it('issues a single bulkCreateRules call for new disabled rules and skips bulkEnableRules', async () => {
    rulesClient.bulkCreateRules.mockImplementation(async ({ rules: bulkInputs }) => ({
      rules: bulkInputs.map(
        (input) =>
          ({
            id: input.options!.id,
            params: { ruleId: 'r-1' },
            enabled: false,
          } as never)
      ),
      errors: [],
      total: bulkInputs.length,
    }));

    const result = await callBulkImport({
      rules: [getImportRulesSchemaMock({ rule_id: 'r-1', enabled: false })],
    });

    expect(rulesClient.bulkCreateRules).toHaveBeenCalledTimes(1);
    expect(rulesClient.bulkCreateRules).toHaveBeenCalledWith(
      expect.objectContaining({
        rules: expect.arrayContaining([
          expect.objectContaining({
            data: expect.objectContaining({ enabled: false }),
            options: expect.objectContaining({ id: expect.any(String) }),
          }),
        ]),
      })
    );
    expect(rulesClient.bulkEnableRules).not.toHaveBeenCalled();
    expect(result).toHaveLength(1);
  });

  it('force-disables enabled imports and follows up with bulkEnableRules for those ids', async () => {
    const enabledImport = getImportRulesSchemaMock({ rule_id: 'r-enabled', enabled: true });
    const disabledImport = getImportRulesSchemaMock({ rule_id: 'r-disabled', enabled: false });

    let capturedIds: string[] = [];
    rulesClient.bulkCreateRules.mockImplementation(async ({ rules: bulkInputs }) => {
      capturedIds = bulkInputs.map((input) => input.options!.id!);
      return {
        rules: bulkInputs.map(
          (input, idx) =>
            ({
              id: input.options!.id,
              params: { ruleId: idx === 0 ? 'r-enabled' : 'r-disabled' },
              enabled: false,
            } as never)
        ),
        errors: [],
        total: bulkInputs.length,
      };
    });

    await callBulkImport({ rules: [enabledImport, disabledImport] });

    expect(rulesClient.bulkCreateRules).toHaveBeenCalledTimes(1);
    const sentRules = rulesClient.bulkCreateRules.mock.calls[0][0].rules;
    expect(sentRules.every((r) => r.data.enabled === false)).toBe(true);

    expect(rulesClient.bulkEnableRules).toHaveBeenCalledTimes(1);
    expect(rulesClient.bulkEnableRules).toHaveBeenCalledWith({ ids: [capturedIds[0]] });
  });

  it('returns conflict errors for existing rule_ids when overwriteRules is false', async () => {
    (findRules as jest.Mock).mockResolvedValueOnce({
      total: 1,
      page: 1,
      perPage: 1,
      data: [{ id: 'existing-so', params: { ruleId: 'r-1' } } as never],
    });

    const result = await callBulkImport({
      rules: [getImportRulesSchemaMock({ rule_id: 'r-1' })],
    });

    expect(rulesClient.bulkCreateRules).not.toHaveBeenCalled();
    expect(result).toEqual([
      expect.objectContaining({
        error: expect.objectContaining({ type: 'conflict', ruleId: 'r-1' }),
      }),
    ]);
  });

  it('routes existing rules through detectionRulesClient.importRule when overwriteRules is true', async () => {
    (findRules as jest.Mock).mockResolvedValueOnce({
      total: 1,
      page: 1,
      perPage: 1,
      data: [{ id: 'existing-so', params: { ruleId: 'r-1' } } as never],
    });
    detectionRulesClient.importRule.mockResolvedValueOnce(getRulesSchemaMock());

    const result = await callBulkImport({
      rules: [getImportRulesSchemaMock({ rule_id: 'r-1' })],
      overwriteRules: true,
    });

    expect(detectionRulesClient.importRule).toHaveBeenCalledTimes(1);
    expect(rulesClient.bulkCreateRules).not.toHaveBeenCalled();
    expect(result).toHaveLength(1);
  });

  it('attributes per-row bulkCreate failures to the originating rule_id', async () => {
    let capturedSoId = '';
    rulesClient.bulkCreateRules.mockImplementation(async ({ rules: bulkInputs }) => {
      capturedSoId = bulkInputs[0].options!.id!;
      return {
        rules: [],
        errors: [
          {
            message: 'version conflict',
            status: 409,
            rule: { id: capturedSoId, name: bulkInputs[0].data.name },
          },
        ],
        total: 1,
      };
    });

    const result = await callBulkImport({
      rules: [getImportRulesSchemaMock({ rule_id: 'r-conflict' })],
    });

    expect(result).toEqual([
      expect.objectContaining({
        error: expect.objectContaining({ ruleId: 'r-conflict', message: 'version conflict' }),
      }),
    ]);
  });

  it('reports bulkEnableRules errors per-rule without unwinding the create', async () => {
    rulesClient.bulkCreateRules.mockImplementation(async ({ rules: bulkInputs }) => ({
      rules: bulkInputs.map(
        (input) =>
          ({
            id: input.options!.id,
            params: { ruleId: 'r-enabled' },
            enabled: false,
          } as never)
      ),
      errors: [],
      total: bulkInputs.length,
    }));
    rulesClient.bulkEnableRules.mockImplementation(async ({ ids }) => ({
      rules: [],
      errors: [
        {
          message: 'enable failed',
          rule: { id: ids![0], name: 'mock' },
        },
      ],
      total: 1,
      taskIdsFailedToBeEnabled: [],
    }));

    const result = await callBulkImport({
      rules: [getImportRulesSchemaMock({ rule_id: 'r-enabled', enabled: true })],
    });

    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rule_id: 'r-enabled' }),
        expect.objectContaining({
          error: expect.objectContaining({
            ruleId: 'r-enabled',
            message: expect.stringContaining('Rule was created but failed to enable'),
          }),
        }),
      ])
    );
  });

  it('emits an exception-list error alongside the successful create', async () => {
    (checkRuleExceptionReferences as jest.Mock)
      .mockReset()
      .mockReturnValue([
        [createRuleImportErrorObject({ ruleId: 'r-with-exception', message: 'list missing' })],
        [],
      ]);
    rulesClient.bulkCreateRules.mockImplementation(async ({ rules: bulkInputs }) => ({
      rules: bulkInputs.map(
        (input) =>
          ({
            id: input.options!.id,
            params: { ruleId: 'r-with-exception' },
            enabled: false,
          } as never)
      ),
      errors: [],
      total: bulkInputs.length,
    }));

    const result = await callBulkImport({
      rules: [getImportRulesSchemaMock({ rule_id: 'r-with-exception' })],
    });

    expect(result).toEqual([
      expect.objectContaining({
        error: expect.objectContaining({ message: 'list missing' }),
      }),
      expect.objectContaining({ rule_id: 'r-with-exception' }),
    ]);
  });

  it('builds the bulk-lookup KQL filter on params.ruleId and escapes special characters', async () => {
    await callBulkImport({
      rules: [
        getImportRulesSchemaMock({ rule_id: 'simple-id' }),
        getImportRulesSchemaMock({ rule_id: 'has"quote' }),
        getImportRulesSchemaMock({ rule_id: 'has\\backslash' }),
      ],
    });

    expect(findRules).toHaveBeenCalledTimes(1);
    const callArgs = (findRules as jest.Mock).mock.calls[0][0];
    expect(callArgs.filter).toBe(
      'alert.attributes.params.ruleId: ("simple-id" OR "has\\"quote" OR "has\\\\backslash")'
    );
    expect(callArgs.perPage).toBe(3);
  });

  it('surfaces a ruleToImportHasVersion failure as a per-rule fatal error without writing', async () => {
    mockRuleSourceImporter.isPrebuiltRule.mockReturnValue(true);

    const result = await callBulkImport({
      rules: [getImportRulesSchemaMock({ rule_id: 'r-no-version', version: undefined })],
    });

    expect(rulesClient.bulkCreateRules).not.toHaveBeenCalled();
    expect(result).toEqual([
      expect.objectContaining({
        error: expect.objectContaining({
          ruleId: 'r-no-version',
          message: expect.stringContaining('Prebuilt rules must specify a "version"'),
        }),
      }),
    ]);
  });
});
