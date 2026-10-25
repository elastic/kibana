/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScopedModel } from '@kbn/agent-builder-server';
import { isTemplateRequiredConnector, MessageRole, parseTemplateJson } from '@kbn/inference-common';
import type { ChatCompleteTemplate } from '@kbn/inference-common';

/**
 * One structured Hunt completion.
 *
 * A template-required connector gets `template` and an empty message. Every
 * other connector keeps `prompt` on the LangChain structured-output path.
 */
export const invokeHuntStructured = async <T>({
  model,
  schema,
  prompt,
  template,
}: {
  model: ScopedModel;
  schema: { parse: (data: unknown) => T };
  prompt: string;
  template: ChatCompleteTemplate;
}): Promise<T> => {
  if (model.connector != null && isTemplateRequiredConnector(model.connector)) {
    const response = await model.inferenceClient.chatComplete({
      stream: false,
      messages: [{ role: MessageRole.User, content: '' }],
      template,
    });
    return schema.parse(parseTemplateJson(response.content ?? ''));
  }

  const structured = model.chatModel.withStructuredOutput(
    schema as Parameters<ScopedModel['chatModel']['withStructuredOutput']>[0]
  );
  return (await structured.invoke(prompt)) as T;
};
