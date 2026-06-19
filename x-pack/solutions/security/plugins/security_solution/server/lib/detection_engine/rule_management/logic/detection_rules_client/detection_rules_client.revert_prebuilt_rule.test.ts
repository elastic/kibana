/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rulesClientMock } from '@kbn/alerting-plugin/server/mocks';
import type { ActionsClient } from '@kbn/actions-plugin/server';

import {
  getCreateEqlRuleSchemaMock,
  getCreateRulesSchemaMock,
  getRulesEqlSchemaMock,
} from '../../../../../../common/api/detection_engine/model/rule_schema/mocks';
import type { PrebuiltRuleAsset } from '../../../prebuilt_rules';
import { getRuleMock } from '../../../routes/__mocks__/request_responses';
import { getEqlRuleParams } from '../../../rule_schema/mocks';
import { buildMlAuthz } from '../../../../machine_learning/authz';
import { throwAuthzError } from '../../../../machine_learning/validation';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { createPrebuiltRuleAssetsClient } from '../../../prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client';
import { revertPrebuiltRule } from './methods/revert_prebuilt_rule';

jest.mock('../../../../machine_learning/authz');
jest.mock('../../../../machine_learning/validation');
jest.mock('../../../prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client');

describe('revertPrebuiltRule', () => {
  let rulesClient: ReturnType<typeof rulesClientMock.create>;
  let prebuiltRuleAssetClient: ReturnType<typeof createPrebuiltRuleAssetsClient>;

  const mlAuthz = (buildMlAuthz as jest.Mock)();
  const actionsClient: jest.Mocked<ActionsClient> = {
    isSystemAction: jest.fn((id: string) => id === 'system-connector-.cases'),
  } as unknown as jest.Mocked<ActionsClient>;

  const ruleAsset: PrebuiltRuleAsset = {
    ...getCreateEqlRuleSchemaMock(),
    tags: ['test'],
    type: 'eql',
    version: 1,
    rule_id: 'rule-id',
  };
  const existingRule = getRulesEqlSchemaMock();
  existingRule.actions = [
    {
      group: 'default',
      id: 'test_id',
      action_type_id: '.index',
      params: {},
    },
  ];
  existingRule.exceptions_list = [
    {
      id: 'exception_list',
      list_id: 'some-id',
      namespace_type: 'single',
      type: 'detection',
    },
  ];

  const callRevertPrebuiltRule = (asset: PrebuiltRuleAsset = ruleAsset, existing = existingRule) =>
    revertPrebuiltRule({
      ruleAsset: asset,
      existingRule: existing,
      deps: { actionsClient, rulesClient, mlAuthz, prebuiltRuleAssetClient },
    });

  beforeEach(() => {
    rulesClient = rulesClientMock.create();
    prebuiltRuleAssetClient = (createPrebuiltRuleAssetsClient as jest.Mock)(
      savedObjectsClientMock.create()
    );
  });

  it('throws if mlAuth fails', async () => {
    (throwAuthzError as jest.Mock).mockImplementationOnce(() => {
      throw new Error('mocked MLAuth error');
    });

    const mlRuleAsset: PrebuiltRuleAsset = {
      ...getCreateRulesSchemaMock(),
      version: 1,
      rule_id: 'rule-id',
    };
    const mlExistingRule = getRulesEqlSchemaMock();

    await expect(callRevertPrebuiltRule(mlRuleAsset, mlExistingRule)).rejects.toThrow(
      'mocked MLAuth error'
    );

    expect(rulesClient.update).not.toHaveBeenCalled();
  });

  it('patches the existing rule with the new params from the rule asset', async () => {
    rulesClient.update.mockResolvedValue(getRuleMock(getEqlRuleParams()));

    await callRevertPrebuiltRule();
    expect(rulesClient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: ruleAsset.name,
          tags: ruleAsset.tags,
          // actions are kept from original rule
          actions: [
            expect.objectContaining({
              actionTypeId: '.index',
              group: 'default',
              id: 'test_id',
              params: {},
            }),
          ],
          params: expect.objectContaining({
            index: ruleAsset.index,
            description: ruleAsset.description,
            exceptionsList: [
              {
                id: 'exception_list',
                list_id: 'some-id',
                namespace_type: 'single',
                type: 'detection',
              },
            ],
          }),
        }),
        id: existingRule.id,
      })
    );
  });

  it('merges exceptions lists for existing rule and stock rule asset', async () => {
    rulesClient.update.mockResolvedValue(getRuleMock(getEqlRuleParams()));
    ruleAsset.exceptions_list = [
      {
        id: 'exception_list',
        list_id: 'some-id',
        namespace_type: 'single',
        type: 'detection',
      },
      {
        id: 'second_exception_list',
        list_id: 'some-other-id',
        namespace_type: 'single',
        type: 'detection',
      },
    ];

    await callRevertPrebuiltRule();
    expect(rulesClient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: ruleAsset.name,
          tags: ruleAsset.tags,
          params: expect.objectContaining({
            index: ruleAsset.index,
            description: ruleAsset.description,
            exceptionsList: [
              {
                id: 'second_exception_list',
                list_id: 'some-other-id',
                namespace_type: 'single',
                type: 'detection',
              },
              {
                id: 'exception_list',
                list_id: 'some-id',
                namespace_type: 'single',
                type: 'detection',
              },
            ],
          }),
        }),
        id: existingRule.id,
      })
    );
  });
});
