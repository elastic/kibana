/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { DIGITAL_EXPERIENCE_DISABLED_TAGS } from '../../tags';

const TIME_RANGE = 'start=2026-01-01T00:00:00.000Z&end=2026-01-02T00:00:00.000Z';
const BASE = 'internal/digital_experience';

// Valid, authorized requests: the flag check runs after authorization and param validation.
const ROUTES: ReadonlyArray<{ method: 'get' | 'post'; path: string }> = [
  { method: 'get', path: `${BASE}/applications?${TIME_RANGE}` },
  { method: 'get', path: `${BASE}/applications/my-app/overview?${TIME_RANGE}` },
  { method: 'get', path: `${BASE}/applications/my-app/errors?${TIME_RANGE}` },
  { method: 'get', path: `${BASE}/applications/my-app/network?${TIME_RANGE}` },
  { method: 'get', path: `${BASE}/applications/my-app/usage?${TIME_RANGE}` },
  { method: 'get', path: `${BASE}/applications/my-app/sessions?${TIME_RANGE}` },
  { method: 'get', path: `${BASE}/applications/my-app/sessions/my-session` },
  { method: 'get', path: `${BASE}/sessions/status` },
  { method: 'post', path: `${BASE}/sessions/enable` },
];

apiTest.describe(
  'Digital Experience disabled by default',
  { tag: DIGITAL_EXPERIENCE_DISABLED_TAGS },
  () => {
    for (const { method, path } of ROUTES) {
      apiTest(
        `${method.toUpperCase()} ${path.split('?')[0]} answers 404`,
        async ({ apiClient, requestAuth }) => {
          const { apiKeyHeader } = await requestAuth.getApiKeyForAdmin();

          const response = await apiClient[method](path, {
            headers: {
              ...apiKeyHeader,
              'kbn-xsrf': 'some-xsrf-token',
              'x-elastic-internal-origin': 'kibana',
            },
            responseType: 'json',
          });

          expect(response).toHaveStatusCode(404);
        }
      );
    }
  }
);
