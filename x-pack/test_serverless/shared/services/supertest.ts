/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { format as formatUrl } from 'url';
import supertest from 'supertest';
import { FtrProviderContext } from '../../functional/ftr_provider_context';

/**
 * Returns supertest.SuperTest<supertest.Test> instance that will not persist cookie between API requests.
 */
export function SupertestProvider({ getService }: FtrProviderContext) {
  const config = getService('config');
  const kbnUrl = formatUrl(config.get('servers.kibana'));

  return supertest(kbnUrl);
}

/**
 * Returns supertest.SuperTest<supertest.Test> instance that will not persist cookie between API requests.
 * If you need to pass certificate, do the following:
 * await supertestWithoutAuth
 *   .get('/abc')
 *   .ca(CA_CERT)
 */
export function SupertestWithoutAuthProvider({ getService }: FtrProviderContext) {
  const config = getService('config');
  const kbnUrl = formatUrl({
    ...config.get('servers.kibana'),
    auth: false,
  });

  return supertest(kbnUrl);
}
