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

      let separatorIndex = buffer.indexOf('\n\n');
      while (separatorIndex !== -1) {
        const event = buffer.slice(0, separatorIndex);
        buffer = buffer.slice(separatorIndex + 2);
        separatorIndex = buffer.indexOf('\n\n');

        if (!event.startsWith('data: ')) {
          continue;
        }

        const payload = event.slice(6);

        if (payload === '[DONE]') {
          return;
        }

        yield JSON.parse(payload) as UIMessageChunk;
      }
    }

    if (done) {
      if (buffer.length) {
        const payload = buffer.replace(/^data:\s*/, '').trim();
        if (payload && payload !== '[DONE]') {
          yield JSON.parse(payload) as UIMessageChunk;
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
