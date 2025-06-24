/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { FtrProviderContext } from '../ftr_provider_context';

export async function FleetAndAgents({ getService }: FtrProviderContext) {
  const es = getService('es');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  return {
    async setup() {
      // Use elastic/fleet-server service account to execute setup to verify privilege configuration
      const { token } = await es.security.createServiceToken({
        namespace: 'elastic',
        service: 'fleet-server',
      });

      await supertestWithoutAuth
        .post(`/api/fleet/setup`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '2023-10-31')
        .set('kbn-xsrf', 'xxx')
        .set('Authorization', `Bearer ${token.value}`)
        .send()
        .expect(200);
      await supertestWithoutAuth
        .post(`/api/fleet/agents/setup`)
        .set(ELASTIC_HTTP_VERSION_HEADER, '2023-10-31')
        .set('kbn-xsrf', 'xxx')
        .set('Authorization', `Bearer ${token.value}`)
        .send({ forceRecreate: true })
        .expect(200);
    },
  };
}
