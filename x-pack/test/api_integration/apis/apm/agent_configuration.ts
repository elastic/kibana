/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function featureControlsTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const log = getService('log');

  function searchConfigurations(configuration: any) {
    return supertest
      .post(`/api/apm/settings/agent-configuration/search`)
      .send(configuration)
      .set('kbn-xsrf', 'foo');
  }

  let createdConfigIds: any[] = [];
  async function createConfiguration(configuration: any) {
    const res = await supertest
      .post(`/api/apm/settings/agent-configuration/new`)
      .send(configuration)
      .set('kbn-xsrf', 'foo');

    createdConfigIds.push(res.body._id);

    return res;
  }

  function deleteCreatedConfigurations() {
    const promises = Promise.all(createdConfigIds.map(deleteConfiguration));
    createdConfigIds = [];
    return promises;
  }

  function deleteConfiguration(configurationId: string) {
    return supertest
      .delete(`/api/apm/settings/agent-configuration/${configurationId}`)
      .set('kbn-xsrf', 'foo');
  }

  describe('agent configuration', () => {
    describe('when creating four configurations', () => {
      before(async () => {
        log.debug('creating agent configuration');

        // all / all
        await createConfiguration({
          service: {},
          settings: { transaction_sample_rate: 0.1 },
        });

        // serviceaa / all
        await createConfiguration({
          service: { name: 'serviceaa' },
          settings: { transaction_sample_rate: 0.2 },
        });

        // all / production
        await createConfiguration({
          service: { environment: 'production' },
          settings: { transaction_sample_rate: 0.3 },
        });

        // serviceaa / production
        await createConfiguration({
          service: { name: 'serviceaa', environment: 'development' },
          settings: { transaction_sample_rate: 0.4 },
        });
      });

      after(async () => {
        log.debug('deleting agent configurations');
        await deleteCreatedConfigurations();
      });

      const agentsRequests = [
        {
          service: { name: 'servicebb', environment: 'staging' },
          expectedSettings: { transaction_sample_rate: 0.1 },
        },
        {
          service: { name: 'serviceaa', environment: 'production' },
          expectedSettings: { transaction_sample_rate: 0.2 },
        },
        {
          service: { name: 'servicec', environment: 'production' },
          expectedSettings: { transaction_sample_rate: 0.3 },
        },
        {
          service: { name: 'serviceaa', environment: 'development' },
          expectedSettings: { transaction_sample_rate: 0.4 },
        },
      ];

      for (const agentRequest of agentsRequests) {
        it(`${agentRequest.service.name} / ${agentRequest.service.environment}`, async () => {
          const { statusCode, body } = await searchConfigurations({
            service: agentRequest.service,
            etag: 'abc',
          });

          expect(statusCode).to.equal(200);
          expect(body._source.settings).to.eql(agentRequest.expectedSettings);
        });
      }
    });

    describe('when an agent retrieves a configuration', () => {
      before(async () => {
        log.debug('creating agent configuration');

        await createConfiguration({
          service: { name: 'myservice', environment: 'development' },
          settings: { transaction_sample_rate: 0.9 },
        });
      });

      after(async () => {
        log.debug('deleting agent configurations');
        await deleteCreatedConfigurations();
      });

      it(`should have 'applied_by_agent=false' on first request`, async () => {
        const { body } = await searchConfigurations({
          service: { name: 'myservice', environment: 'development' },
          etag: '7312bdcc34999629a3d39df24ed9b2a7553c0c39',
        });

        expect(body._source.applied_by_agent).to.be(false);
      });

      it(`should have 'applied_by_agent=true' on second request`, async () => {
        async function getAppliedByAgent() {
          const { body } = await searchConfigurations({
            service: { name: 'myservice', environment: 'development' },
            etag: '7312bdcc34999629a3d39df24ed9b2a7553c0c39',
          });

          return body._source.applied_by_agent;
        }

        // wait until `applied_by_agent` has been updated
        await waitFor(getAppliedByAgent);
      });
    });
  });
}

async function waitFor(cb: () => Promise<boolean>): Promise<undefined> {
  const res = await cb();
  if (!res) {
    await new Promise(resolve => setTimeout(resolve, 100));
    return waitFor(cb);
  }
}
