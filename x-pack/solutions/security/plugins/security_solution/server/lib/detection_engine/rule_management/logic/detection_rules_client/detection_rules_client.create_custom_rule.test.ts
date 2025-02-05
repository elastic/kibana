/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rulesClientMock } from '@kbn/alerting-plugin/server/mocks';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';

import {
  getCreateRulesSchemaMock,
  getCreateMachineLearningRulesSchemaMock,
  getCreateThreatMatchRulesSchemaMock,
} from '../../../../../../common/api/detection_engine/model/rule_schema/mocks';
import { getRuleMock } from '../../../routes/__mocks__/request_responses';
import { getQueryRuleParams } from '../../../rule_schema/mocks';
import { DEFAULT_INDICATOR_SOURCE_PATH } from '../../../../../../common/constants';
import { buildMlAuthz } from '../../../../machine_learning/authz';
import { throwAuthzError } from '../../../../machine_learning/validation';
import { createDetectionRulesClient } from './detection_rules_client';
import type { IDetectionRulesClient } from './detection_rules_client_interface';
import { licenseMock } from '@kbn/licensing-plugin/common/licensing.mock';
import type { ExperimentalFeatures } from '../../../../../../common';
import { createProductFeaturesServiceMock } from '../../../../product_features_service/mocks';

jest.mock('../../../../machine_learning/authz');
jest.mock('../../../../machine_learning/validation');

describe('DetectionRulesClient.createCustomRule', () => {
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
    // creates a rule with a system action and a connector action
    rulesClient.create.mockResolvedValue(getRuleMock(getQueryRuleParams()));

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

  it('should create a rule with the correct parameters and options', async () => {
    const params = getCreateRulesSchemaMock();

    await detectionRulesClient.createCustomRule({ params });

    expect(rulesClient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          enabled: true,
          params: expect.objectContaining({
            description: params.description,
            immutable: false,
          }),
        }),
      })
    );
  });

  it('should create a rule with actions and system actions', async () => {
    rulesClient.create.mockResolvedValue(
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
                groupingBy: ['agent.name'],
              },
            },
            actionTypeId: '.cases',
            uuid: 'e62cbe00-a0e1-44d9-9585-c39e5da63d6f',
          },
        ],
      })
    );
    const params = {
      ...getCreateRulesSchemaMock(),
      actions: [
        {
          id: 'system-connector-.cases',
          params: {
            subAction: 'run',
            subActionParams: {
              timeWindow: '7d',
              reopenClosedCases: false,
              groupingBy: ['agent.name'],
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

    await detectionRulesClient.createCustomRule({
      params,
    });

    expect(rulesClient.create).toHaveBeenCalledWith(
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
                  groupingBy: ['agent.name'],
                },
              },
              actionTypeId: '.cases',
              uuid: 'e62cbe00-a0e1-44d9-9585-c39e5da63d6f',
            },
          ]),
          enabled: true,
          params: expect.objectContaining({
            description: params.description,
            immutable: false,
          }),
        }),
      })
    );
  });

  it('should create a rule with system actions', async () => {
    rulesClient.create.mockResolvedValue(
      getRuleMock(getQueryRuleParams(), {
        systemActions: [
          {
            id: 'system-connector-.cases',
            params: {
              subAction: 'run',
              subActionParams: {
                timeWindow: '7d',
                reopenClosedCases: false,
                groupingBy: ['agent.name'],
              },
            },
            actionTypeId: '.cases',
            uuid: 'e62cbe00-a0e1-44d9-9585-c39e5da63d6f',
          },
        ],
      })
    );
    const params = {
      ...getCreateRulesSchemaMock(),
      actions: [
        {
          id: 'system-connector-.cases',
          params: {
            subAction: 'run',
            subActionParams: {
              timeWindow: '7d',
              reopenClosedCases: false,
              groupingBy: ['agent.name'],
            },
          },
          action_type_id: '.cases',
          uuid: 'e62cbe00-a0e1-44d9-9585-c39e5da63d6f',
        },
      ],
    };

    await detectionRulesClient.createCustomRule({ params });

    expect(rulesClient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          systemActions: expect.arrayContaining([
            {
              id: 'system-connector-.cases',
              params: {
                subAction: 'run',
                subActionParams: {
                  timeWindow: '7d',
                  reopenClosedCases: false,
                  groupingBy: ['agent.name'],
                },
              },
              actionTypeId: '.cases',
              uuid: 'e62cbe00-a0e1-44d9-9585-c39e5da63d6f',
            },
          ]),
          enabled: true,
          params: expect.objectContaining({
            description: params.description,
            immutable: false,
          }),
        }),
      })
    );
  });

  it('should create a rule with actions', async () => {
    rulesClient.create.mockResolvedValue(
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
      })
    );
    const params = {
      ...getCreateRulesSchemaMock(),
      actions: [
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

    await detectionRulesClient.createCustomRule({ params });

    expect(rulesClient.create).toHaveBeenCalledWith(
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
          enabled: true,
          params: expect.objectContaining({
            description: params.description,
            immutable: false,
          }),
        }),
      })
    );
  });

  it('throws if mlAuth fails', async () => {
    (throwAuthzError as jest.Mock).mockImplementationOnce(() => {
      throw new Error('mocked MLAuth error');
    });

    await expect(
      detectionRulesClient.createCustomRule({ params: getCreateMachineLearningRulesSchemaMock() })
    ).rejects.toThrow('mocked MLAuth error');

    expect(rulesClient.create).not.toHaveBeenCalled();
  });

  it('calls the rulesClient with legacy ML params', async () => {
    await detectionRulesClient.createCustomRule({
      params: getCreateMachineLearningRulesSchemaMock(),
    });

    expect(rulesClient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          params: expect.objectContaining({
            anomalyThreshold: 58,
            machineLearningJobId: ['typical-ml-job-id'],
            immutable: false,
          }),
        }),
      })
    );
  });

  it('calls the rulesClient with ML params', async () => {
    await detectionRulesClient.createCustomRule({
      params: {
        ...getCreateMachineLearningRulesSchemaMock(),
        machine_learning_job_id: ['new_job_1', 'new_job_2'],
      },
    });

    expect(rulesClient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          params: expect.objectContaining({
            anomalyThreshold: 58,
            machineLearningJobId: ['new_job_1', 'new_job_2'],
            immutable: false,
          }),
        }),
      })
    );
  });

  it('populates a threatIndicatorPath value for threat_match rule if empty', async () => {
    const params = getCreateThreatMatchRulesSchemaMock();
    delete params.threat_indicator_path;

    await detectionRulesClient.createCustomRule({
      params,
    });

    expect(rulesClient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          params: expect.objectContaining({
            threatIndicatorPath: DEFAULT_INDICATOR_SOURCE_PATH,
            immutable: false,
          }),
        }),
      })
    );
  });

  it('does not populate a threatIndicatorPath value for other rules if empty', async () => {
    await detectionRulesClient.createCustomRule({ params: getCreateRulesSchemaMock() });

    expect(rulesClient.create).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          params: expect.objectContaining({
            threatIndicatorPath: DEFAULT_INDICATOR_SOURCE_PATH,
            immutable: false,
          }),
        }),
      })
    );
  });
});
