/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inspect } from 'util';

import expect from '@kbn/expect';
import { omit, orderBy } from 'lodash';
import { AgentConfigurationIntake } from '../../../../plugins/apm/common/agent_configuration/configuration_types';
import { AgentConfigSearchParams } from '../../../../plugins/apm/server/routes/settings/agent_configuration/route';

import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function agentConfigurationTests({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');

  const log = getService('log');

  const archiveName = 'apm_8.0.0';

  async function getEnvironments(serviceName: string) {
    return apmApiClient.readUser({
      endpoint: 'GET /api/apm/settings/agent-configuration/environments',
      params: { query: { serviceName } },
    });
  }

  function getAgentName(serviceName: string) {
    return apmApiClient.readUser({
      endpoint: 'GET /api/apm/settings/agent-configuration/agent_name',
      params: { query: { serviceName } },
    });
  }

  function searchConfigurations(configuration: AgentConfigSearchParams) {
    return apmApiClient.readUser({
      endpoint: 'POST /api/apm/settings/agent-configuration/search',
      params: { body: configuration },
    });
  }

  function getAllConfigurations() {
    return apmApiClient.readUser({ endpoint: 'GET /api/apm/settings/agent-configuration' });
  }

  function createConfiguration(configuration: AgentConfigurationIntake, { user = 'write' } = {}) {
    log.debug('creating configuration', configuration.service);
    const supertestClient = user === 'read' ? apmApiClient.readUser : apmApiClient.writeUser;

    return supertestClient({
      endpoint: 'PUT /api/apm/settings/agent-configuration',
      params: { body: configuration },
    });
  }

  function updateConfiguration(config: AgentConfigurationIntake, { user = 'write' } = {}) {
    log.debug('updating configuration', config.service);
    const supertestClient = user === 'read' ? apmApiClient.readUser : apmApiClient.writeUser;

    return supertestClient({
      endpoint: 'PUT /api/apm/settings/agent-configuration',
      params: { query: { overwrite: true }, body: config },
    });
  }

  function deleteConfiguration({ service }: AgentConfigurationIntake, { user = 'write' } = {}) {
    log.debug('deleting configuration', service);
    const supertestClient = user === 'read' ? apmApiClient.readUser : apmApiClient.writeUser;

    return supertestClient({
      endpoint: 'DELETE /api/apm/settings/agent-configuration',
      params: { body: { service } },
    });
  }

  registry.when(
    'agent configuration when no data is loaded',
    { config: 'basic', archives: [] },
    () => {
      it('handles the empty state for environments', async () => {
        const { body } = await getEnvironments('myservice');
        expect(body.environments).to.eql([{ name: 'ALL_OPTION_VALUE', alreadyConfigured: false }]);
      });

      it('handles the empty state for agent name', async () => {
        const { body } = await getAgentName('myservice');
        expect(body.agentName).to.eql(undefined);
      });

      describe('as a read-only user', () => {
        const newConfig = { service: {}, settings: { transaction_sample_rate: '0.55' } };
        it('does not allow creating config', async () => {
          await expectStatusCode(() => createConfiguration(newConfig, { user: 'read' }), 403);
        });

        describe('when a configuration already exists', () => {
          before(async () => createConfiguration(newConfig));
          after(async () => deleteConfiguration(newConfig));

          it('does not allow updating the config', async () => {
            await expectStatusCode(() => updateConfiguration(newConfig, { user: 'read' }), 403);
          });

          it('does not allow deleting the config', async () => {
            await expectStatusCode(() => deleteConfiguration(newConfig, { user: 'read' }), 403);
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
          await expectMissing(() => searchConfigurations(searchParams));

          // create config
          await createConfiguration(newConfig);

          // assert that config now exists
          await expectExists(() => searchConfigurations(searchParams));

          // delete config
          await deleteConfiguration(newConfig);

          // assert that config was deleted
          await expectMissing(() => searchConfigurations(searchParams));
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
            expect(omitTimestamp(body.configurations)).to.eql([
              {
                service: {},
                settings: { transaction_sample_rate: '0.55' },
                applied_by_agent: false,
                etag: 'eb88a8997666cc4b33745ef355a1bbd7c4782f2d',
              },
            ]);
          });

          it('can update the config', async () => {
            await updateConfiguration({
              service: {},
              settings: { transaction_sample_rate: '0.85' },
            });
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
          expect(
            orderBy(omitTimestamp(body.configurations), ['settings.transaction_sample_rate'])
          ).to.eql([
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
        let etag: string | undefined;

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

            return !!body._source.applied_by_agent;
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

            return !!body._source.applied_by_agent;
          }

          // wait until `applied_by_agent` has been updated in elasticsearch
          expect(await waitFor(hasBeenAppliedByAgent)).to.be(true);
        });
      });
    }
  );

  registry.when(
    'agent configuration when data is loaded',
    { config: 'basic', archives: [archiveName] },
    () => {
      it('returns the environments, all unconfigured', async () => {
        const { body } = await getEnvironments('opbeans-node');
        const { environments } = body;

        expect(environments.map((item: { name: string }) => item.name)).to.contain(
          'ALL_OPTION_VALUE'
        );

        expect(
          environments.every(
            (item: { alreadyConfigured: boolean }) => item.alreadyConfigured === false
          )
        ).to.be(true);

        expectSnapshot(body).toMatchInline(`
          Object {
            "environments": Array [
              Object {
                "alreadyConfigured": false,
                "name": "ALL_OPTION_VALUE",
              },
              Object {
                "alreadyConfigured": false,
                "name": "testing",
              },
            ],
          }
        `);
      });

      it('returns the agent name', async () => {
        const { body } = await getAgentName('opbeans-node');
        expect(body.agentName).to.eql('nodejs');
      });
    }
  );

  async function expectExists(fn: () => ReturnType<typeof searchConfigurations>) {
    const response = await fn();
    expect(response.body).not.to.be.empty();
  }

  async function expectMissing(fn: () => ReturnType<typeof searchConfigurations>) {
    const response = await fn();
    expect(response.body).to.be.empty();
  }
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

async function expectStatusCode(
  fn: () => Promise<{
    status: number;
  }>,
  statusCode: number
) {
  let res;
  try {
    res = await fn();
  } catch (e) {
    if (e && e.res && e.res.status) {
      if (e.res.status === statusCode) {
        return;
      }
      throw new Error(
        `Expected a [${statusCode}] response, got [${e.res.status}]: ${inspect(e.res)}`
      );
    } else {
      throw new Error(
        `Unexpected rejection value, expected error with .res response property: ${inspect(e)}`
      );
    }
  }

  expect(res.status).to.be(statusCode);
}
