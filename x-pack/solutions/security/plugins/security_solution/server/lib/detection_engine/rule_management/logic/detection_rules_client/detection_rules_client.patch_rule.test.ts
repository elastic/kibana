/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rulesClientMock } from '@kbn/alerting-plugin/server/rules_client.mock';
import type { ActionsClient } from '@kbn/actions-plugin/server';

import { getRuleMock } from '../../../routes/__mocks__/request_responses';
import { getMlRuleParams, getQueryRuleParams } from '../../../rule_schema/mocks';
import {
  getCreateMachineLearningRulesSchemaMock,
  getCreateRulesSchemaMock,
  getRulesMlSchemaMock,
  getRulesSchemaMock,
} from '../../../../../../common/api/detection_engine/model/rule_schema/mocks';
import { getRuleByRuleId } from './methods/get_rule_by_rule_id';
import { buildMlAuthz } from '../../../../machine_learning/authz';
import { throwAuthzError } from '../../../../machine_learning/validation';
import { createDetectionRulesClient } from './detection_rules_client';
import type { IDetectionRulesClient } from './detection_rules_client_interface';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { licenseMock } from '@kbn/licensing-plugin/common/licensing.mock';
import type { ExperimentalFeatures } from '../../../../../../common';
import { createProductFeaturesServiceMock } from '../../../../product_features_service/mocks';

jest.mock('../../../../machine_learning/authz');
jest.mock('../../../../machine_learning/validation');

jest.mock('./methods/get_rule_by_rule_id');

describe('DetectionRulesClient.patchRule', () => {
  let rulesClient: ReturnType<typeof rulesClientMock.create>;
  let detectionRulesClient: IDetectionRulesClient;

  const mlAuthz = (buildMlAuthz as jest.Mock)();

  let actionsClient = {
    isSystemAction: jest.fn((id: string) => id === 'system-connector-.cases'),
  } as unknown as jest.Mocked<ActionsClient>;

  beforeEach(() => {
    actionsClient = {
      isSystemAction: jest.fn((id: string) => id === 'system-connector-.cases'),
    } as unknown as jest.Mocked<ActionsClient>;

    rulesClient = rulesClientMock.create();
    const savedObjectsClient = savedObjectsClientMock.create();
    detectionRulesClient = createDetectionRulesClient({
      actionsClient,
      rulesClient,
      mlAuthz,
      savedObjectsClient,
      license: licenseMock.createLicenseMock(),
      experimentalFeatures: { prebuiltRulesCustomizationEnabled: true } as ExperimentalFeatures,
      productFeaturesService: createProductFeaturesServiceMock(),
    });
  });

  it('calls the rulesClient with expected params', async () => {
    // Mock the existing rule
    const existingRule = getRulesSchemaMock();
    (getRuleByRuleId as jest.Mock).mockResolvedValueOnce(existingRule);

    // Mock the rule update
    const rulePatch = getCreateRulesSchemaMock('query-rule-id');
    rulePatch.name = 'new name';
    rulePatch.description = 'new description';

    // Mock the rule returned after update; not used for this test directly but
    // needed so that the patchRule method does not throw
    rulesClient.update.mockResolvedValue(getRuleMock(getQueryRuleParams()));

    await detectionRulesClient.patchRule({ rulePatch });

    expect(rulesClient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: rulePatch.name,
          params: expect.objectContaining({
            ruleId: rulePatch.rule_id,
            description: rulePatch.description,
          }),
        }),
      })
    );
  });

  it('calls rule update with rule system actions if nextParams has system actions', async () => {
    const rulePatch = {
      ...getCreateRulesSchemaMock(),
      actions: [
        {
          id: 'system-connector-.cases',
          params: {
            subAction: 'run',
            subActionParams: {
              timeWindow: '7d',
              reopenClosedCases: false,
              groupingBy: ['agent.type'], // changing this value
            },
          },
          action_type_id: '.cases',
          uuid: 'e62cbe00-a0e1-44d9-9585-c39e5da63d6f',
        },
        {
          id: 'b7da98d0-e1ef-4954-969f-e69c9ef5f65d',
          params: {
            message: 'Rule {{context.rule.name}} generated {{state.signals_count}} alerts',
          },
          action_type_id: '.slack',
          uuid: '4c3601b5-74b9-4330-b2f3-fea4ea3dc046',
          frequency: {
            summary: true,
            notifyWhen: 'onActiveAlert' as 'onActiveAlert', // needed for type check on line 127
            throttle: null,
          },
          group: 'default',
        },
      ],
    };
    const existingRule = getRulesSchemaMock();
    (getRuleByRuleId as jest.Mock).mockResolvedValueOnce(existingRule);
    rulesClient.update.mockResolvedValue(
      getRuleMock(getQueryRuleParams(), {
        actions: [
          {
            id: 'b7da98d0-e1ef-4954-969f-e69c9ef5f65d',
            params: {
              message: 'Rule {{context.rule.name}} generated {{state.signals_count}} alerts',
            },
            actionTypeId: '.slack',
            uuid: '4c3601b5-74b9-4330-b2f3-fea4ea3dc046',
            frequency: { summary: true, notifyWhen: 'onActiveAlert', throttle: null },
            group: 'default',
          },
        ],
        systemActions: [
          {
            id: 'system-connector-.cases',
            params: {
              subAction: 'run',
              subActionParams: {
                timeWindow: '7d',
                reopenClosedCases: false,
                groupingBy: ['agent.type'],
              },
            },
            actionTypeId: '.cases',
            uuid: 'e62cbe00-a0e1-44d9-9585-c39e5da63d6f',
          },
        ],
      })
    );

    await detectionRulesClient.patchRule({ rulePatch });

    expect(rulesClient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actions: expect.arrayContaining([
            {
              id: 'b7da98d0-e1ef-4954-969f-e69c9ef5f65d',
              params: {
                message: 'Rule {{context.rule.name}} generated {{state.signals_count}} alerts',
              },
              actionTypeId: '.slack',
              uuid: '4c3601b5-74b9-4330-b2f3-fea4ea3dc046',
              frequency: {
                summary: true,
                notifyWhen: 'onActiveAlert' as 'onActiveAlert', // needed for type check on line 127
                throttle: null,
              },
              group: 'default',
            },
          ]),
          systemActions: expect.arrayContaining([
            {
              id: 'system-connector-.cases',
              params: {
                subAction: 'run',
                subActionParams: {
                  timeWindow: '7d',
                  reopenClosedCases: false,
                  groupingBy: ['agent.type'],
                },
              },
              actionTypeId: '.cases',
              uuid: 'e62cbe00-a0e1-44d9-9585-c39e5da63d6f',
            },
          ]),
        }),
      })
    );
  });

  it('enables the rule if the nexParams have enabled: true', async () => {
    // Mock the existing rule
    const existingRule = getRulesSchemaMock();
    existingRule.enabled = false;
    (getRuleByRuleId as jest.Mock).mockResolvedValueOnce(existingRule);

    // Mock the rule update
    const rulePatch = { ...getCreateRulesSchemaMock(), enabled: true };

    // Mock the rule returned after update; not used for this test directly but
    // needed so that the patchRule method does not throw
    rulesClient.update.mockResolvedValue(getRuleMock(getQueryRuleParams()));

    const rule = await detectionRulesClient.patchRule({ rulePatch });

    expect(rule.enabled).toBe(true);
    expect(rulesClient.enableRule).toHaveBeenCalledWith(
      expect.objectContaining({
        id: existingRule.id,
      })
    );
  });

  it('disables the rule if the nexParams have enabled: false', async () => {
    // Mock the existing rule
    const existingRule = getRulesSchemaMock();
    existingRule.enabled = true;
    (getRuleByRuleId as jest.Mock).mockResolvedValueOnce(existingRule);

    // Mock the rule update
    const rulePatch = { ...getCreateRulesSchemaMock(), enabled: false };

    // Mock the rule returned after update; not used for this test directly but
    // needed so that the patchRule method does not throw
    rulesClient.update.mockResolvedValue(getRuleMock(getQueryRuleParams()));

    const rule = await detectionRulesClient.patchRule({ rulePatch });

    expect(rule.enabled).toBe(false);
    expect(rulesClient.disableRule).toHaveBeenCalledWith(
      expect.objectContaining({
        id: existingRule.id,
      })
    );
  });

  it('calls the rulesClient with new ML params', async () => {
    // Mock the existing rule
    const existingRule = getRulesMlSchemaMock();
    (getRuleByRuleId as jest.Mock).mockResolvedValueOnce(existingRule);

    // Mock the rule update
    const rulePatch = getCreateMachineLearningRulesSchemaMock();
    rulePatch.anomaly_threshold = 42;
    rulePatch.machine_learning_job_id = ['new-job-id'];

    // Mock the rule returned after update; not used for this test directly but
    // needed so that the patchRule method does not throw
    rulesClient.update.mockResolvedValue(getRuleMock(getMlRuleParams()));

    await detectionRulesClient.patchRule({ rulePatch });
    expect(rulesClient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          params: expect.objectContaining({
            anomalyThreshold: rulePatch.anomaly_threshold,
            machineLearningJobId: rulePatch.machine_learning_job_id,
          }),
        }),
      })
    );
  });

  it('throws if mlAuth fails', async () => {
    (throwAuthzError as jest.Mock).mockImplementationOnce(() => {
      throw new Error('mocked MLAuth error');
    });

    const rulePatch = getCreateRulesSchemaMock();

    await expect(detectionRulesClient.patchRule({ rulePatch })).rejects.toThrow(
      'mocked MLAuth error'
    );

    expect(rulesClient.create).not.toHaveBeenCalled();
  });

  it('throws an error if rule has external rule source and non-customizable fields are changed', async () => {
    // Mock the existing rule
    const existingRule = {
      ...getRulesSchemaMock(),
      rule_source: { type: 'external', is_customized: true },
    };
    (getRuleByRuleId as jest.Mock).mockResolvedValueOnce(existingRule);

    // Mock the rule update
    const rulePatch = getCreateRulesSchemaMock('query-rule-id');
    rulePatch.license = 'new license';

    // Mock the rule returned after update; not used for this test directly but
    // needed so that the patchRule method does not throw
    rulesClient.update.mockResolvedValue(getRuleMock(getQueryRuleParams()));

    await expect(detectionRulesClient.patchRule({ rulePatch })).rejects.toThrow(
      'Cannot update "license" field for prebuilt rules'
    );
  });

  describe('actions', () => {
    it("updates the rule's actions if provided", async () => {
      // Mock the existing rule
      const existingRule = getRulesSchemaMock();
      (getRuleByRuleId as jest.Mock).mockResolvedValueOnce(existingRule);

      // Mock the rule update
      const rulePatch = {
        ...getCreateRulesSchemaMock(),
        actions: [
          {
            action_type_id: '.slack',
            id: '2933e581-d81c-4fe3-88fe-c57c6b8a5bfd',
            params: {
              message: 'Rule {{context.rule.name}} generated {{state.signals_count}} signals',
            },
            group: 'default',
          },
        ],
      };

      // Mock the rule returned after update; not used for this test directly but
      // needed so that the patchRule method does not throw
      rulesClient.update.mockResolvedValue(getRuleMock(getQueryRuleParams()));

      await detectionRulesClient.patchRule({ rulePatch });

      expect(rulesClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actions: [
              {
                actionTypeId: '.slack',
                id: '2933e581-d81c-4fe3-88fe-c57c6b8a5bfd',
                params: {
                  message: 'Rule {{context.rule.name}} generated {{state.signals_count}} signals',
                },
                group: 'default',
                frequency: { summary: true, throttle: null, notifyWhen: 'onActiveAlert' },
              },
            ],
          }),
        })
      );
    });

    it('does not update actions if none are specified', async () => {
      // Mock the existing rule
      const existingRule = getRulesSchemaMock();
      (getRuleByRuleId as jest.Mock).mockResolvedValueOnce(existingRule);
      existingRule.actions = [
        {
          action_type_id: '.slack',
          id: '2933e581-d81c-4fe3-88fe-c57c6b8a5bfd',
          params: {
            message: 'Rule {{context.rule.name}} generated {{state.signals_count}} signals',
          },
          group: 'default',
        },
      ];

      // Mock the rule update
      const rulePatch = getCreateRulesSchemaMock();
      delete rulePatch.actions;

      // Mock the rule returned after update; not used for this test directly but
      // needed so that the patchRule method does not throw
      rulesClient.update.mockResolvedValue(getRuleMock(getQueryRuleParams()));

      await detectionRulesClient.patchRule({ rulePatch });

      expect(rulesClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actions: [
              {
                actionTypeId: '.slack',
                id: '2933e581-d81c-4fe3-88fe-c57c6b8a5bfd',
                params: {
                  message: 'Rule {{context.rule.name}} generated {{state.signals_count}} signals',
                },
                group: 'default',
                frequency: { summary: true, throttle: null, notifyWhen: 'onActiveAlert' },
              },
            ],
          }),
        })
      );
    });
  });
});
