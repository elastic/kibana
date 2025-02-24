/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NodeType } from '../constants';
import { NodeParamsBase, AgentState } from '../types';

interface ModelInputParams extends NodeParamsBase {
  state: AgentState;
}

/*
 * This is the entrypoint of the graph.
 * Any logic that should affect the state based on for example the invoke input should be done here.
 *
 * @param logger - The scoped logger
 * @param state - The current state of the graph
 */
export function modelInput({ logger, state }: ModelInputParams): Partial<AgentState> {
  logger.debug(() => `${NodeType.MODEL_INPUT}: Node state:\n${JSON.stringify(state, null, 2)}`);
  const hasRespondStep = state.isStream && (state.isOssModel || state.provider === 'bedrock');

  return {
    hasRespondStep,
    lastNode: NodeType.MODEL_INPUT,
  };
}
