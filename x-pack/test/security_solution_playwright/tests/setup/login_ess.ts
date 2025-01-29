/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test } from '@playwright/test';
import { getCommonHeaders } from '../../api_utils/headers';

export const authFile = '.auth/user.json';

test('login', { tag: '@ess' }, async ({ request }) => {
  const headers = await getCommonHeaders();

  await request.post(`${process.env.KIBANA_URL}/internal/security/login`, {
    headers,
    data: {
      providerType: 'basic',
      providerName: 'basic',
      currentURL: '/',
      params: {
        username: process.env.ELASTICSEARCH_USERNAME,
        password: process.env.ELASTICSEARCH_PASSWORD,
      },
    },
  });

  await request.storageState({ path: authFile });
});
