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

export async function loginAsInteractiveUser({
  getService,
}: Pick<FtrProviderContext, 'getService'>): Promise<{
  Cookie: string;
}> {
  const config = getService('config');
  const supertest = getService('supertestWithoutAuth');

  const username = config.get('servers.kibana.username');
  const password = config.get('servers.kibana.password');
  const response = await supertest
    .post('/internal/security/login')
    .set('kbn-xsrf', 'xxx')
    .send({
      providerType: 'basic',
      providerName: 'basic',
      currentURL: '/',
      params: { username, password },
    })
    .expect(200);
  const cookie = parseCookie(response.header['set-cookie'][0])!.cookieString();

  return { Cookie: cookie };
}
