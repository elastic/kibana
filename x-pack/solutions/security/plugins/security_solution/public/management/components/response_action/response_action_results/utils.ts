/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EndpointError } from '../../../../../common/endpoint/errors';
import type {
  ActionDetails,
  ActionDetailsAgentState,
  MaybeImmutable,
} from '../../../../../common/endpoint/types';

/**
 * Get the Agent state from the response action, falling back to the top-level action state
 * if the agent id does not have state defined in the action (ex. due to how automated response
 * actions get their action details)
 *
 * @param _action
 * @param agentId
 */
export const getAgentActionState = (
  _action: MaybeImmutable<ActionDetails>,
  agentId: string
): ActionDetailsAgentState => {
  const action = _action as ActionDetails; // cast Just removes the Immutability

  if (!action.agents.includes(agentId)) {
    throw new EndpointError(`Agent ID [${agentId}] is invalid for response action [${action.id}]`);
  }

  return (
    action.agentState[agentId] ?? {
      wasSuccessful: action.wasSuccessful,
      isCompleted: action.isCompleted,
      completedAt: action.completedAt,
      wasCanceled: action.wasCanceled,
      errors: action.errors,
    }
  );
};
