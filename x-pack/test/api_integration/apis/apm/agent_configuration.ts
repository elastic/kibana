/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { AgentConfigurationIntake } from '../../../../legacy/plugins/apm/server/lib/settings/agent_configuration/configuration_types';

export default function agentConfigurationTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const log = getService('log');

  function searchConfigurations(configuration: any) {
    return supertest
      .post(`/api/apm/settings/agent-configuration/search`)
      .send(configuration)
      .set('kbn-xsrf', 'foo');
  }

  let createdConfigs: AgentConfigurationIntake[] = [];
  async function createConfiguration(config: any) {
    log.debug('creating configuration', config.service);
    const res = await supertest
      .put(`/api/apm/settings/agent-configuration`)
      .send(config)
      .set('kbn-xsrf', 'foo');

    if (res.statusCode !== 200) {
      throw new Error(
        `Could not create config ${JSON.stringify(config.service)}. Received statuscode ${
          res.statusCode
        } and message: ${JSON.stringify(res.body)}`
      );
    }

    createdConfigs.push(config);
    return res;
  }

  async function updateConfiguration(config: any) {
    log.debug('updating configuration', config.service);
    const res = await supertest
      .put(`/api/apm/settings/agent-configuration?overwrite=true`)
      .send(config)
      .set('kbn-xsrf', 'foo');

    if (res.statusCode !== 200) {
      throw new Error(
        `Could not update config ${JSON.stringify(config.service)}. Received statuscode ${
          res.statusCode
        } and message: ${JSON.stringify(res.body)}`
      );
    }

    return res;
  }

  async function deleteCreatedConfigurations() {
    const promises = Promise.all(createdConfigs.map(deleteConfiguration));
    return promises;
  }

  async function deleteConfiguration({ service }: AgentConfigurationIntake) {
    log.debug('deleting configuration', service);
    const res = await supertest
      .delete(`/api/apm/settings/agent-configuration`)
      .send({ service })
      .set('kbn-xsrf', 'foo');

    createdConfigs = createdConfigs.filter(c => {
      const isMatch =
        c.service.name === service.name && c.service.environment === service.environment;

      return !isMatch;
    });

    if (res.statusCode !== 200) {
      throw new Error(
        `Could not delete config ${JSON.stringify(service)}. Received statuscode ${
          res.statusCode
        } and message: ${JSON.stringify(res.body)}`
      );
    }

    return res;
  }

  describe('agent configuration', () => {
    describe('when creating one configuration', () => {
      const newConfig = {
        service: {},
        settings: { transaction_sample_rate: 0.55 },
      };

      const searchParams = {
        service: { name: 'myservice', environment: 'development' },
        etag: '7312bdcc34999629a3d39df24ed9b2a7553c0c39',
      };

      before(async () => {
        await createConfiguration(newConfig);
      });

      after(async () => {
        await deleteCreatedConfigurations();
      });

      it('can find the created config', async () => {
        const { statusCode, body } = await searchConfigurations(searchParams);
        expect(statusCode).to.equal(200);
        expect(body._source.service).to.eql({});
        expect(body._source.settings).to.eql({ transaction_sample_rate: 0.55 });
      });

      it('can update the created config', async () => {
        await updateConfiguration({ service: {}, settings: { transaction_sample_rate: 0.85 } });

        const { statusCode, body } = await searchConfigurations(searchParams);
        expect(statusCode).to.equal(200);
        expect(body._source.service).to.eql({});
        expect(body._source.settings).to.eql({ transaction_sample_rate: 0.85 });
      });

      it('can delete the created config', async () => {
        await deleteConfiguration(newConfig);
        const { statusCode } = await searchConfigurations(searchParams);
        expect(statusCode).to.equal(404);
      });
    });

    describe('when creating multiple configurations', () => {
      before(async () => {
        // all / all
        await createConfiguration({
          service: {},
          settings: { transaction_sample_rate: 0.1 },
        });

        // my_service / all
        await createConfiguration({
          service: { name: 'my_service' },
          settings: { transaction_sample_rate: 0.2 },
        });

        // all / production
        await createConfiguration({
          service: { environment: 'production' },
          settings: { transaction_sample_rate: 0.3 },
        });

        // all / production
        await createConfiguration({
          service: { environment: 'development' },
          settings: { transaction_sample_rate: 0.4 },
        });

        // my_service / production
        await createConfiguration({
          service: { name: 'my_service', environment: 'development' },
          settings: { transaction_sample_rate: 0.5 },
        });
      });

      after(async () => {
        await deleteCreatedConfigurations();
      });

      const agentsRequests = [
        {
          service: { name: 'non_existing_service', environment: 'non_existing_env' },
          expectedSettings: { transaction_sample_rate: 0.1 },
        },
        {
          service: { name: 'my_service', environment: 'production' },
          expectedSettings: { transaction_sample_rate: 0.2 },
        },
        {
          service: { name: 'non_existing_service', environment: 'production' },
          expectedSettings: { transaction_sample_rate: 0.3 },
        },
        {
          service: { name: 'non_existing_service', environment: 'development' },
          expectedSettings: { transaction_sample_rate: 0.4 },
        },
        {
          service: { name: 'my_service', environment: 'development' },
          expectedSettings: { transaction_sample_rate: 0.5 },
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

        // wait until `applied_by_agent` has been updated in elasticsearch
        expect(await waitFor(getAppliedByAgent)).to.be(true);
      });
    });
  });
}

async function waitFor(cb: () => Promise<boolean>, retries = 50): Promise<boolean> {
  if (retries === 0) {
    throw new Error(`Maximum number of retries reached`);
  }

  const res = await cb();
  if (!res) {
    await new Promise(resolve => setTimeout(resolve, 100));
    return waitFor(cb, retries - 1);
  }
  return res;
}
