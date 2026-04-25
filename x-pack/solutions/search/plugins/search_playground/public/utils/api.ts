/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { UIMessageChunk } from 'ai';
import { readDataStream } from './stream';
import type { Annotation, Message } from '../types';
import { MessageRole } from '../types';

export async function fetchApi({
  api,
  messages,
  body,
  headers,
  abortController,
  handleFailure,
  onUpdate,
}: {
  api: string | ((init: RequestInit) => Promise<Response>);
  messages: Array<Omit<Message, 'id'>>;
  body: Record<string, any>;
  headers?: HeadersInit;
  appendMessage: (message: Message) => void;
  abortController?: () => AbortController | null;
  handleFailure: (error: string) => void;
  onUpdate: (mergedMessages: Message[]) => void;
}) {
  const requestInit = {
    method: 'POST',
    body: JSON.stringify({
      messages,
      ...body,
    }),
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    signal: abortController?.()?.signal,
  };

  const apiRequest = typeof api === 'string' ? fetch(api, requestInit) : api(requestInit);

  const apiResponse = await apiRequest.catch(async (error) => {
    let errorMessage = 'Failed to fetch the chat messages';
    if (error.response) {
      errorMessage =
        (await error.response?.json())?.message ?? 'Failed to fetch the chat response.';
    }
    handleFailure(errorMessage);
    throw new Error(errorMessage);
  });

  if (!apiResponse.body) {
    throw new Error('The response body is empty.');
  }

  const reader = apiResponse.body.getReader();

  return await parseDataStream({
    reader,
    abortControllerRef: abortController != null ? { current: abortController() } : undefined,
    handleFailure,
    update: onUpdate,
  });
}

interface PrefixMap {
  text?: Message;
}

function assignAnnotationsToMessage<T extends Message | null | undefined>(
  message: T,
  annotations: Annotation[] | undefined
): T {
  if (!message || !annotations || !annotations.length) return message;
  return { ...message, annotations: [...annotations] } as T;
}

export async function parseDataStream({
  reader,
  abortControllerRef,
  update,
  handleFailure,
  generateId = uuidv4,
  getCurrentDate = () => new Date(),
}: {
  reader: ReadableStreamDefaultReader<Uint8Array>;
  abortControllerRef?: {
    current: AbortController | null;
  };
  update: (mergedMessages: Message[]) => void;
  handleFailure: (error: string) => void;
  generateId?: () => string;
  getCurrentDate?: () => Date;
}) {
  const createdAt = getCurrentDate();
  const prefixMap: PrefixMap = {};
  let messageAnnotations: Annotation[] | undefined;
  const streamInstanceId = generateId();
  let messageSequence = 0;
  const allocateResponseId = (serverAssignedId?: string) => {
    messageSequence += 1;
    const baseId = `${streamInstanceId}-${messageSequence}`;
    return serverAssignedId ? `${baseId}:${serverAssignedId}` : baseId;
  };

  let responseMessageId = allocateResponseId();

  for await (const chunk of readDataStream(reader, {
    isAborted: () => abortControllerRef?.current === null,
  })) {
    const { type } = chunk;

    if (type === 'text-start') {
      responseMessageId =
        'id' in chunk && chunk.id ? allocateResponseId(chunk.id) : allocateResponseId();
      prefixMap.text = undefined;
      continue;
    } else if (type === 'text-delta' && 'delta' in chunk && typeof chunk.delta === 'string') {
      if (prefixMap.text) {
        prefixMap.text = {
          ...prefixMap.text,
          content: (prefixMap.text.content || '') + chunk.delta,
        };
      } else {
        prefixMap.text = {
          id: responseMessageId,
          role: MessageRole.assistant,
          content: chunk.delta,
          createdAt,
        };
      }
    } else if (type === 'error' && 'errorText' in chunk) {
      handleFailure(chunk.errorText);
      break;
    } else if (type === 'data-message_annotations' && 'data' in chunk) {
      const annotationsChunk = chunk as Extract<
        UIMessageChunk,
        { type: `data-${string}`; data: unknown }
      >;
      const annotationValues = annotationsChunk.data as Annotation[];
      if (!messageAnnotations) {
        messageAnnotations = [...annotationValues];
      } else {
        messageAnnotations.push(...annotationValues);
      }
    }

    const responseMessage = prefixMap.text;

    if (messageAnnotations?.length) {
      const messagePrefixKeys: Array<keyof PrefixMap> = ['text'];
      messagePrefixKeys.forEach((key) => {
        if (prefixMap[key]) {
          (prefixMap[key] as Message).annotations = [...messageAnnotations!];
        }
      });
    }

    const mergedMessages = [responseMessage].filter(Boolean).map((message) => ({
      ...assignAnnotationsToMessage(message, messageAnnotations),
    })) as Message[];

    update(mergedMessages);
  }

  return {
    messages: [prefixMap.text].filter(Boolean) as Message[],
  };
}
