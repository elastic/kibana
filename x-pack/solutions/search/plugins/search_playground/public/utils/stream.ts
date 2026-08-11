/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UIMessageChunk } from 'ai';

interface ReadDataStreamOptions {
  isAborted?: () => boolean;
}

const EVENT_SEPARATOR = '\n\n';
const EVENT_DATA_PREFIX = 'data: ';
const STREAM_END_PAYLOAD = '[DONE]';

export async function* readDataStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  { isAborted }: ReadDataStreamOptions = {}
): AsyncGenerator<UIMessageChunk> {
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();

    if (value) {
      buffer += decoder.decode(value, { stream: true });

      let separatorIndex = buffer.indexOf(EVENT_SEPARATOR);
      while (separatorIndex !== -1) {
        const event = buffer.slice(0, separatorIndex);
        buffer = buffer.slice(separatorIndex + EVENT_SEPARATOR.length);
        separatorIndex = buffer.indexOf(EVENT_SEPARATOR);

        if (!event.startsWith(EVENT_DATA_PREFIX)) {
          continue;
        }

        const payload = event.slice(EVENT_DATA_PREFIX.length);

        if (payload === STREAM_END_PAYLOAD) {
          return;
        }

        const message = JSON.parse(payload);
        if (isUIMessageChunk(message)) {
          yield message;
        } else {
          throw new Error(`Unsupported stream event: ${payload}`);
        }
      }
    }

    if (done) {
      if (buffer.length) {
        let payload = buffer.trim();
        if (payload.startsWith(EVENT_DATA_PREFIX)) {
          payload = payload.slice(EVENT_DATA_PREFIX.length).trim();
        }
        if (payload && payload !== STREAM_END_PAYLOAD) {
          const message = JSON.parse(payload);
          if (isUIMessageChunk(message)) {
            yield message;
          } else {
            throw new Error(`Unsupported stream event: ${payload}`);
          }
        }
      }
      break;
    }

    if (isAborted?.()) {
      await reader.cancel();
      break;
    }
  }
}

function isUIMessageChunk(message: unknown): message is UIMessageChunk {
  return Boolean(message && typeof message === 'object' && 'type' in message);
}
