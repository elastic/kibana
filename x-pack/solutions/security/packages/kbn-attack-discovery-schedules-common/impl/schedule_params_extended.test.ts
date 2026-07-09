/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttackDiscoveryScheduleParamsExtended } from './schedule_params_extended';

const baseParams = {
  alertsIndexPattern: '.alerts-security.alerts-default',
  apiConfig: {
    connectorId: 'gpt-4o',
    actionTypeId: '.gen-ai',
    name: 'Mock GPT-4o',
  },
  size: 100,
};

describe('AttackDiscoveryScheduleParamsExtended', () => {
  it('parses base params without extended fields', () => {
    const result = AttackDiscoveryScheduleParamsExtended.parse(baseParams);

    expect(result).toEqual(baseParams);
  });

  it('parses with insightType field', () => {
    const input = { ...baseParams, insightType: 'attack_discovery' };

    const result = AttackDiscoveryScheduleParamsExtended.parse(input);

    expect(result.insightType).toEqual('attack_discovery');
  });

  it('parses with workflowConfig field', () => {
    const input = { ...baseParams, workflowConfig: { graphId: 'orchestrator-v1' } };

    const result = AttackDiscoveryScheduleParamsExtended.parse(input);

    expect(result.workflowConfig).toEqual({ graphId: 'orchestrator-v1' });
  });

  it('parses with both extended fields', () => {
    const input = {
      ...baseParams,
      insightType: 'attack_discovery',
      workflowConfig: { graphId: 'orchestrator-v1' },
    };

    const result = AttackDiscoveryScheduleParamsExtended.parse(input);

    expect(result.insightType).toEqual('attack_discovery');
    expect(result.workflowConfig).toEqual({ graphId: 'orchestrator-v1' });
  });

  it('rejects workflowConfig without graphId', () => {
    const input = { ...baseParams, workflowConfig: {} };

    expect(() => AttackDiscoveryScheduleParamsExtended.parse(input)).toThrow();
  });
});
