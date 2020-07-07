/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { omit, orderBy } from 'lodash';
import { AgentConfigurationIntake } from '../../../../plugins/apm/common/agent_configuration/configuration_types';
import { AgentConfigSearchParams } from '../../../../plugins/apm/server/routes/settings/agent_configuration';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function agentConfigurationTests({ getService }: FtrProviderContext) {
  const supertestRead = getService('supertestAsApmReadUser');
  const supertestWrite = getService('supertestAsApmWriteUser');
  const log = getService('log');
  const esArchiver = getService('esArchiver');

  function getServices() {
    return supertestRead
      .get(`/api/apm/settings/agent-configuration/services`)
      .set('kbn-xsrf', 'foo');
  }

  function getEnvironments(serviceName: string) {
    return supertestRead
      .get(`/api/apm/settings/agent-configuration/environments?serviceName=${serviceName}`)
      .set('kbn-xsrf', 'foo');
  }

  function getAgentName(serviceName: string) {
    return supertestRead
      .get(`/api/apm/settings/agent-configuration/agent_name?serviceName=${serviceName}`)
      .set('kbn-xsrf', 'foo');
  }

  function searchConfigurations(configuration: AgentConfigSearchParams) {
    return supertestRead
      .post(`/api/apm/settings/agent-configuration/search`)
      .send(configuration)
      .set('kbn-xsrf', 'foo');
  }

  function getAllConfigurations() {
    return supertestRead.get(`/api/apm/settings/agent-configuration`).set('kbn-xsrf', 'foo');
  }

  async function createConfiguration(config: AgentConfigurationIntake, { user = 'write' } = {}) {
    log.debug('creating configuration', config.service);
    const supertestClient = user === 'read' ? supertestRead : supertestWrite;

    const res = await supertestClient
      .put(`/api/apm/settings/agent-configuration`)
      .send(config)
      .set('kbn-xsrf', 'foo');

    throwOnError(res);

    return res;
  }

  async function updateConfiguration(config: AgentConfigurationIntake, { user = 'write' } = {}) {
    log.debug('updating configuration', config.service);
    const supertestClient = user === 'read' ? supertestRead : supertestWrite;

    const res = await supertestClient
      .put(`/api/apm/settings/agent-configuration?overwrite=true`)
      .send(config)
      .set('kbn-xsrf', 'foo');

    throwOnError(res);

    return res;
  }

  async function deleteConfiguration(
    { service }: AgentConfigurationIntake,
    { user = 'write' } = {}
  ) {
    log.debug('deleting configuration', service);
    const supertestClient = user === 'read' ? supertestRead : supertestWrite;

    const res = await supertestClient
      .delete(`/api/apm/settings/agent-configuration`)
      .send({ service })
      .set('kbn-xsrf', 'foo');

    throwOnError(res);

    return res;
  }

  function throwOnError(res: any) {
    const { statusCode, req, body } = res;
    if (statusCode !== 200) {
      const e = new Error(`
      Endpoint: ${req.method} ${req.path}
      Service: ${JSON.stringify(res.request._data.service)}
      Status code: ${statusCode}
      Response: ${body.message}`);

      // @ts-ignore
      e.res = res;

      throw e;
    }
  }

  describe('agent configuration', () => {
    describe('when no data is loaded', () => {
      it('handles the empty state for services', async () => {
        const { body } = await getServices();
        expect(body).to.eql(['ALL_OPTION_VALUE']);
      });

      it('handles the empty state for environments', async () => {
        const { body } = await getEnvironments('myservice');
        expect(body).to.eql([{ name: 'ALL_OPTION_VALUE', alreadyConfigured: false }]);
      });

      it('handles the empty state for agent names', async () => {
        const { body } = await getAgentName('myservice');
        expect(body).to.eql({});
      });
    });

    describe('when data is loaded', () => {
      before(() => esArchiver.load('8.0.0'));
      after(() => esArchiver.unload('8.0.0'));

      it('returns all services', async () => {
        const { body } = await getServices();
        expect(body).to.eql(['ALL_OPTION_VALUE', 'client', 'opbeans-java', 'opbeans-node']);
      });

      it('returns the environments', async () => {
        const { body } = await getEnvironments('opbeans-node');
        expect(body).to.eql([
          { name: 'ALL_OPTION_VALUE', alreadyConfigured: false },
          { name: 'production', alreadyConfigured: false },
        ]);
      });

      it('returns the agent names', async () => {
        const { body } = await getAgentName('opbeans-node');
        expect(body).to.eql({ agentName: 'nodejs' });
      });
    });

    describe('as a read-only user', () => {
      const newConfig = { service: {}, settings: { transaction_sample_rate: '0.55' } };
      it('throws when attempting to create config', async () => {
        try {
          await createConfiguration(newConfig, { user: 'read' });

          // ensure that `createConfiguration` throws
          expect(true).to.be(false);
        } catch (e) {
          expect(e.res.statusCode).to.be(404);
        }
      });

      describe('when a configuration already exists', () => {
        before(async () => createConfiguration(newConfig));
        after(async () => deleteConfiguration(newConfig));

        it('throws when attempting to update config', async () => {
          try {
            await updateConfiguration(newConfig, { user: 'read' });

            // ensure that `updateConfiguration` throws
            expect(true).to.be(false);
          } catch (e) {
            expect(e.res.statusCode).to.be(404);
          }
        });

        it('throws when attempting to delete config', async () => {
          try {
            await deleteConfiguration(newConfig, { user: 'read' });

            // ensure that `deleteConfiguration` throws
            expect(true).to.be(false);
          } catch (e) {
            expect(e.res.statusCode).to.be(404);
          }
        });
      });
    });

    describe('when creating one configuration', () => {
      const newConfig = {
        service: {},
        settings: { transaction_sample_rate: '0.55' },
      };

      const searchParams = {
        service: { name: 'myservice', environment: 'development' },
        etag: '7312bdcc34999629a3d39df24ed9b2a7553c0c39',
      };

      it('can create and delete config', async () => {
        // assert that config does not exist
        const res1 = await searchConfigurations(searchParams);
        expect(res1.status).to.equal(404);

        // assert that config was created
        await createConfiguration(newConfig);
        const res2 = await searchConfigurations(searchParams);
        expect(res2.status).to.equal(200);

        // assert that config was deleted
        await deleteConfiguration(newConfig);
        const res3 = await searchConfigurations(searchParams);
        expect(res3.status).to.equal(404);
      });

      describe('when a configuration exists', () => {
        before(async () => createConfiguration(newConfig));
        after(async () => deleteConfiguration(newConfig));

        it('can find the config', async () => {
          const { status, body } = await searchConfigurations(searchParams);
          expect(status).to.equal(200);
          expect(body._source.service).to.eql({});
          expect(body._source.settings).to.eql({ transaction_sample_rate: '0.55' });
        });

        it('can list the config', async () => {
          const { status, body } = await getAllConfigurations();
          expect(status).to.equal(200);
          expect(omitTimestamp(body)).to.eql([
            {
              service: {},
              settings: { transaction_sample_rate: '0.55' },
              applied_by_agent: false,
              etag: 'eb88a8997666cc4b33745ef355a1bbd7c4782f2d',
            },
          ]);
        });

        it('can update the config', async () => {
          await updateConfiguration({ service: {}, settings: { transaction_sample_rate: '0.85' } });
          const { status, body } = await searchConfigurations(searchParams);
          expect(status).to.equal(200);
          expect(body._source.service).to.eql({});
          expect(body._source.settings).to.eql({ transaction_sample_rate: '0.85' });
        });
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
        await Promise.all(configs.map((config) => createConfiguration(config)));
      });

      after(async () => {
        await Promise.all(configs.map((config) => deleteConfiguration(config)));
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

      it('can list all configs', async () => {
        const { status, body } = await getAllConfigurations();
        expect(status).to.equal(200);
        expect(orderBy(omitTimestamp(body), ['settings.transaction_sample_rate'])).to.eql([
          {
            service: {},
            settings: { transaction_sample_rate: '0.1' },
            applied_by_agent: false,
            etag: '0758cb18817de60cca29e07480d472694239c4c3',
          },
          {
            service: { name: 'my_service' },
            settings: { transaction_sample_rate: '0.2' },
            applied_by_agent: false,
            etag: 'e04737637056fdf1763bf0ef0d3fcb86e89ae5fc',
          },
          {
            service: { name: 'my_service', environment: 'development' },
            settings: { transaction_sample_rate: '0.3' },
            applied_by_agent: false,
            etag: 'af4dac62621b6762e6281481d1f7523af1124120',
          },
          {
            service: { environment: 'production' },
            settings: { transaction_sample_rate: '0.4' },
            applied_by_agent: false,
            etag: '8d1bf8e6b778b60af351117e2cf53fb1ee570068',
          },
          {
            service: { environment: 'development' },
            settings: { transaction_sample_rate: '0.5' },
            applied_by_agent: false,
            etag: '4ce40da57e3c71daca704121c784b911ec05ae81',
          },
        ]);
      });

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
    await new Promise((resolve) => setTimeout(resolve, 100));
    return waitFor(cb, retries - 1);
  }
  return res;
}

function omitTimestamp(configs: AgentConfigurationIntake[]) {
  return configs.map((config: AgentConfigurationIntake) => omit(config, '@timestamp'));
}
