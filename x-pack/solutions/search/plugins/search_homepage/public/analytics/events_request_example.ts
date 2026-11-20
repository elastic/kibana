/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const MINUTE_MS = 60_000;

interface ExampleEvent {
  minutesAgo: number;
  action: string;
  userId: string;
  properties?: Record<string, Record<string, string | number>>;
}

const EXAMPLE_EVENTS: readonly ExampleEvent[] = [
  { minutesAgo: 12, action: 'page_view', userId: 'u-1001', properties: { url: { path: '/' } } },
  {
    minutesAgo: 7,
    action: 'add_to_cart',
    userId: 'u-1001',
    properties: { url: { path: '/cart' } },
  },
  { minutesAgo: 2, action: 'purchase', userId: 'u-1001', properties: { order: { total: 89.5 } } },
];

export type ExampleEventDocument = Record<string, string | Record<string, string | number>>;

/** A few events dated within the minutes before `now`. */
export const buildExampleEvents = (now: number): ExampleEventDocument[] =>
  EXAMPLE_EVENTS.map(({ minutesAgo, action, userId, properties }) => ({
    '@timestamp': new Date(now - minutesAgo * MINUTE_MS).toISOString(),
    event: { action },
    user: { id: userId },
    ...properties,
  }));

/**
 * A Console bulk request that writes a few events to the index, dated within the minutes before
 * `now` so that the chart and the recent time ranges of the starter queries contain them.
 */
export const buildEventsRequestExample = (indexName: string, now: number): string =>
  // The request line comes first: Console puts the cursor, and with it the send button, there.
  [
    `POST ${indexName}/_bulk`,
    ...buildExampleEvents(now).flatMap((event) => ['{ "index": {} }', JSON.stringify(event)]),
    '',
  ].join('\n');
