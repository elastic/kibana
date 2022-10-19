/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import supertest from 'supertest';
import { Client, HttpConnection } from '@elastic/elasticsearch';
import { format as formatUrl } from 'url';

import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';

export function getSupertestWithoutAuth({ getService }: FtrProviderContext) {
  const config = getService('config');
  const kibanaUrl = config.get('servers.kibana');
  kibanaUrl.auth = null;
  kibanaUrl.password = null;

  return supertest(formatUrl(kibanaUrl));
}

export function getEsClientForAPIKey({ getService }: FtrProviderContext, esApiKey: string) {
  const config = getService('config');
  const url = formatUrl({ ...config.get('servers.elasticsearch'), auth: false });
  return new Client({
    nodes: [url],
    auth: {
      apiKey: esApiKey,
    },
    requestTimeout: config.get('timeouts.esRequestTimeout'),
    Connection: HttpConnection,
  });
}

export function setupFleetAndAgents(providerContext: FtrProviderContext) {
  before(async () => {
    // Use elastic/fleet-server service account to execute setup to verify privilege configuration
    const es = providerContext.getService('es');
    const { token } = await es.security.createServiceToken({
      namespace: 'elastic',
      service: 'fleet-server',
    });
    const supetestWithoutAuth = getSupertestWithoutAuth(providerContext);

    await supetestWithoutAuth
      .post(`/api/fleet/setup`)
      .set('kbn-xsrf', 'xxx')
      .set('Authorization', `Bearer ${token.value}`)
      .send()
      .expect(200);
    await supetestWithoutAuth
      .post(`/api/fleet/agents/setup`)
      .set('kbn-xsrf', 'xxx')
      .set('Authorization', `Bearer ${token.value}`)
      .send({ forceRecreate: true })
      .expect(200);
  });
}
