/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { format as formatUrl } from 'url';
import { FtrProviderContext } from '../../functional/ftr_provider_context';

import supertest from 'supertest';

export function SupertestProvider({ getService }: FtrProviderContext) {
    const config = getService('config');
    const kbnUrl = formatUrl(config.get('servers.kibana'));
    const cAuthorities = config.get('servers.kibana').certificateAuthorities

    return supertest.agent(kbnUrl, { ca: cAuthorities });
}

export function SupertestWithoutAuthProvider({ getService }: FtrProviderContext) {
  const config = getService('config');
  const kbnUrl = formatUrl({
    ...config.get('servers.kibana'),
    auth: false,
  });
  const cAuthorities = config.get('servers.kibana').certificateAuthorities

  return supertest.agent(kbnUrl,
    { ca: cAuthorities }
  );
}
