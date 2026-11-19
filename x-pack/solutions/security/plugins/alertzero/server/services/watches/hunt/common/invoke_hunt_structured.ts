/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ScopedModel } from '@kbn/agent-builder-server';
import { isTemplateRequiredConnector, MessageRole, parseTemplateJson } from '@kbn/inference-common';
import type { ChatCompleteTemplate } from '@kbn/inference-common';

const requiresTemplate = (model: ScopedModel): boolean =>
  model.connector != null && isTemplateRequiredConnector(model.connector);

/**
 * A 400 from the gateway: the pinned template is missing, or the variables
 * failed its schema. A model-output parse error has no status and must not
 * take this path.
 */
const isTemplateRejection = (err: unknown): boolean =>
  typeof err === 'object' &&
  err != null &&
  'status' in err &&
  (err as { status?: unknown }).status === 400;

const invokeMessages = async <T>(
  model: ScopedModel,
  schema: { parse: (data: unknown) => T },
  prompt: string
): Promise<T> => {
  const structured = model.chatModel.withStructuredOutput(
    schema as Parameters<ScopedModel['chatModel']['withStructuredOutput']>[0]
  );
  return (await structured.invoke(prompt)) as T;
};

/**
 * One structured Hunt completion.
 *
 * A template-required connector gets `template` and an empty message. Every
 * other connector keeps `prompt` on the LangChain structured-output path.
 * When the gateway rejects the template and `messagesFallback` accepts
 * messages, that model runs the prompt instead of failing the sweep.
 */
export const invokeHuntStructured = async <T>({
  model,
  messagesFallback,
  schema,
  prompt,
  template,
  logger,
}: {
  model: ScopedModel;
  /** Tier model used when the gateway rejects `template`. */
  messagesFallback?: ScopedModel;
  schema: { parse: (data: unknown) => T };
  prompt: string;
  template: ChatCompleteTemplate;
  logger?: Logger;
}): Promise<T> => {
  if (!requiresTemplate(model)) {
    return invokeMessages(model, schema, prompt);
  }

  try {
    const response = await model.inferenceClient.chatComplete({
      stream: false,
      messages: [{ role: MessageRole.User, content: '' }],
      template,
    });
    return schema.parse(parseTemplateJson(response.content ?? ''));
  } catch (err) {
    const fallback =
      messagesFallback != null && messagesFallback !== model && !requiresTemplate(messagesFallback)
        ? messagesFallback
        : undefined;
    if (fallback == null || !isTemplateRejection(err)) {
      throw err;
    }
    logger?.warn(
      `Hunt template ${
        template.id
      } was rejected by the gateway; using the tier model for this call. ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    return invokeMessages(fallback, schema, prompt);
  }
};
