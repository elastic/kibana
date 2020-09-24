/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect/expect.js';
import { FtrProviderContext } from '../../../../api_integration/ftr_provider_context';
import { setupIngest } from './services';
import { skipIfNoDockerRegistry } from '../../../helpers';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');

  describe('fleet upgrade agent', () => {
    skipIfNoDockerRegistry(providerContext);
    setupIngest(providerContext);
    before(async () => {
      await esArchiver.loadIfNeeded('fleet/agents');
    });
    after(async () => {
      await esArchiver.unload('fleet/agents');
    });

    it('should respond 200 to upgrade agent and update the agent SO', async () => {
      const kibanaVersionAccessor = kibanaServer.version;
      const kibanaVersion = await kibanaVersionAccessor.get();
      await supertest
        .post(`/api/ingest_manager/fleet/agents/agent1/upgrade`)
        .set('kbn-xsrf', 'xxx')
        .send({
          version: kibanaVersion,
          source_uri: 'http://path/to/download',
        })
        .expect(200);
      const res = await kibanaServer.savedObjects.get({
        type: 'fleet-agents',
        id: 'agent1',
      });
      expect(res.attributes.upgrade_started_at).to.be.ok();
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
