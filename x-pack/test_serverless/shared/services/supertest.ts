/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { format as formatUrl } from 'url';
import supertest from 'supertest';
import { FtrProviderContext } from '../../functional/ftr_provider_context';

export function SupertestProvider({ getService }: FtrProviderContext) {
  const config = getService('config');
  const kbnUrl = formatUrl(config.get('servers.kibana'));
  const cAuthorities = config.get('servers.kibana').certificateAuthorities;

  return supertest.agent(kbnUrl, { ca: cAuthorities });
}

export function SupertestWithoutAuthProvider({ getService }: FtrProviderContext) {
  const config = getService('config');
  const kbnUrl = formatUrl({
    ...config.get('servers.kibana'),
    auth: false,
  });
  const cAuthorities = config.get('servers.kibana').certificateAuthorities;

  return supertest.agent(kbnUrl, { ca: cAuthorities });
}
