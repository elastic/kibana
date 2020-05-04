/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { AgentConfigurationIntake } from '../../../../plugins/apm/common/agent_configuration/configuration_types';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function agentConfigurationTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const log = getService('log');

  function searchConfigurations(configuration: any) {
    return supertest
      .post(`/api/apm/settings/agent-configuration/search`)
      .send(configuration)
      .set('kbn-xsrf', 'foo');
  }

  async function createConfiguration(config: AgentConfigurationIntake) {
    log.debug('creating configuration', config.service);
    const res = await supertest
      .put(`/api/apm/settings/agent-configuration`)
      .send(config)
      .set('kbn-xsrf', 'foo');

    throwOnError(res);

    return res;
  }

  async function updateConfiguration(config: AgentConfigurationIntake) {
    log.debug('updating configuration', config.service);
    const res = await supertest
      .put(`/api/apm/settings/agent-configuration?overwrite=true`)
      .send(config)
      .set('kbn-xsrf', 'foo');

    throwOnError(res);

    return res;
  }

  async function deleteConfiguration({ service }: AgentConfigurationIntake) {
    log.debug('deleting configuration', service);
    const res = await supertest
      .delete(`/api/apm/settings/agent-configuration`)
      .send({ service })
      .set('kbn-xsrf', 'foo');

    throwOnError(res);

    return res;
  }

  function throwOnError(res: any) {
    const { statusCode, req, body } = res;
    if (statusCode !== 200) {
      throw new Error(`
      Endpoint: ${req.method} ${req.path}
      Service: ${JSON.stringify(res.request._data.service)}
      Status code: ${statusCode}
      Response: ${body.message}`);
    }
  }

  describe('agent configuration', () => {
    describe('when creating one configuration', () => {
      const newConfig = {
        service: {},
        settings: { transaction_sample_rate: '0.55' },
      };

      const searchParams = {
        service: { name: 'myservice', environment: 'development' },
        etag: '7312bdcc34999629a3d39df24ed9b2a7553c0c39',
      };

      before(async () => {
        await createConfiguration(newConfig);
      });

      it('can find the created config', async () => {
        const { status, body } = await searchConfigurations(searchParams);
        expect(status).to.equal(200);
        expect(body._source.service).to.eql({});
        expect(body._source.settings).to.eql({ transaction_sample_rate: '0.55' });
      });

      it('can update the created config', async () => {
        await updateConfiguration({ service: {}, settings: { transaction_sample_rate: '0.85' } });

        const { status, body } = await searchConfigurations(searchParams);
        expect(status).to.equal(200);
        expect(body._source.service).to.eql({});
        expect(body._source.settings).to.eql({ transaction_sample_rate: '0.85' });
      });

      it('can delete the created config', async () => {
        await deleteConfiguration(newConfig);
        const { status } = await searchConfigurations(searchParams);
        expect(status).to.equal(404);
      });
    });

    describe('when creating multiple configurations', () => {
      const configs = [
        {
          service: {},
          settings: { transaction_sample_rate: '0.1' },
        },
        {
          service: { name: 'my_service' },
          settings: { transaction_sample_rate: '0.2' },
        },
        {
          service: { name: 'my_service', environment: 'development' },
          settings: { transaction_sample_rate: '0.3' },
        },
        {
          service: { environment: 'production' },
          settings: { transaction_sample_rate: '0.4' },
        },
        {
          service: { environment: 'development' },
          settings: { transaction_sample_rate: '0.5' },
        },
      ];

      before(async () => {
        await Promise.all(configs.map(config => createConfiguration(config)));
      });

      after(async () => {
        await Promise.all(configs.map(config => deleteConfiguration(config)));
      });

      const agentsRequests = [
        {
          service: { name: 'non_existing_service', environment: 'non_existing_env' },
          expectedSettings: { transaction_sample_rate: '0.1' },
        },
        {
          service: { name: 'my_service', environment: 'non_existing_env' },
          expectedSettings: { transaction_sample_rate: '0.2' },
        },
        {
          service: { name: 'my_service', environment: 'production' },
          expectedSettings: { transaction_sample_rate: '0.2' },
        },
        {
          service: { name: 'my_service', environment: 'development' },
          expectedSettings: { transaction_sample_rate: '0.3' },
        },
        {
          service: { name: 'non_existing_service', environment: 'production' },
          expectedSettings: { transaction_sample_rate: '0.4' },
        },
        {
          service: { name: 'non_existing_service', environment: 'development' },
          expectedSettings: { transaction_sample_rate: '0.5' },
        },
      ];

      for (const agentRequest of agentsRequests) {
        it(`${agentRequest.service.name} / ${agentRequest.service.environment}`, async () => {
          const { status, body } = await searchConfigurations({
            service: agentRequest.service,
            etag: 'abc',
          });

          expect(status).to.equal(200);
          expect(body._source.settings).to.eql(agentRequest.expectedSettings);
        });
      }
    });

    describe('when an agent retrieves a configuration', () => {
      const config = {
        service: { name: 'myservice', environment: 'development' },
        settings: { transaction_sample_rate: '0.9' },
      };
      const configProduction = {
        service: { name: 'myservice', environment: 'production' },
        settings: { transaction_sample_rate: '0.9' },
      };
      let etag: string;

      before(async () => {
        log.debug('creating agent configuration');
        await createConfiguration(config);
        await createConfiguration(configProduction);
      });

      after(async () => {
        await deleteConfiguration(config);
        await deleteConfiguration(configProduction);
      });

      it(`should have 'applied_by_agent=false' before supplying etag`, async () => {
        const res1 = await searchConfigurations({
          service: { name: 'myservice', environment: 'development' },
        });

        etag = res1.body._source.etag;

        const res2 = await searchConfigurations({
          service: { name: 'myservice', environment: 'development' },
          etag,
        });

        expect(res1.body._source.applied_by_agent).to.be(false);
        expect(res2.body._source.applied_by_agent).to.be(false);
      });

      it(`should have 'applied_by_agent=true' after supplying etag`, async () => {
        await searchConfigurations({
          service: { name: 'myservice', environment: 'development' },
          etag,
        });

        async function hasBeenAppliedByAgent() {
          const { body } = await searchConfigurations({
            service: { name: 'myservice', environment: 'development' },
          });

          return body._source.applied_by_agent;
        }

        // wait until `applied_by_agent` has been updated in elasticsearch
        expect(await waitFor(hasBeenAppliedByAgent)).to.be(true);
      });
      it(`should have 'applied_by_agent=false' before marking as applied`, async () => {
        const res1 = await searchConfigurations({
          service: { name: 'myservice', environment: 'production' },
        });

        expect(res1.body._source.applied_by_agent).to.be(false);
      });
      it(`should have 'applied_by_agent=true' when 'mark_as_applied_by_agent' attribute is true`, async () => {
        await searchConfigurations({
          service: { name: 'myservice', environment: 'production' },
          mark_as_applied_by_agent: true,
        });

        async function hasBeenAppliedByAgent() {
          const { body } = await searchConfigurations({
            service: { name: 'myservice', environment: 'production' },
          });

          return body._source.applied_by_agent;
        }

        // wait until `applied_by_agent` has been updated in elasticsearch
        expect(await waitFor(hasBeenAppliedByAgent)).to.be(true);
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
