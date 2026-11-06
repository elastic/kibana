/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const toolCall = (toolId: string, params: Record<string, unknown> = {}) => ({
  type: 'tool_call',
  tool_id: toolId,
  params,
  results: [],
});

export const buildOutput = ({
  steps = [],
  answer = '',
  messageSource = 'response',
}: {
  steps?: unknown[];
  answer?: string;
  messageSource?: string;
}) => ({ steps, messages: [{ message: answer }], messageSource });
