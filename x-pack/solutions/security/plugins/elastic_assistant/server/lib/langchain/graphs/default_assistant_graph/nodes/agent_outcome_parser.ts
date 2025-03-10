/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AIMessage, BaseMessage } from '@langchain/core/messages';
import { AgentAction, AgentFinish } from 'langchain/agents';
import { v4 as uuidv4 } from 'uuid';
import type { Logger } from '@kbn/logging';

export const AgentOutcomeParser =
  ({ logger }: { logger: Logger }) =>
  (outcome: unknown): BaseMessage => {
    console.log(outcome);
    if (isAgentFinish(outcome)) {
      return new AIMessage({
        content: outcome.returnValues.output,
      });
    }
    if (isAgentAction(outcome)) {
      return new AIMessage({
        content: outcome.log,
        tool_calls: [
          {
            name: outcome.tool,
            args: outcome.toolInput as Record<string, unknown>,
            id: uuidv4(),
          },
        ],
      });
    }
    logger.error(`Unknown agent outcome: ${outcome}`);
    return new AIMessage({
      content: `-`,
    });
  };

const isAgentFinish = (outcome: unknown): outcome is AgentFinish => {
  if (outcome !== undefined && typeof outcome === 'object') {
    const outcomeObj = outcome as AgentFinish;
    return outcomeObj.returnValues !== undefined && outcomeObj.log !== undefined;
  }
  return false;
};

const isAgentAction = (outcome: unknown): outcome is AgentAction => {
  if (outcome !== undefined && typeof outcome === 'object') {
    const outcomeObj = outcome as AgentAction;
    return (
      outcomeObj.tool !== undefined &&
      outcomeObj.toolInput !== undefined &&
      outcomeObj.log !== undefined
    );
  }

  return false;
};
