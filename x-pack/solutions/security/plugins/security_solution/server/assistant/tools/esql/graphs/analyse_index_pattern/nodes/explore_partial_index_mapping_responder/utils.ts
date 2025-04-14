/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessage } from '@langchain/core/messages';
import { ToolMessage } from '@langchain/core/messages';
import type { ToolCall } from '@langchain/core/dist/messages/tool';
import { set } from 'lodash';
import { toolDetails } from '../../../../tools/inspect_index_mapping_tool/inspect_index_mapping_tool';
import { messageContainsToolCalls } from '../../../../utils/common';

export const buildContext = (messages: BaseMessage[]): Record<string, unknown> => {
  const orderedInspectIndexMappingToolCalls = messages
    .filter((message) => messageContainsToolCalls(message))
    .flatMap((message) => message.tool_calls)
    .filter((toolCall) => toolCall !== undefined)
    .filter((toolCall) => toolCall.name === toolDetails.name);

  const orderedInspectIndexMappingToolCallIds = orderedInspectIndexMappingToolCalls.map(
    (toolCall) => toolCall.id
  );

  const inspectIndexMappingToolCallByIds = orderedInspectIndexMappingToolCalls.reduce(
    (acc, toolCall) => {
      const toolCallId = toolCall.id;
      if (toolCallId !== undefined) {
        acc[toolCallId] = toolCall;
      }
      return acc;
    },
    {} as Record<string, ToolCall>
  );

  const orderedInspectIndexMappingToolMessages = messages
    .filter((message) => message instanceof ToolMessage)
    .filter((message) => message.tool_call_id in inspectIndexMappingToolCallByIds)
    .map((message) => message as ToolMessage)
    .sort(
      (a, b) =>
        orderedInspectIndexMappingToolCallIds.indexOf(a.tool_call_id) -
        orderedInspectIndexMappingToolCallIds.indexOf(b.tool_call_id)
    );

  let context = {};

  for (const toolMessage of orderedInspectIndexMappingToolMessages) {
    const toolCall = inspectIndexMappingToolCallByIds[toolMessage.tool_call_id];
    if (toolCall.args.property !== undefined) {
      if (toolCall.args.property === '') {
        try {
          context = JSON.parse(toolMessage.content as string);
        } catch (e) {}
      } else {
        try {
          const parsedContent = JSON.parse(toolMessage.content as string);
          set(context, toolCall.args.property, parsedContent);
        } catch (e) {}
      }
    }
  }

  return context;
};
