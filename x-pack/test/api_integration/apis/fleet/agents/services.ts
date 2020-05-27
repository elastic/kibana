/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import supertestAsPromised from 'supertest-as-promised';
import { Client } from '@elastic/elasticsearch';
import { format as formatUrl } from 'url';

import { FtrProviderContext } from '../../../ftr_provider_context';

export function getSupertestWithoutAuth({ getService }: FtrProviderContext) {
  const config = getService('config');
  const kibanaUrl = config.get('servers.kibana');
  kibanaUrl.auth = null;
  kibanaUrl.password = null;

  return supertestAsPromised(formatUrl(kibanaUrl));
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
  });
}

export function setupIngest({ getService }: FtrProviderContext) {
  before(async () => {
    await getService('supertest').post(`/api/ingest_manager/setup`).set('kbn-xsrf', 'xxx').send();
    await getService('supertest')
      .post(`/api/ingest_manager/fleet/setup`)
      .set('kbn-xsrf', 'xxx')
      .send({ forceRecreate: true });
  });
}
