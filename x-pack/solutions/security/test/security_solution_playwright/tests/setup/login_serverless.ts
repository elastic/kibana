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

test('serverless', { tag: '@serverless' }, async ({ samlSessionManager }) => {
  const cookie = await samlSessionManager.getInteractiveUserSessionCookieWithRoleScope(
    'platform_engineer'
  );
  const parsedUrl = new URL(process.env.KIBANA_URL!);
  const domain = parsedUrl.hostname;
  const maxAge = 100 * 365 * 24 * 60 * 60;

  const authData = {
    cookies: [
      {
        name: 'sid',
        value: cookie,
        expires: maxAge,
        secure: false,
        sameSite: 'Lax',
        domain,
        path: '/',
        httpOnly: true,
      },
    ],
  };

  fs.mkdirSync(path.dirname(authFile), { recursive: true });
  fs.writeFileSync(authFile, JSON.stringify(authData, null, 2));
});
