/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rulesClientMock } from '@kbn/alerting-plugin/server/mocks';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { licenseMock } from '@kbn/licensing-plugin/common/licensing.mock';

import { SecurityRuleChangeTrackingAction } from '../../../../../../common/detection_engine/rule_management/rule_change_tracking';
import {
  getCreateEqlRuleSchemaMock,
  getCreateRulesSchemaMock,
  getRulesSchemaMock,
  getRulesEqlSchemaMock,
} from '../../../../../../common/api/detection_engine/model/rule_schema/mocks';
import {
  getImportRulesSchemaMock,
  getValidatedRuleToImportMock,
} from '../../../../../../common/api/detection_engine/rule_management/mocks';
import type { PrebuiltRuleAsset } from '../../../prebuilt_rules';
import { getRuleMock } from '../../../routes/__mocks__/request_responses';
import { getQueryRuleParams, getEqlRuleParams } from '../../../rule_schema/mocks';
import { buildMlAuthz } from '../../../../machine_learning/authz';
import { createProductFeaturesServiceMock } from '../../../../product_features_service/mocks';
import { createDetectionRulesClient } from './detection_rules_client';
import type { IDetectionRulesClient } from './detection_rules_client_interface';
import { getRuleByRuleId } from './methods/get_rule_by_rule_id';
import { checkRuleExceptionReferences } from '../import/check_rule_exception_references';
import { ruleSourceImporterMock } from '../import/rule_source_importer/rule_source_importer.mock';
import { getMockRulesAuthz } from '../../__mocks__/authz';
import { findRules } from '../search/find_rules';

jest.mock('../../../../machine_learning/authz');
jest.mock('../../../../machine_learning/validation');
jest.mock('./methods/get_rule_by_rule_id');
jest.mock('../import/check_rule_exception_references');
jest.mock('../search/find_rules');

describe('DetectionRulesClient change tracking', () => {
  let rulesClient: ReturnType<typeof rulesClientMock.create>;
  let detectionRulesClient: IDetectionRulesClient;

  const mlAuthz = (buildMlAuthz as jest.Mock)();
  const rulesAuthz = getMockRulesAuthz();
  const actionsClient = {
    isSystemAction: jest.fn((id: string) => id === 'system-connector-.cases'),
  } as unknown as jest.Mocked<ActionsClient>;

  beforeEach(() => {
    rulesClient = rulesClientMock.create();
    rulesClient.create.mockResolvedValue(getRuleMock(getQueryRuleParams()));
    rulesClient.update.mockResolvedValue(getRuleMock(getQueryRuleParams()));
    rulesClient.bulkDeleteRules.mockResolvedValue({
      rules: [],
      errors: [],
      total: 1,
      taskIdsFailedToBeDeleted: [],
    });
    rulesClient.bulkCreateRules.mockResolvedValue({
      successfulIds: [],
      errors: [],
      total: 0,
    });

    (getRuleByRuleId as jest.Mock).mockResolvedValue(null);
    (checkRuleExceptionReferences as jest.Mock).mockReturnValue([[], []]);
    (findRules as jest.Mock).mockResolvedValue({ data: [] });

    detectionRulesClient = createDetectionRulesClient({
      actionsClient,
      rulesClient,
      mlAuthz,
      rulesAuthz,
      savedObjectsClient: savedObjectsClientMock.create(),
      license: licenseMock.createLicenseMock(),
      productFeaturesService: createProductFeaturesServiceMock(),
    });
  });

  describe('changeTracking.action', () => {
    it('createCustomRule forwards caller-provided action to rulesClient.create', async () => {
      await detectionRulesClient.createCustomRule({
        params: getCreateRulesSchemaMock(),
        changeTracking: { action: SecurityRuleChangeTrackingAction.ruleDuplicate },
      });

      expect(rulesClient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          changeTracking: expect.objectContaining({
            action: SecurityRuleChangeTrackingAction.ruleDuplicate,
          }),
        })
      );
    });

    it('updateRule forwards caller-provided action to rulesClient.update', async () => {
      (getRuleByRuleId as jest.Mock).mockResolvedValueOnce(getRulesSchemaMock());

      const ruleUpdate = getCreateRulesSchemaMock('query-rule-id');
      ruleUpdate.name = 'updated name';

      await detectionRulesClient.updateRule({
        ruleUpdate,
        changeTracking: { action: SecurityRuleChangeTrackingAction.ruleDuplicate },
      });

      expect(rulesClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          changeTracking: expect.objectContaining({
            action: SecurityRuleChangeTrackingAction.ruleDuplicate,
          }),
        })
      );
    });

    it('patchRule forwards caller-provided action to rulesClient.update', async () => {
      const existingRule = getRulesSchemaMock();
      (getRuleByRuleId as jest.Mock).mockResolvedValueOnce(existingRule);

      await detectionRulesClient.patchRule({
        rulePatch: { rule_id: existingRule.rule_id, name: 'patched name' },
        changeTracking: { action: SecurityRuleChangeTrackingAction.ruleDuplicate },
      });

      expect(rulesClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          changeTracking: expect.objectContaining({
            action: SecurityRuleChangeTrackingAction.ruleDuplicate,
          }),
        })
      );
    });

    describe('importRule', () => {
      it('uses ruleImport action when creating a new rule', async () => {
        await detectionRulesClient.importRule({
          ruleToImport: getValidatedRuleToImportMock(),
          overwriteRules: true,
        });

        expect(rulesClient.create).toHaveBeenCalledWith(
          expect.objectContaining({
            changeTracking: expect.objectContaining({
              action: SecurityRuleChangeTrackingAction.ruleImport,
            }),
          })
        );
      });

      it('uses ruleImport action when overwriting an existing rule', async () => {
        const existingRule = getRulesSchemaMock();
        (getRuleByRuleId as jest.Mock).mockResolvedValueOnce(existingRule);

        await detectionRulesClient.importRule({
          ruleToImport: { ...getValidatedRuleToImportMock(), rule_id: existingRule.rule_id },
          overwriteRules: true,
        });

        expect(rulesClient.update).toHaveBeenCalledWith(
          expect.objectContaining({
            changeTracking: expect.objectContaining({
              action: SecurityRuleChangeTrackingAction.ruleImport,
            }),
          })
        );
      });
    });

    describe('upgradePrebuiltRule', () => {
      it('uses ruleUpgrade action when upgrading a same-type rule', async () => {
        const installedRule = getRulesEqlSchemaMock();
        (getRuleByRuleId as jest.Mock).mockResolvedValueOnce(installedRule);
        rulesClient.update.mockResolvedValue(getRuleMock(getEqlRuleParams()));

        const ruleAsset: PrebuiltRuleAsset = {
          ...getCreateEqlRuleSchemaMock(),
          type: 'eql',
          version: 1,
          rule_id: installedRule.rule_id,
        };

        await detectionRulesClient.upgradePrebuiltRule({ ruleAsset });

        expect(rulesClient.update).toHaveBeenCalledWith(
          expect.objectContaining({
            changeTracking: expect.objectContaining({
              action: SecurityRuleChangeTrackingAction.ruleUpgrade,
            }),
          })
        );
      });

      it('uses ruleUpgrade action when upgrading a rule with a type change', async () => {
        const installedRule = getRulesSchemaMock(); // query type
        installedRule.rule_id = 'rule-id';
        (getRuleByRuleId as jest.Mock).mockResolvedValueOnce(installedRule);

        const ruleAsset: PrebuiltRuleAsset = {
          ...getCreateEqlRuleSchemaMock(), // eql type
          type: 'eql',
          version: 1,
          rule_id: 'rule-id',
        };

        await detectionRulesClient.upgradePrebuiltRule({ ruleAsset });

        expect(rulesClient.create).toHaveBeenCalledWith(
          expect.objectContaining({
            changeTracking: expect.objectContaining({
              action: SecurityRuleChangeTrackingAction.ruleUpgrade,
            }),
          })
        );
      });
    });

    it('bulkCreatePrebuiltRules uses ruleInstall action', async () => {
      const ruleAsset: PrebuiltRuleAsset = {
        ...getCreateRulesSchemaMock(),
        version: 1,
        rule_id: 'rule-1',
      };

      await detectionRulesClient.bulkCreatePrebuiltRules({ rules: [ruleAsset] });

      expect(rulesClient.bulkCreateRules).toHaveBeenCalledWith(
        expect.objectContaining({
          changeTracking: expect.objectContaining({
            action: SecurityRuleChangeTrackingAction.ruleInstall,
          }),
        })
      );
    });

    it('bulkImportRules uses ruleImport action on the bulk-create branch', async () => {
      const mockRuleSourceImporter = ruleSourceImporterMock.create();
      mockRuleSourceImporter.calculateRuleSource.mockReturnValue({
        ruleSource: { type: 'internal' },
        immutable: false,
      });

      await detectionRulesClient.bulkImportRules({
        rules: [getImportRulesSchemaMock()],
        overwriteRules: false,
        ruleSourceImporter: mockRuleSourceImporter,
      });

      expect(rulesClient.bulkCreateRules).toHaveBeenCalledWith(
        expect.objectContaining({
          changeTracking: expect.objectContaining({
            action: SecurityRuleChangeTrackingAction.ruleImport,
          }),
        })
      );
    });

    it('revertPrebuiltRule uses ruleRevert action', async () => {
      const existingRule = getRulesEqlSchemaMock();
      const ruleAsset: PrebuiltRuleAsset = {
        ...getCreateEqlRuleSchemaMock(),
        type: 'eql',
        version: 1,
        rule_id: existingRule.rule_id,
      };
      rulesClient.update.mockResolvedValue(getRuleMock(getEqlRuleParams()));

      await detectionRulesClient.revertPrebuiltRule({ ruleAsset, existingRule });

      expect(rulesClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          changeTracking: expect.objectContaining({
            action: SecurityRuleChangeTrackingAction.ruleRevert,
          }),
        })
      );
    });
  });

  describe('changeTracking.bulkCount', () => {
    it('bulkDeleteRules uses caller-provided bulkCount', async () => {
      const ruleIds = ['id-1', 'id-2', 'id-3'];

      await detectionRulesClient.bulkDeleteRules({
        ruleIds,
        changeTracking: { metadata: { bulkCount: 10 } },
      });

      expect(rulesClient.bulkDeleteRules).toHaveBeenCalledWith(
        expect.objectContaining({
          changeTracking: expect.objectContaining({ metadata: { bulkCount: 10 } }),
        })
      );
    });

    it('bulkDeleteRules defaults bulkCount to ruleIds.length when not provided', async () => {
      const ruleIds = ['id-1', 'id-2', 'id-3'];

      await detectionRulesClient.bulkDeleteRules({ ruleIds });

      expect(rulesClient.bulkDeleteRules).toHaveBeenCalledWith(
        expect.objectContaining({
          changeTracking: expect.objectContaining({ metadata: { bulkCount: ruleIds.length } }),
        })
      );
    });

    it('bulkCreatePrebuiltRules computes bulkCount from rules.length', async () => {
      const ruleAssets: PrebuiltRuleAsset[] = [
        { ...getCreateRulesSchemaMock(), version: 1, rule_id: 'rule-1' },
        { ...getCreateRulesSchemaMock(), version: 1, rule_id: 'rule-2' },
        { ...getCreateRulesSchemaMock(), version: 1, rule_id: 'rule-3' },
      ];

      await detectionRulesClient.bulkCreatePrebuiltRules({ rules: ruleAssets });

      expect(rulesClient.bulkCreateRules).toHaveBeenCalledWith(
        expect.objectContaining({
          changeTracking: expect.objectContaining({
            metadata: { bulkCount: ruleAssets.length },
          }),
        })
      );
    });

    it('bulkImportRules computes bulkCount from rules.length on the bulk-create branch', async () => {
      const mockRuleSourceImporter = ruleSourceImporterMock.create();
      mockRuleSourceImporter.calculateRuleSource.mockReturnValue({
        ruleSource: { type: 'internal' },
        immutable: false,
      });
      const rules = [
        { ...getImportRulesSchemaMock(), rule_id: 'rule-1' },
        { ...getImportRulesSchemaMock(), rule_id: 'rule-2' },
      ];

      await detectionRulesClient.bulkImportRules({
        rules,
        overwriteRules: false,
        ruleSourceImporter: mockRuleSourceImporter,
      });

      expect(rulesClient.bulkCreateRules).toHaveBeenCalledWith(
        expect.objectContaining({
          changeTracking: expect.objectContaining({
            metadata: { bulkCount: rules.length },
          }),
        })
      );
    });

    it('importRules passes bulkCount through to importRule', async () => {
      const importRuleSpy = jest
        .spyOn(detectionRulesClient, 'importRule')
        .mockResolvedValue(getRulesSchemaMock());
      const mockRuleSourceImporter = ruleSourceImporterMock.create();
      mockRuleSourceImporter.calculateRuleSource.mockReturnValue({
        ruleSource: { type: 'internal' },
        immutable: false,
      });

      await detectionRulesClient.importRules({
        rules: [getImportRulesSchemaMock()],
        overwriteRules: false,
        ruleSourceImporter: mockRuleSourceImporter,
        changeTracking: { metadata: { bulkCount: 5 } },
      });

      expect(importRuleSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          changeTracking: expect.objectContaining({ metadata: { bulkCount: 5 } }),
        })
      );
    });
  });
});
