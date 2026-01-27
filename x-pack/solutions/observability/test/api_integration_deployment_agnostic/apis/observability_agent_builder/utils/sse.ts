/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface SseEvent {
  type: string;
  data: Record<string, unknown>;
}

interface AiInsightResponse {
  summary: string;
  context: string;
}

const EVENT_PREFIX = 'event: ';
const DATA_PREFIX = 'data: ';

/**
 * Decodes SSE (Server-Sent Events) response into an array of events.
 */
export function decodeSseEvents(body: Buffer | string): SseEvent[] {
  return (
    String(body)
      // Split by double newline (SSE events are separated by blank lines)
      .split(/\n\n/)
      .map((block) => {
        const lines = block.split('\n').map((line) => line.trim());
        const eventLine = lines.find((line) => line.startsWith(EVENT_PREFIX));
        const dataLine = lines.find((line) => line.startsWith(DATA_PREFIX));

        if (!eventLine || !dataLine) return null;

        try {
          return {
            type: eventLine.slice(EVENT_PREFIX.length).trim(),
            data: JSON.parse(dataLine.slice(DATA_PREFIX.length)),
          };
        } catch {
          return null;
        }
      })
      .filter((event): event is SseEvent => event !== null)
  );
}

/**
 * Parses SSE response into AiInsightResponse with summary and context.
 */
export function parseSseResponse(body: Buffer | string): AiInsightResponse {
  const events = decodeSseEvents(body);

  const contextEvent = events.find((e) => e.type === 'context');
  const messageEvent = events.find((e) => e.type === 'chatCompletionMessage');

  return {
    context: (contextEvent?.data?.context as string) || '',
    summary: (messageEvent?.data?.content as string) || '',
  };
}
