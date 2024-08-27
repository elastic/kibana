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

const roleEditor = 'content_manager_dashboard';
const roleReader = 'content_reader_dashboard';
const usersEditor = ['content_manager_dashboard_1', 'content_manager_dashboard_2'] as const;
const usersReader = ['content_reader_dashboard_1', 'content_reader_dashboard_2'] as const;
export async function setupInteractiveUser({ getService }: Pick<FtrProviderContext, 'getService'>) {
  const security = getService('security');
  const spaces = getService('spaces');
  await spaces.create({ id: 'custom', name: 'Custom Space' });

  await security.role.create(roleEditor, {
    elasticsearch: { cluster: [], indices: [], run_as: [] },
    kibana: [
      {
        spaces: ['default', 'custom'],
        base: [],
        feature: { dashboard: ['all'] },
      },
    ],
  });
  await security.role.create(roleReader, {
    elasticsearch: { cluster: [], indices: [], run_as: [] },
    kibana: [
      {
        spaces: ['default', 'custom'],
        base: [],
        feature: { dashboard: ['read'] },
      },
    ],
  });

  for (const user of usersEditor) {
    await security.user.create(user, {
      password: user,
      roles: [roleEditor],
      full_name: user.toUpperCase(),
      email: `${user}@elastic.co`,
    });
  }

  for (const user of usersReader) {
    await security.user.create(user, {
      password: user,
      roles: [roleReader],
      full_name: user.toUpperCase(),
      email: `${user}@elastic.co`,
    });
  }
}

export async function cleanupInteractiveUser({
  getService,
}: Pick<FtrProviderContext, 'getService'>) {
  await getService('spaces').delete('custom');

  const security = getService('security');
  for (const user of usersEditor) {
    await security.user.delete(user);
  }
  for (const user of usersReader) {
    await security.user.delete(user);
  }
  await security.role.delete(roleEditor);
  await security.role.delete(roleReader);
}

export interface LoginAsInteractiveUserResponse {
  headers: {
    Cookie: string;
  };
  uid: string;
}
export async function loginAsInteractiveUser({
  getService,
  username = usersEditor[0],
}: Pick<FtrProviderContext, 'getService'> & {
  username?: (typeof usersEditor)[number] | (typeof usersReader)[number];
}): Promise<LoginAsInteractiveUserResponse> {
  const supertest = getService('supertestWithoutAuth');

  const response = await supertest
    .post('/internal/security/login')
    .set('kbn-xsrf', 'xxx')
    .send({
      providerType: 'basic',
      providerName: 'basic',
      currentURL: '/',
      params: { username, password: username },
    })
    .expect(200);
  const cookie = parseCookie(response.header['set-cookie'][0])!.cookieString();

  const { body: userWithProfileId } = await supertest
    .get('/internal/security/me')
    .set('Cookie', cookie)
    .expect(200);

  return { headers: { Cookie: cookie }, uid: userWithProfileId.profile_uid };
}
