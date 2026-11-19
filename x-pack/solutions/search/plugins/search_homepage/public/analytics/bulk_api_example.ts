/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const MINUTE_MS = 60_000;

export const BULK_API_EXAMPLE_INDEX = 'my-events';

interface ExampleEvent {
  minutesAgo: number;
  action: string;
  userId: string;
  sessionId: string;
  properties: Record<string, Record<string, string | number>>;
}

const EXAMPLE_EVENTS: readonly ExampleEvent[] = [
  {
    minutesAgo: 55,
    action: 'page_view',
    userId: 'u-1001',
    sessionId: 's-5001',
    properties: { url: { path: '/' }, device: { type: 'desktop' } },
  },
  {
    minutesAgo: 48,
    action: 'product_view',
    userId: 'u-1001',
    sessionId: 's-5001',
    properties: { url: { path: '/products/trail-shoes' }, device: { type: 'desktop' } },
  },
  {
    minutesAgo: 34,
    action: 'page_view',
    userId: 'u-1002',
    sessionId: 's-5002',
    properties: { url: { path: '/pricing' }, device: { type: 'mobile' } },
  },
  {
    minutesAgo: 21,
    action: 'add_to_cart',
    userId: 'u-1001',
    sessionId: 's-5001',
    properties: { url: { path: '/cart' }, device: { type: 'desktop' } },
  },
  {
    minutesAgo: 9,
    action: 'purchase',
    userId: 'u-1001',
    sessionId: 's-5001',
    properties: {
      url: { path: '/checkout' },
      device: { type: 'desktop' },
      order: { total: 89.5 },
    },
  },
  {
    minutesAgo: 2,
    action: 'signup',
    userId: 'u-1003',
    sessionId: 's-5003',
    properties: { url: { path: '/signup' }, device: { type: 'tablet' } },
  },
];

export const BULK_API_EXAMPLE_DOCUMENTS_INDEX = 'my-documents';

const EXAMPLE_DOCUMENTS: ReadonlyArray<{ title: string; description: string }> = [
  {
    title: 'Trail running shoes',
    description: 'Lightweight shoes with a grippy sole for wet and rocky trails.',
  },
  {
    title: 'Waterproof hiking jacket',
    description: 'A breathable shell that keeps out rain and wind on long hikes.',
  },
  {
    title: 'Insulated water bottle',
    description: 'Keeps drinks cold for a full day on the trail.',
  },
];

const buildEventsRequest = (now: number): string[] => [
  `POST ${BULK_API_EXAMPLE_INDEX}/_bulk`,
  ...EXAMPLE_EVENTS.flatMap(({ minutesAgo, action, userId, sessionId, properties }) => [
    '{ "index": {} }',
    JSON.stringify({
      '@timestamp': new Date(now - minutesAgo * MINUTE_MS).toISOString(),
      event: { action },
      user: { id: userId },
      session: { id: sessionId },
      ...properties,
    }),
  ]),
];

const buildDocumentsRequest = (): string[] => [
  `POST ${BULK_API_EXAMPLE_DOCUMENTS_INDEX}/_bulk`,
  ...EXAMPLE_DOCUMENTS.flatMap((document) => ['{ "index": {} }', JSON.stringify(document)]),
];

/**
 * Console content with two bulk requests, so the example fits either kind of data: a few events
 * dated within the hour before `now`, which the recent time ranges of the starter queries, the
 * chart and generated dashboards contain, and a few documents to search.
 */
export const buildBulkApiExample = (now: number): string =>
  // The request line comes first: Console puts the cursor, and with it the send button, there.
  [
    ...buildEventsRequest(now),
    '',
    '# The request above indexes events. To index documents to search, send this one instead.',
    ...buildDocumentsRequest(),
    '',
  ].join('\n');
