/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import path from 'path';
import { test } from '../../fixtures/saml';

export const authFile = '.auth/user.json';

/*
test('ess - login', async ({ request }) => {
  await request.post(`${process.env.KIBANA_URL}/internal/security/login`, {
    headers: {
      'kbn-xsrf': 'cypress-creds',
      'x-elastic-internal-origin': 'security-solution',
      'elastic-api-version': '2023-10-31',
    },
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
}); */

test('serverless - login', async ({ samlSessionManager }) => {
  const cookie = await samlSessionManager.getInteractiveUserSessionCookieWithRoleScope(
    'platform_engineer'
  );
  const parsedUrl = new URL(process.env.KIBANA_URL!);
  const domain = parsedUrl.hostname;

  const authData = {
    cookies: [
      {
        name: 'sid',
        value: cookie,
        domain,
        path: '/',
        httpOnly: true,
      },
    ],
  };

  fs.mkdirSync(path.dirname(authFile), { recursive: true });
  fs.writeFileSync(authFile, JSON.stringify(authData, null, 2));
});
