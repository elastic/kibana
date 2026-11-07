/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContentRedactor } from '../../common/entity_intelligence/content_redaction';

type JsonValue = string | number | boolean | null | JsonValue[] | JsonObject;
interface JsonObject {
  [key: string]: JsonValue;
}
const object = (value?: JsonValue): JsonObject | undefined =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value : undefined;

/** Learns credential values only from the same source fields eligible for content capture. */
export const observeCodexContentLine = (line: string, redactor: ContentRedactor): void => {
  if (line.length > 2 * 1024 * 1024) return;
  let value: JsonValue;
  try {
    value = JSON.parse(line);
  } catch {
    return;
  }
  const observeValue = (input: JsonValue, depth = 0): void => {
    if (depth > 12) return;
    if (typeof input === 'string') {
      redactor.observe(input);
      if (input.startsWith('{') || input.startsWith('[')) {
        try {
          const parsed: JsonValue = JSON.parse(input);
          observeValue(parsed, depth + 1);
        } catch {
          // Non-JSON tool inputs are already inspected as text.
        }
      }
    } else if (Array.isArray(input)) {
      input.slice(0, 1000).forEach((part) => observeValue(part, depth + 1));
    } else if (input && typeof input === 'object') {
      redactor.observe(JSON.stringify(input));
      Object.values(input)
        .slice(0, 1000)
        .forEach((part) => observeValue(part, depth + 1));
    }
  };
  const record = object(value);
  const payload = object(record?.payload);
  if (!record || !payload) return;
  if (record.type === 'response_item') {
    if (payload.type === 'function_call' && typeof payload.arguments === 'string')
      observeValue(payload.arguments);
    if (payload.type === 'custom_tool_call' && typeof payload.input === 'string')
      observeValue(payload.input);
  }
  if (record.type !== 'event_msg') return;
  if (payload.type === 'user_message' && typeof payload.message === 'string')
    redactor.observe(payload.message);
  const item = object(payload.item);
  if (payload.type !== 'item_completed' || !item) return;
  if (item.type === 'CommandExecution' && Array.isArray(item.command)) observeValue(item.command);
  if (item.type === 'McpToolCall' && item.arguments !== undefined) observeValue(item.arguments);
  if (item.type === 'UserMessage' && Array.isArray(item.content)) {
    for (const part of item.content) {
      const content = object(part);
      if (content?.type === 'text' && typeof content.text === 'string')
        redactor.observe(content.text);
    }
  }
};
