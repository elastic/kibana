import type { EsqlSelfHealingAnnotation } from './state';
import { ESQL_VALIDATOR_NODE, TOOLS_NODE } from './constants';

export const stepRouter = (state: typeof EsqlSelfHealingAnnotation.State): string => {
  const { messages } = state;
  const lastMessage = messages[messages.length - 1];
  if (
    'tool_calls' in lastMessage &&
    Array.isArray(lastMessage.tool_calls) &&
    lastMessage.tool_calls?.length
  ) {
    return TOOLS_NODE;
  }

  return ESQL_VALIDATOR_NODE;
};