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
  (item: unknown | unknown[]): BaseMessage => {
    if (isAgentFinish(item)) {
      return parseAgentFinish(item);
    }
    if (isAgentAction(item)) {
      return parseAgentAction(item);
    }

    logger.error(`Unable to parse agent outcome: ${JSON.stringify(item)}`);
    return new AIMessage({
      content: `-`,
    });
  };

const parseAgentAction = (item: AgentAction | AgentAction[]): BaseMessage => {
  if (Array.isArray(item)) {
    return new AIMessage({
      content: item.map((i) => i.log).join('\n'),
      tool_calls: item.map((i) => ({
        name: i.tool,
        args: i.toolInput as Record<string, unknown>,
        id: 'toolCallId' in i ? (i.toolCallId as string) : uuidv4(),
      })),
    });
  }

  return new AIMessage({
    content: item.log,
    tool_calls: [
      {
        name: item.tool,
        args: item.toolInput as Record<string, unknown>,
        id: 'toolCallId' in item ? (item.toolCallId as string) : uuidv4(),
      },
    ],
  });
};

const parseAgentFinish = (item: AgentFinish | AgentFinish[]): BaseMessage => {
  if (Array.isArray(item)) {
    return new AIMessage({
      content: item.map((i) => i.returnValues.output).join('\n'),
    });
  }

  return new AIMessage({
    content: item.returnValues.output,
  });
};

const isAgentFinish = (item: unknown | unknown[]): item is AgentFinish | AgentFinish[] => {
  if (Array.isArray(item)) {
    return item.every(isAgentFinish);
  }
  if (item !== undefined && typeof item === 'object') {
    const agentFinish = item as AgentFinish;
    return agentFinish.returnValues !== undefined && agentFinish.log !== undefined;
  }
  return false;
};

const isAgentAction = (item: unknown | unknown[]): item is AgentAction | AgentAction[] => {
  if (Array.isArray(item)) {
    return item.every(isAgentAction);
  }
  if (item !== undefined && typeof item === 'object') {
    const agentAction = item as AgentAction;
    return (
      agentAction.tool !== undefined &&
      agentAction.toolInput !== undefined &&
      agentAction.log !== undefined
    );
  }

  return false;
};
