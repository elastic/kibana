/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rulesClientMock } from '@kbn/alerting-plugin/server/mocks';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import { SecurityRuleChangeTrackingAction } from '../../../../../../common/detection_engine/rule_management/rule_change_tracking';
import type { RuleCreateProps } from '../../../../../../common/api/detection_engine/model/rule_schema';
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
import { createRule } from './methods/create_rule';

jest.mock('../../../../machine_learning/authz');
jest.mock('../../../../machine_learning/validation');

describe('createPrebuiltRule behavior (via createRule with prebuilt params)', () => {
  let rulesClient: ReturnType<typeof rulesClientMock.create>;

  const mlAuthz = (buildMlAuthz as jest.Mock)();
  const actionsClient: jest.Mocked<ActionsClient> = {
    isSystemAction: jest.fn(() => false),
  } as unknown as jest.Mocked<ActionsClient>;

  const callCreatePrebuiltRule = (params: RuleCreateProps) =>
    createRule({
      rule: { ...params, immutable: true },
      deps: { actionsClient, rulesClient, mlAuthz },
      changeTracking: { action: SecurityRuleChangeTrackingAction.ruleInstall },
    });

  beforeEach(() => {
    rulesClient = rulesClientMock.create();
    rulesClient.create.mockResolvedValue(getRuleMock(getQueryRuleParams()));
  });

  it('creates a rule with the correct parameters and options', async () => {
    const params = { ...getCreateRulesSchemaMock(), version: 1, rule_id: 'rule-id' };

    await callCreatePrebuiltRule(params);

    expect(rulesClient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          enabled: false,
          name: params.name,
          params: expect.objectContaining({
            ruleId: params.rule_id,
            immutable: true,
          }),
        }),
        changeTracking: expect.objectContaining({
          action: SecurityRuleChangeTrackingAction.ruleInstall,
        }),
      })
    );
  });

  it('throws if mlAuth fails', async () => {
    const params = { ...getCreateRulesSchemaMock(), version: 1, rule_id: 'rule-id' };
    (throwAuthzError as jest.Mock).mockImplementationOnce(() => {
      throw new Error('mocked MLAuth error');
    });

    await expect(callCreatePrebuiltRule(params)).rejects.toThrow('mocked MLAuth error');

    expect(rulesClient.create).not.toHaveBeenCalled();
  });

  it('calls the rulesClient with legacy ML params', async () => {
    const params = {
      ...getCreateMachineLearningRulesSchemaMock(),
      version: 1,
      rule_id: 'rule-id',
    };
    await callCreatePrebuiltRule(params);

    expect(rulesClient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          enabled: false,
          params: expect.objectContaining({
            anomalyThreshold: params.anomaly_threshold,
            machineLearningJobId: [params.machine_learning_job_id],
            immutable: true,
          }),
        }),
      })
    );
  });

  it('calls the rulesClient with ML params', async () => {
    const params = {
      ...getCreateMachineLearningRulesSchemaMock(),
      machine_learning_job_id: ['new_job_1', 'new_job_2'],
      version: 1,
      rule_id: 'rule-id',
    };
    await callCreatePrebuiltRule(params);

    expect(rulesClient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          enabled: false,
          params: expect.objectContaining({
            anomalyThreshold: 58,
            machineLearningJobId: ['new_job_1', 'new_job_2'],
            immutable: true,
          }),
        }),
      })
    );
  });

  it('populates a threatIndicatorPath value for threat_match rule if empty', async () => {
    const params = { ...getCreateThreatMatchRulesSchemaMock(), version: 1, rule_id: 'rule-id' };
    delete params.threat_indicator_path;

    await callCreatePrebuiltRule(params);

    expect(rulesClient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          enabled: false,
          params: expect.objectContaining({
            threatIndicatorPath: DEFAULT_INDICATOR_SOURCE_PATH,
            immutable: true,
          }),
        }),
      })
    );
  });

  it('does not populate a threatIndicatorPath value for other rules if empty', async () => {
    const params = { ...getCreateRulesSchemaMock(), version: 1, rule_id: 'rule-id' };
    await callCreatePrebuiltRule(params);
    expect(rulesClient.create).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          params: expect.objectContaining({
            threatIndicatorPath: DEFAULT_INDICATOR_SOURCE_PATH,
          }),
        }),
      })
    );
  });
});
