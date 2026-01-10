/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExternalEventInput } from '../../../../common/types/events';

/**
 * Mock Sentry alerts based on Keep's provider pattern
 * @see https://github.com/keephq/keep/blob/117a9f5cb402cebc02857364cb55cabd3aa15590/keep/providers/sentry_provider/alerts_mock.py
 */
export const SENTRY_MOCKS: ExternalEventInput[] = [
  {
    title: 'Failed to fetch user profile',
    message:
      'NetworkError: Server responded with 504 Gateway Timeout. Culprit: fetchUserProfile at app.js:245.',
    severity: 'critical',
    source: 'sentry',
    status: 'open',
    tags: ['javascript', 'frontend', 'network-error', 'production'],
    links: [
      {
        label: 'View in Sentry',
        url: 'https://sentry.io/issues/4616132097/',
      },
    ],
    raw_payload: {
      id: '4616132097',
      project: 'frontend-app',
      logger: 'javascript',
      level: 'error',
      culprit: 'fetchUserProfile at app.js:245',
      event: {
        event_id: 'a892bf7d01c640b597831fb1710e3414',
        platform: 'javascript',
        environment: 'production',
        user: { id: 'user_8675309', geo: { country_code: 'US', city: 'San Francisco' } },
        contexts: { browser: { name: 'Chrome', version: '121.0.0.0' } },
        tags: [
          ['browser', 'Chrome 121.0.0.0'],
          ['error.type', 'NetworkError'],
          ['http.status_code', '504'],
        ],
      },
    },
  },
  {
    title: 'Order submission failed',
    message:
      'Server responded with 503 Service Unavailable - System under heavy load. Culprit: submitOrder at checkout.js:178.',
    severity: 'critical',
    source: 'sentry',
    status: 'open',
    tags: ['javascript', 'frontend', 'api-error', 'checkout', 'production'],
    links: [
      {
        label: 'View in Sentry',
        url: 'https://sentry.io/issues/4616132098/',
      },
    ],
    raw_payload: {
      id: '4616132098',
      project: 'frontend-app',
      logger: 'javascript',
      level: 'error',
      culprit: 'submitOrder at checkout.js:178',
      event: {
        event_id: 'b723cf8e01c640b597831fb1710e3415',
        platform: 'javascript',
        environment: 'production',
        user: { id: 'user_2468101', geo: { country_code: 'GB', city: 'London' } },
        request: {
          url: 'https://api.example.com/orders/submit',
          method: 'POST',
          data: { order_id: 'ORD-12345', total: 299.99 },
        },
        tags: [
          ['browser', 'Mobile Safari 17.3.1'],
          ['error.type', 'ApiError'],
          ['http.status_code', '503'],
        ],
      },
    },
  },
  {
    title: 'Failed to load product catalog',
    message:
      'Server responded with 502 Bad Gateway - Database connection timeout. Culprit: loadProductCatalog at products.js:89.',
    severity: 'high',
    source: 'sentry',
    status: 'open',
    tags: ['javascript', 'frontend', 'database', 'catalog', 'production'],
    links: [
      {
        label: 'View in Sentry',
        url: 'https://sentry.io/issues/4616132099/',
      },
    ],
    raw_payload: {
      id: '4616132099',
      project: 'frontend-app',
      logger: 'javascript',
      level: 'error',
      culprit: 'loadProductCatalog at products.js:89',
      event: {
        event_id: 'c634de9f01c640b597831fb1710e3416',
        platform: 'javascript',
        environment: 'production',
        user: { id: 'user_1357924', geo: { country_code: 'DE', city: 'Berlin' } },
        contexts: { browser: { name: 'Edge', version: '120.0.0.0' } },
        tags: [
          ['browser', 'Edge 120.0.0.0'],
          ['error.type', 'ApiError'],
          ['http.status_code', '502'],
        ],
      },
    },
  },
  {
    title: 'Unhandled Promise Rejection',
    message:
      'TypeError: Cannot read property "id" of undefined in UserDashboard component.',
    severity: 'medium',
    source: 'sentry',
    status: 'open',
    tags: ['javascript', 'react', 'unhandled-rejection', 'staging'],
    raw_payload: {
      id: '4616132100',
      project: 'frontend-app',
      logger: 'javascript',
      level: 'error',
      culprit: 'UserDashboard at dashboard.tsx:156',
      event: {
        event_id: 'd745ef0001c640b597831fb1710e3417',
        platform: 'javascript',
        environment: 'staging',
        tags: [
          ['error.type', 'TypeError'],
          ['component', 'UserDashboard'],
        ],
      },
    },
  },
  {
    title: 'Python Backend: Database Connection Pool Exhausted',
    message:
      'sqlalchemy.exc.TimeoutError: QueuePool limit of 10 connections exceeded. Connection timed out.',
    severity: 'critical',
    source: 'sentry',
    status: 'open',
    tags: ['python', 'backend', 'database', 'sqlalchemy', 'production'],
    raw_payload: {
      id: '4616132101',
      project: 'backend-api',
      logger: 'python',
      level: 'error',
      culprit: 'get_db_connection at db/pool.py:45',
      event: {
        event_id: 'e856fg1101c640b597831fb1710e3418',
        platform: 'python',
        environment: 'production',
        tags: [
          ['error.type', 'TimeoutError'],
          ['db.pool_size', '10'],
        ],
      },
    },
  },
];

