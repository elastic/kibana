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
  getCreateRulesSchemaMock,
  getRulesSchemaMock,
} from '../../../../../../common/api/detection_engine/model/rule_schema/mocks';
import { getImportRulesSchemaMock } from '../../../../../../common/api/detection_engine/rule_management/mocks';
import { getRuleMock } from '../../../routes/__mocks__/request_responses';
import { getQueryRuleParams } from '../../../rule_schema/mocks';
import { buildMlAuthz } from '../../../../machine_learning/authz';
import { createProductFeaturesServiceMock } from '../../../../product_features_service/mocks';
import { createDetectionRulesClient } from './detection_rules_client';
import type { IDetectionRulesClient } from './detection_rules_client_interface';
import { getRuleByRuleId } from './methods/get_rule_by_rule_id';
import { checkRuleExceptionReferences } from '../import/check_rule_exception_references';
import { ruleSourceImporterMock } from '../import/rule_source_importer/rule_source_importer.mock';
import { getMockRulesAuthz } from '../../__mocks__/authz';

jest.mock('../../../../machine_learning/authz');
jest.mock('../../../../machine_learning/validation');
jest.mock('./methods/get_rule_by_rule_id');
jest.mock('../import/check_rule_exception_references');

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

    (getRuleByRuleId as jest.Mock).mockResolvedValue(null);
    (checkRuleExceptionReferences as jest.Mock).mockReturnValue([[], []]);

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

    it('importRules sets bulkCount to the total number of rules', async () => {
      const mockRuleSourceImporter = ruleSourceImporterMock.create();
      mockRuleSourceImporter.calculateRuleSource.mockReturnValue({
        ruleSource: { type: 'internal' },
        immutable: false,
      });
      (getRuleByRuleId as jest.Mock).mockResolvedValue(null);

      const rules = [getImportRulesSchemaMock(), getImportRulesSchemaMock()];
      await detectionRulesClient.importRules({
        rules,
        overwriteRules: false,
        ruleSourceImporter: mockRuleSourceImporter,
      });

      expect(rulesClient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          changeTracking: expect.objectContaining({ metadata: { bulkCount: rules.length } }),
        })
      );
    });
  });
});
