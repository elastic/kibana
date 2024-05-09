/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse as parseCookie } from 'tough-cookie';
import { FtrProviderContext } from '../../ftr_provider_context';

export const sampleDashboard = {
  contentTypeId: 'dashboard',
  data: {
    kibanaSavedObjectMeta: {},
    title: 'Sample dashboard',
  },
  options: {
    references: [],
    overwrite: true,
  },
  version: 2,
};

const usernameOrRole = 'content_manager_dashboard';
export async function setupInteractiveUser({ getService }: Pick<FtrProviderContext, 'getService'>) {
  const security = getService('security');
  await security.role.create(usernameOrRole, {
    elasticsearch: { cluster: [], indices: [], run_as: [] },
    kibana: [
      {
        spaces: ['default'],
        base: [],
        feature: { dashboard: ['all'] },
      },
    ],
  });

  await security.user.create(usernameOrRole, {
    password: usernameOrRole,
    roles: [usernameOrRole],
    full_name: usernameOrRole.toUpperCase(),
    email: `${usernameOrRole}@elastic.co`,
  });
}

export async function cleanupInteractiveUser({
  getService,
}: Pick<FtrProviderContext, 'getService'>) {
  const security = getService('security');
  await security.user.delete(usernameOrRole);
  await security.role.delete(usernameOrRole);
}

export async function loginAsInteractiveUser({
  getService,
}: Pick<FtrProviderContext, 'getService'>): Promise<{
  Cookie: string;
}> {
  const supertest = getService('supertestWithoutAuth');

  const response = await supertest
    .post('/internal/security/login')
    .set('kbn-xsrf', 'xxx')
    .send({
      providerType: 'basic',
      providerName: 'basic',
      currentURL: '/',
      params: { username: usernameOrRole, password: usernameOrRole },
    })
    .expect(200);
  const cookie = parseCookie(response.header['set-cookie'][0])!.cookieString();

  return { Cookie: cookie };
}
