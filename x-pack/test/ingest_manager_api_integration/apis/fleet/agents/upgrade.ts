/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../../../api_integration/ftr_provider_context';
import { setupIngest } from './services';
import { skipIfNoDockerRegistry } from '../../../helpers';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const kibanaVersionAccessor = kibanaServer.version;
  let kibanaVersion: string;

  describe('fleet upgrade agent', () => {
    skipIfNoDockerRegistry(providerContext);
    setupIngest(providerContext);
    before(async () => {
      await esArchiver.loadIfNeeded('fleet/agents');
      kibanaVersion = await kibanaVersionAccessor.get();
    });
    after(async () => {
      await esArchiver.unload('fleet/agents');
    });

    it('should respond 200 to upgrade agent with valid parameters', async () => {
      await supertest
        .post(`/api/ingest_manager/fleet/agents/agent1/upgrade`)
        .set('kbn-xsrf', 'xxx')
        .send({
          version: kibanaVersion,
          source_uri: 'http://path/to/download',
        })
        .expect(200);
    });

    it('should respond 400 if trying to upgrade to a version that does not match installed kibana version', async () => {
      await supertest
        .post(`/api/ingest_manager/fleet/agents/agent1/upgrade`)
        .set('kbn-xsrf', 'xxx')
        .send({
          version: '8.0.1',
          source_uri: 'http://path/to/download',
        })
        .expect(400);
    });
  });
}
