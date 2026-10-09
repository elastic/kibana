/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionDetails } from '../../../../../common/endpoint/types';
import { EndpointActionGenerator } from '../../../../../common/endpoint/data_generators/endpoint_action_generator';
import { getAgentActionState } from './utils';

describe('getAgentActionState()', () => {
  let actionGenerator: EndpointActionGenerator;
  let action: ActionDetails;

  beforeEach(() => {
    actionGenerator = new EndpointActionGenerator('test');
    action = actionGenerator.generateActionDetails({ agents: ['agent-a'] });
  });

  it('should return the agent state defined for the given agent id', () => {
    action.agentState['agent-a'] = {
      isCompleted: true,
      wasSuccessful: true,
      wasCanceled: false,
      completedAt: '2022-04-30T16:08:47.449Z',
      errors: undefined,
    };

    expect(getAgentActionState(action, 'agent-a')).toEqual(action.agentState['agent-a']);
  });

  it('should fall back to the top-level action state when the agent id has no state defined', () => {
    action.agentState = {};
    action.isCompleted = true;
    action.wasSuccessful = false;
    action.wasCanceled = true;
    action.completedAt = '2022-05-01T00:00:00.000Z';
    action.errors = ['some error'];

    expect(getAgentActionState(action, 'agent-a')).toEqual({
      isCompleted: action.isCompleted,
      wasSuccessful: action.wasSuccessful,
      wasCanceled: action.wasCanceled,
      completedAt: action.completedAt,
      errors: action.errors,
    });
  });

  it('should throw an EndpointError when the agent id is not in the action', () => {
    expect(() => getAgentActionState(action, 'not-a-real-agent')).toThrow(
      'Agent ID [not-a-real-agent] is invalid for response action [123]'
    );
  });
});
