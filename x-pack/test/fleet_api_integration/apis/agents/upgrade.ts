/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import semver from 'semver';
import moment from 'moment';
import { AGENTS_INDEX, PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';

import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry, generateAgent, makeSnapshotVersion } from '../../helpers';
import { testUsers } from '../test_users';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const es = getService('es');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const fleetAndAgents = getService('fleetAndAgents');

  describe('fleet_upgrade_agent', () => {
    skipIfNoDockerRegistry(providerContext);
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/fleet/agents');
      await fleetAndAgents.setup();
    });

    beforeEach(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/fleet/agents');
      await supertest
        .post(`/api/fleet/agent_download_sources`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'My download source',
          host: 'http://custom-registry-test',
          is_default: true,
        })
        .expect(200);
      const { body: response } = await supertest
        .get(`/api/fleet/agent_download_sources`)
        .expect(200);

      const defaultDownloadSource = response.items.find((item: any) => item.is_default);

      if (!defaultDownloadSource) {
        throw new Error('default source_uri not set');
      }
    });
    afterEach(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/agents');
    });
    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/agents');
    });

    describe('one agent', () => {
      const fleetServerVersion = '7.16.0';

      beforeEach(async () => {
        await supertest.post(`/api/fleet/agent_policies`).set('kbn-xsrf', 'kibana').send({
          name: 'Fleet Server policy 1',
          id: 'fleet-server-policy',
          namespace: 'default',
          has_fleet_server: true,
        });

        await kibanaServer.savedObjects.create({
          id: `package-policy-test`,
          type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
          overwrite: true,
          attributes: {
            policy_id: 'fleet-server-policy',
            name: 'Fleet Server',
            package: {
              name: 'fleet_server',
            },
          },
        });
        await generateAgent(
          providerContext,
          'healthy',
          'agentWithFS',
          'fleet-server-policy',
          fleetServerVersion
        );
      });

      it('should respond 200 to upgrade agent and update the agent SO', async () => {
        await es.update({
          id: 'agent1',
          refresh: 'wait_for',
          index: AGENTS_INDEX,
          body: {
            doc: {
              local_metadata: { elastic: { agent: { upgradeable: true, version: '0.0.0' } } },
            },
          },
        });
        await supertest
          .post(`/api/fleet/agents/agent1/upgrade`)
          .set('kbn-xsrf', 'xxx')
          .send({
            version: fleetServerVersion,
          })
          .expect(200);

        const res = await supertest.get(`/api/fleet/agents/agent1`).set('kbn-xsrf', 'xxx');
        expect(typeof res.body.item.upgrade_started_at).to.be('string');
      });

      it('should allow to upgrade a Fleet server agent to a version > fleet server version', async () => {
        const kibanaVersion = await kibanaServer.version.get();
        await supertest
          .post(`/api/fleet/agents/agentWithFS/upgrade`)
          .set('kbn-xsrf', 'xxx')
          .send({
            version: kibanaVersion,
          })
          .expect(200);

        const res = await supertest.get(`/api/fleet/agents/agentWithFS`).set('kbn-xsrf', 'xxx');
        expect(typeof res.body.item.upgrade_started_at).to.be('string');
      });

      it('should respond 400 if upgrading agent with version the same as snapshot version', async () => {
        const fleetServerVersionSnapshot = makeSnapshotVersion(fleetServerVersion);
        await es.update({
          id: 'agent1',
          refresh: 'wait_for',
          index: AGENTS_INDEX,
          body: {
            doc: {
              local_metadata: {
                elastic: { agent: { upgradeable: true, version: fleetServerVersion } },
              },
            },
          },
        });
        const res = await supertest
          .post(`/api/fleet/agents/agent1/upgrade`)
          .set('kbn-xsrf', 'xxx')
          .send({
            version: fleetServerVersionSnapshot,
          })
          .expect(400);
        expect(res.body.message).to.equal(
          'Agent agent1 is not upgradeable: agent is already running on the selected version.'
        );
      });

      it('should respond 200 if upgrading agent with version the same as snapshot version and force flag is passed', async () => {
        const fleetServerVersionSnapshot = makeSnapshotVersion(fleetServerVersion);
        await es.update({
          id: 'agent1',
          refresh: 'wait_for',
          index: AGENTS_INDEX,
          body: {
            doc: {
              local_metadata: {
                elastic: { agent: { upgradeable: true, version: fleetServerVersion } },
              },
            },
          },
        });
        await supertest
          .post(`/api/fleet/agents/agent1/upgrade`)
          .set('kbn-xsrf', 'xxx')
          .send({
            version: fleetServerVersionSnapshot,
            force: true,
          })
          .expect(200);
      });

      it('should respond 200 if upgrading agent with version less than kibana snapshot version', async () => {
        const fleetServerVersionSnapshot = makeSnapshotVersion(fleetServerVersion);

        await es.update({
          id: 'agent1',
          refresh: 'wait_for',
          index: AGENTS_INDEX,
          body: {
            doc: {
              local_metadata: { elastic: { agent: { upgradeable: true, version: '0.0.0' } } },
            },
          },
        });
        await supertest
          .post(`/api/fleet/agents/agent1/upgrade`)
          .set('kbn-xsrf', 'xxx')
          .send({
            version: fleetServerVersionSnapshot,
          })
          .expect(200);
      });

      it('should respond 200 if trying to upgrade with source_uri set', async () => {
        await es.update({
          id: 'agent1',
          refresh: 'wait_for',
          index: AGENTS_INDEX,
          body: {
            doc: {
              local_metadata: { elastic: { agent: { upgradeable: true, version: '0.0.0' } } },
            },
          },
        });
        await supertest
          .post(`/api/fleet/agents/agent1/upgrade`)
          .set('kbn-xsrf', 'xxx')
          .send({
            version: fleetServerVersion,
            source_uri: 'http://path/to/download',
          })
          .expect(200);
        const actionsRes = await es.search({
          index: '.fleet-actions',
          body: {
            sort: [{ '@timestamp': { order: 'desc' } }],
          },
        });
        const action: any = actionsRes.hits.hits[0]._source;
        expect(action.data.sourceURI).contain('http://path/to/download');
      });

      it('should respond 400 if trying to upgrade to a version that does not match installed kibana version', async () => {
        const kibanaVersion = await kibanaServer.version.get();
        const higherVersion = semver.inc(kibanaVersion, 'patch');
        await supertest
          .post(`/api/fleet/agents/agent1/upgrade`)
          .set('kbn-xsrf', 'xxx')
          .send({
            version: higherVersion,
          })
          .expect(400);
      });

      it('should respond 400 if trying to downgrade version', async () => {
        await es.update({
          id: 'agent1',
          refresh: 'wait_for',
          index: AGENTS_INDEX,
          body: {
            doc: {
              local_metadata: { elastic: { agent: { upgradeable: true, version: '7.0.0' } } },
            },
          },
        });
        const res = await supertest
          .post(`/api/fleet/agents/agent1/upgrade`)
          .set('kbn-xsrf', 'xxx')
          .send({
            version: '6.0.0',
          })
          .expect(400);
        expect(res.body.message).to.equal(
          'Agent agent1 is not upgradeable: agent does not support downgrades.'
        );
      });

      it('should respond 400 if trying to upgrade an agent that is unenrolling', async () => {
        await supertest.post(`/api/fleet/agents/agent1/unenroll`).set('kbn-xsrf', 'xxx').send({
          revoke: true,
        });
        const res = await supertest
          .post(`/api/fleet/agents/agent1/upgrade`)
          .set('kbn-xsrf', 'xxx')
          .send({
            version: fleetServerVersion,
          })
          .expect(400);
        expect(res.body.message).to.equal('cannot upgrade an unenrolling or unenrolled agent');
      });

      it('should respond 400 if trying to upgrade an agent that is unenrolled', async () => {
        await es.update({
          id: 'agent1',
          refresh: 'wait_for',
          index: AGENTS_INDEX,
          body: {
            doc: {
              unenrolled_at: new Date().toISOString(),
            },
          },
        });
        const res = await supertest
          .post(`/api/fleet/agents/agent1/upgrade`)
          .set('kbn-xsrf', 'xxx')
          .send({
            version: fleetServerVersion,
          })
          .expect(400);
        expect(res.body.message).to.equal('cannot upgrade an unenrolling or unenrolled agent');
      });

      it('should respond 400 if trying to upgrade an agent that is not upgradeable', async () => {
        const res = await supertest
          .post(`/api/fleet/agents/agent1/upgrade`)
          .set('kbn-xsrf', 'xxx')
          .send({
            version: fleetServerVersion,
          })
          .expect(400);
        expect(res.body.message).to.equal(
          'Agent agent1 is not upgradeable: agent cannot be upgraded through Fleet. It may be running in a container or it is not installed as a service.'
        );
      });

      it('enrolled in a hosted agent policy should respond 400 to upgrade and not update the agent SOs', async () => {
        // update enrolled policy to hosted
        await supertest.put(`/api/fleet/agent_policies/policy1`).set('kbn-xsrf', 'xxxx').send({
          name: 'Test policy',
          namespace: 'default',
          is_managed: true,
        });

        await es.update({
          id: 'agent1',
          refresh: 'wait_for',
          index: AGENTS_INDEX,
          body: {
            doc: {
              local_metadata: { elastic: { agent: { upgradeable: true, version: '0.0.0' } } },
            },
          },
        });
        // attempt to upgrade agent in hosted agent policy
        const { body } = await supertest
          .post(`/api/fleet/agents/agent1/upgrade`)
          .set('kbn-xsrf', 'xxx')
          .send({ version: fleetServerVersion })
          .expect(400);
        expect(body.message).to.contain(
          'Cannot upgrade agent agent1 in hosted agent policy policy1'
        );

        const agent1data = await supertest.get(`/api/fleet/agents/agent1`);
        expect(typeof agent1data.body.item.upgrade_started_at).to.be('undefined');
      });

      it('should respond 403 if user lacks fleet all permissions', async () => {
        await es.update({
          id: 'agent1',
          refresh: 'wait_for',
          index: AGENTS_INDEX,
          body: {
            doc: {
              local_metadata: { elastic: { agent: { upgradeable: true, version: '0.0.0' } } },
            },
          },
        });
        await supertestWithoutAuth
          .post(`/api/fleet/agents/agent1/upgrade`)
          .set('kbn-xsrf', 'xxx')
          .auth(testUsers.fleet_no_access.username, testUsers.fleet_no_access.password)
          .send({
            version: fleetServerVersion,
          })
          .expect(403);
      });

      it('should respond 429 if trying to upgrade a recently upgraded agent', async () => {
        await es.update({
          id: 'agent1',
          refresh: 'wait_for',
          index: AGENTS_INDEX,
          body: {
            doc: {
              upgraded_at: new Date(Date.now() - 9 * 6e4).toISOString(),
              local_metadata: {
                elastic: {
                  agent: {
                    upgradeable: true,
                    version: '0.0.0',
                  },
                },
              },
            },
          },
        });
        const response = await supertest
          .post(`/api/fleet/agents/agent1/upgrade`)
          .set('kbn-xsrf', 'xxx')
          .send({
            version: fleetServerVersion,
          })
          .expect(429);

        expect(response.body.message).to.contain('was upgraded less than 10 minutes ago');

        // We don't know how long this test will take to run, so we can't really assert on the actual elapsed time here
        expect(response.body.message).to.match(/please wait \d{2}m\d{2}s/i);

        expect(response.header['retry-after']).to.match(/^\d+$/);
      });

      it('should respond 429 if trying to upgrade a recently upgraded agent with force flag', async () => {
        await es.update({
          id: 'agent1',
          refresh: 'wait_for',
          index: AGENTS_INDEX,
          body: {
            doc: {
              upgraded_at: new Date(Date.now() - 9 * 6e4).toISOString(),
              local_metadata: {
                elastic: {
                  agent: {
                    upgradeable: true,
                    version: '0.0.0',
                  },
                },
              },
            },
          },
        });
        await supertest
          .post(`/api/fleet/agents/agent1/upgrade`)
          .set('kbn-xsrf', 'xxx')
          .send({
            version: fleetServerVersion,
            force: true,
          })
          .expect(429);
      });

      it('should respond 200 if trying to upgrade a recently upgraded agent with skipRateLimitCheck flag', async () => {
        await es.update({
          id: 'agent1',
          refresh: 'wait_for',
          index: AGENTS_INDEX,
          body: {
            doc: {
              upgraded_at: new Date(Date.now() - 9 * 6e4).toISOString(),
              local_metadata: {
                elastic: {
                  agent: {
                    upgradeable: true,
                    version: '0.0.0',
                  },
                },
              },
            },
          },
        });
        await supertest
          .post(`/api/fleet/agents/agent1/upgrade`)
          .set('kbn-xsrf', 'xxx')
          .send({
            version: fleetServerVersion,
            skipRateLimitCheck: true,
          })
          .expect(200);
      });

      it('should respond 200 if trying to upgrade an agent that was upgraded more than 10 minutes ago', async () => {
        await es.update({
          id: 'agent1',
          refresh: 'wait_for',
          index: AGENTS_INDEX,
          body: {
            doc: {
              local_metadata: {
                elastic: {
                  agent: {
                    upgradeable: true,
                    upgraded_at: new Date(Date.now() - 11 * 6e4).toString(),
                    version: '0.0.0',
                  },
                },
              },
            },
          },
        });
        await supertest
          .post(`/api/fleet/agents/agent1/upgrade`)
          .set('kbn-xsrf', 'xxx')
          .send({
            version: fleetServerVersion,
          })
          .expect(200);
      });

      it('should respond 400 if trying to upgrade an already upgrading agent with no upgrade details', async () => {
        await es.update({
          id: 'agent1',
          refresh: 'wait_for',
          index: AGENTS_INDEX,
          body: {
            doc: {
              upgrade_started_at: new Date(Date.now() - 9 * 6e4).toISOString(),
              local_metadata: {
                elastic: {
                  agent: {
                    upgradeable: true,
                    version: '0.0.0',
                  },
                },
              },
            },
          },
        });
        const response = await supertest
          .post(`/api/fleet/agents/agent1/upgrade`)
          .set('kbn-xsrf', 'xxx')
          .send({
            version: fleetServerVersion,
          })
          .expect(400);

        expect(response.body.message).to.contain('is already upgrading');
      });

      it('should respond 200 if trying to upgrade an already upgrading agent with no upgrade details with force flag', async () => {
        await es.update({
          id: 'agent1',
          refresh: 'wait_for',
          index: AGENTS_INDEX,
          body: {
            doc: {
              upgrade_started_at: new Date(Date.now() - 9 * 6e4).toISOString(),
              local_metadata: {
                elastic: {
                  agent: {
                    upgradeable: true,
                    version: '0.0.0',
                  },
                },
              },
            },
          },
        });
        await supertest
          .post(`/api/fleet/agents/agent1/upgrade`)
          .set('kbn-xsrf', 'xxx')
          .send({
            version: fleetServerVersion,
            force: true,
          })
          .expect(200);
      });

      it('should respond 400 if trying to upgrade an already upgrading agent with upgrade details', async () => {
        await es.update({
          id: 'agent1',
          refresh: 'wait_for',
          index: AGENTS_INDEX,
          body: {
            doc: {
              local_metadata: {
                elastic: {
                  agent: {
                    upgradeable: true,
                    version: '0.0.0',
                  },
                },
              },
              upgrade_details: {
                target_version: fleetServerVersion,
                action_id: 'XXX',
                state: 'UPG_REQUESTED',
              },
            },
          },
        });
        const response = await supertest
          .post(`/api/fleet/agents/agent1/upgrade`)
          .set('kbn-xsrf', 'xxx')
          .send({
            version: fleetServerVersion,
          })
          .expect(400);

        expect(response.body.message).to.contain('is already upgrading');
      });

      it('should respond 200 if trying to upgrade an already upgrading agent with upgrade details with force flag', async () => {
        await es.update({
          id: 'agent1',
          refresh: 'wait_for',
          index: AGENTS_INDEX,
          body: {
            doc: {
              local_metadata: {
                elastic: {
                  agent: {
                    upgradeable: true,
                    version: '0.0.0',
                  },
                },
              },
              upgrade_details: {
                target_version: fleetServerVersion,
                action_id: 'XXX',
                state: 'UPG_REQUESTED',
              },
            },
          },
        });
        await supertest
          .post(`/api/fleet/agents/agent1/upgrade`)
          .set('kbn-xsrf', 'xxx')
          .send({
            version: fleetServerVersion,
            force: true,
          })
          .expect(200);
      });

      it('should respond 200 if trying to upgrade an agent with a failed upgrade status', async () => {
        await es.update({
          id: 'agent1',
          refresh: 'wait_for',
          index: AGENTS_INDEX,
          body: {
            doc: {
              local_metadata: {
                elastic: {
                  agent: {
                    upgradeable: true,
                    version: '0.0.0',
                  },
                },
              },
              upgrade_details: {
                target_version: fleetServerVersion,
                action_id: 'XXX',
                state: 'UPG_FAILED',
                metadata: {
                  error_msg: 'Upgrade timed out',
                },
              },
            },
          },
        });
        await supertest
          .post(`/api/fleet/agents/agent1/upgrade`)
          .set('kbn-xsrf', 'xxx')
          .send({
            version: fleetServerVersion,
          })
          .expect(200);
      });

      it('should write correct agent version to action doc when upgrade agent with build version', async () => {
        await es.update({
          id: 'agent1',
          refresh: 'wait_for',
          index: AGENTS_INDEX,
          body: {
            doc: {
              local_metadata: { elastic: { agent: { upgradeable: true, version: '0.0.0' } } },
            },
          },
        });
        const agentBuildVersion = '7.16.0+build20240116';
        await supertest
          .post(`/api/fleet/agents/agent1/upgrade`)
          .set('kbn-xsrf', 'xxx')
          .send({
            version: agentBuildVersion,
          })
          .expect(200);

        const actionsRes = await es.search({
          index: '.fleet-actions',
          body: {
            sort: [{ '@timestamp': { order: 'desc' } }],
          },
        });

        const action: any = actionsRes.hits.hits[0]._source;
        expect(action.data.version).to.equal(agentBuildVersion);
      });
    });

    describe('multiple agents', () => {
      const fleetServerVersion = '7.16.0';

      beforeEach(async () => {
        await supertest.post(`/api/fleet/agent_policies`).set('kbn-xsrf', 'kibana').send({
          name: 'Fleet Server policy 1',
          id: 'fleet-server-policy',
          namespace: 'default',
          has_fleet_server: true,
        });

        await kibanaServer.savedObjects.create({
          id: `package-policy-test`,
          type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
          overwrite: true,
          attributes: {
            policy_id: 'fleet-server-policy',
            name: 'Fleet Server',
            package: {
              name: 'fleet_server',
            },
          },
        });
        await generateAgent(
          providerContext,
          'healthy',
          'agentWithFS',
          'fleet-server-policy',
          fleetServerVersion
        );

        await es.updateByQuery({
          index: '.fleet-agents',
          body: {
            script: "ctx._source.remove('upgrade_started_at')",
            query: {
              bool: {
                must: [
                  {
                    exists: {
                      field: 'upgrade_started_at',
                    },
                  },
                ],
              },
            },
          },
        });
      });

      it('should respond 200 if trying to upgrade a recently upgraded agent with skipRateLimitCheck flag', async () => {
        await es.update({
          id: 'agent1',
          refresh: 'wait_for',
          index: AGENTS_INDEX,
          body: {
            doc: {
              upgraded_at: new Date(Date.now() - 9 * 6e4).toISOString(),
              local_metadata: {
                elastic: {
                  agent: {
                    upgradeable: true,
                    version: '0.0.0',
                  },
                },
              },
            },
          },
        });
        await supertest
          .post(`/api/fleet/agents/bulk_upgrade`)
          .set('kbn-xsrf', 'xxx')
          .send({
            version: fleetServerVersion,
            agents: ['agent1'],
            skipRateLimitCheck: true,
          })
          .expect(200);

        const actionsRes = await supertest.get(`/api/fleet/agents/action_status`);
        expect(actionsRes.body.items[0].latestErrors.length).to.equal(0);
      });

      it('should respond with error if trying to upgrade a recently upgraded agent without skipRateLimitCheck flag', async () => {
        await es.update({
          id: 'agent1',
          refresh: 'wait_for',
          index: AGENTS_INDEX,
          body: {
            doc: {
              upgraded_at: new Date(Date.now() - 9 * 6e4).toISOString(),
              local_metadata: {
                elastic: {
                  agent: {
                    upgradeable: true,
                    version: '0.0.0',
                  },
                },
              },
            },
          },
        });
        await supertest
          .post(`/api/fleet/agents/bulk_upgrade`)
          .set('kbn-xsrf', 'xxx')
          .send({
            version: fleetServerVersion,
            agents: ['agent1'],
          })
          .expect(200);

        const actionsRes = await supertest.get(`/api/fleet/agents/action_status`);
        expect(actionsRes.body.items[0].status).to.equal('FAILED');
        const error: any = actionsRes.body.items[0].latestErrors[0];
        expect(error.error).to.equal(
          'Agent agent1 is not upgradeable: agent was upgraded 10 minutes ago, please wait 1 minutes before attempting the upgrade again.'
        );
      });

      it('should create a .fleet-actions document with the correct version when bulk upgrade with build version', async () => {
        await es.update({
          id: 'agent1',
          refresh: 'wait_for',
          index: AGENTS_INDEX,
          body: {
            doc: {
              local_metadata: { elastic: { agent: { upgradeable: true, version: '0.0.0' } } },
            },
          },
        });
        await es.update({
          id: 'agent2',
          refresh: 'wait_for',
          index: AGENTS_INDEX,
          body: {
            doc: {
              local_metadata: { elastic: { agent: { upgradeable: true, version: '0.0.0' } } },
            },
          },
        });
        const agentBuildVersion = '7.16.0+build20240116';
        await supertest
          .post(`/api/fleet/agents/bulk_upgrade`)
          .set('kbn-xsrf', 'xxx')
          .send({
            version: agentBuildVersion,
            agents: ['agent1', 'agent2'],
          })
          .expect(200);

        const actionsRes = await es.search({
          index: '.fleet-actions',
          body: {
            sort: [{ '@timestamp': { order: 'desc' } }],
          },
        });

        const action: any = actionsRes.hits.hits[0]._source;
        expect(action.data.version).to.equal(agentBuildVersion);
      });

      it('should respond 200 to bulk upgrade upgradeable agents and update the agent SOs', async () => {
        await es.update({
          id: 'agent1',
          refresh: 'wait_for',
          index: AGENTS_INDEX,
          body: {
            doc: {
              local_metadata: { elastic: { agent: { upgradeable: true, version: '0.0.0' } } },
            },
          },
        });
        await es.update({
          id: 'agent2',
          refresh: 'wait_for',
          index: AGENTS_INDEX,
          body: {
            doc: {
              local_metadata: {
                elastic: {
                  agent: { upgradeable: false, version: '0.0.0' },
                },
              },
            },
          },
        });
        await supertest
          .post(`/api/fleet/agents/bulk_upgrade`)
          .set('kbn-xsrf', 'xxx')
          .send({
            version: fleetServerVersion,
            agents: ['agent1', 'agent2'],
          })
          .expect(200);

        const [agent1data, agent2data] = await Promise.all([
          supertest.get(`/api/fleet/agents/agent1`).set('kbn-xsrf', 'xxx'),
          supertest.get(`/api/fleet/agents/agent2`).set('kbn-xsrf', 'xxx'),
        ]);
        expect(typeof agent1data.body.item.upgrade_started_at).to.be('string');
        expect(typeof agent2data.body.item.upgrade_started_at).to.be('undefined');
      });

      it('should create a .fleet-actions document with the agents, version, and upgrade window when rollout_duration_seconds passed', async () => {
        await es.update({
          id: 'agent1',
          refresh: 'wait_for',
          index: AGENTS_INDEX,
          body: {
            doc: {
              local_metadata: { elastic: { agent: { upgradeable: true, version: '0.0.0' } } },
            },
          },
        });
        await es.update({
          id: 'agent2',
          refresh: 'wait_for',
          index: AGENTS_INDEX,
          body: {
            doc: {
              local_metadata: { elastic: { agent: { upgradeable: true, version: '0.0.0' } } },
            },
          },
        });
        await supertest
          .post(`/api/fleet/agents/bulk_upgrade`)
          .set('kbn-xsrf', 'xxx')
          .send({
            version: fleetServerVersion,
            agents: ['agent1', 'agent2'],
            rollout_duration_seconds: 6000,
          })
          .expect(200);

        const actionsRes = await es.search({
          index: '.fleet-actions',
          body: {
            sort: [{ '@timestamp': { order: 'desc' } }],
          },
        });

        const action: any = actionsRes.hits.hits[0]._source;

        expect(action).to.have.keys('agents', 'start_time', 'rollout_duration_seconds');
        expect(action.agents).contain('agent1');
        expect(action.agents).contain('agent2');
      });

      it('should create a .fleet-actions document with the agents, version, and start_time if start_time passed', async () => {
        await es.update({
          id: 'agent1',
          refresh: 'wait_for',
          index: AGENTS_INDEX,
          body: {
            doc: {
              local_metadata: { elastic: { agent: { upgradeable: true, version: '0.0.0' } } },
            },
          },
        });
        await es.update({
          id: 'agent2',
          refresh: 'wait_for',
          index: AGENTS_INDEX,
          body: {
            doc: {
              local_metadata: { elastic: { agent: { upgradeable: true, version: '0.0.0' } } },
            },
          },
        });
        await supertest
          .post(`/api/fleet/agents/bulk_upgrade`)
          .set('kbn-xsrf', 'xxx')
          .send({
            version: fleetServerVersion,
            agents: ['agent1', 'agent2'],
            start_time: '2022-07-14T08:54:46.987Z',
          })
          .expect(200);

        const actionsRes = await es.search({
          index: '.fleet-actions',
          body: {
            sort: [{ '@timestamp': { order: 'desc' } }],
          },
        });

        const action: any = actionsRes.hits.hits[0]._source;

        expect(action).to.have.keys('agents', 'start_time');
        expect(action.agents).contain('agent1');
        expect(action.agents).contain('agent2');
      });

      it('should allow to upgrade multiple upgradeable agents by kuery', async () => {
        await es.update({
          id: 'agent1',
          refresh: 'wait_for',
          index: AGENTS_INDEX,
          body: {
            doc: {
              local_metadata: { elastic: { agent: { upgradeable: true, version: '0.0.0' } } },
            },
          },
        });
        await es.update({
          id: 'agent2',
          refresh: 'wait_for',
          index: AGENTS_INDEX,
          body: {
            doc: {
              local_metadata: {
                elastic: {
                  agent: { upgradeable: false, version: '0.0.0' },
                },
              },
              upgrade_started_at: undefined,
            },
          },
        });
        await supertest
          .post(`/api/fleet/agents/bulk_upgrade`)
          .set('kbn-xsrf', 'xxx')
          .send({
            agents: 'active:true',
            version: fleetServerVersion,
          })
          .expect(200);
        const [agent1data, agent2data] = await Promise.all([
          supertest.get(`/api/fleet/agents/agent1`).set('kbn-xsrf', 'xxx'),
          supertest.get(`/api/fleet/agents/agent2`).set('kbn-xsrf', 'xxx'),
        ]);
        expect(typeof agent1data.body.item.upgrade_started_at).to.be('string');
        expect(typeof agent2data.body.item.upgrade_started_at).to.be('undefined');
      });

      it('should bulk upgrade multiple agents by kuery in batches async', async () => {
        await es.update({
          id: 'agent1',
          refresh: 'wait_for',
          index: AGENTS_INDEX,
          body: {
            doc: {
              local_metadata: { elastic: { agent: { upgradeable: true, version: '0.0.0' } } },
            },
          },
        });
        await es.update({
          id: 'agent2',
          refresh: 'wait_for',
          index: AGENTS_INDEX,
          body: {
            doc: {
              local_metadata: { elastic: { agent: { upgradeable: true, version: '0.0.0' } } },
            },
          },
        });

        const { body } = await supertest
          .post(`/api/fleet/agents/bulk_upgrade`)
          .set('kbn-xsrf', 'xxx')
          .send({
            agents: 'active:true',
            version: fleetServerVersion,
            batchSize: 3,
          })
          .expect(200);

        const actionId = body.actionId;

        const verifyActionResult = async () => {
          const [agent1data, agent2data] = await Promise.all([
            supertest.get(`/api/fleet/agents/agent1`).set('kbn-xsrf', 'xxx'),
            supertest.get(`/api/fleet/agents/agent2`).set('kbn-xsrf', 'xxx'),
          ]);
          expect(typeof agent1data.body.item.upgrade_started_at).to.be('string');
          expect(typeof agent2data.body.item.upgrade_started_at).to.be('string');
        };

        await new Promise((resolve, reject) => {
          let attempts = 0;
          const intervalId = setInterval(async () => {
            if (attempts > 4) {
              clearInterval(intervalId);
              reject(new Error('action timed out'));
            }
            ++attempts;
            const {
              body: { items: actionStatuses },
            } = await supertest.get(`/api/fleet/agents/action_status`).set('kbn-xsrf', 'xxx');
            const action = actionStatuses.find((a: any) => a.actionId === actionId);
            // 2 upgradeable
            if (action && action.nbAgentsActionCreated === 2 && action.nbAgentsFailed === 3) {
              clearInterval(intervalId);
              await verifyActionResult();
              resolve({});
            }
          }, 1000);
        }).catch((e) => {
          throw e;
        });
      });

      it('should not upgrade an unenrolling agent during bulk_upgrade', async () => {
        await supertest.post(`/api/fleet/agents/agent1/unenroll`).set('kbn-xsrf', 'xxx').send({
          revoke: true,
        });
        await es.update({
          id: 'agent1',
          refresh: 'wait_for',
          index: AGENTS_INDEX,
          body: {
            doc: {
              local_metadata: { elastic: { agent: { upgradeable: true, version: '0.0.0' } } },
            },
          },
        });
        await es.update({
          id: 'agent2',
          refresh: 'wait_for',
          index: AGENTS_INDEX,
          body: {
            doc: {
              local_metadata: { elastic: { agent: { upgradeable: true, version: '0.0.0' } } },
            },
          },
        });
        await supertest
          .post(`/api/fleet/agents/bulk_upgrade`)
          .set('kbn-xsrf', 'xxx')
          .send({
            agents: ['agent1', 'agent2'],
            version: fleetServerVersion,
          });
        const [agent1data, agent2data] = await Promise.all([
          supertest.get(`/api/fleet/agents/agent1`).set('kbn-xsrf', 'xxx'),
          supertest.get(`/api/fleet/agents/agent2`).set('kbn-xsrf', 'xxx'),
        ]);
        expect(typeof agent1data.body.item.upgrade_started_at).to.be('undefined');
        expect(typeof agent2data.body.item.upgrade_started_at).to.be('string');
      });

      it('should not upgrade an unenrolled agent during bulk_upgrade', async () => {
        await es.update({
          id: 'agent1',
          refresh: 'wait_for',
          index: AGENTS_INDEX,
          body: {
            doc: {
              unenrolled_at: new Date().toISOString(),
              local_metadata: { elastic: { agent: { upgradeable: true, version: '0.0.0' } } },
            },
          },
        });
        await es.update({
          id: 'agent2',
          refresh: 'wait_for',
          index: AGENTS_INDEX,
          body: {
            doc: {
              local_metadata: {
                elastic: { agent: { upgradeable: true, version: '0.0.0' } },
              },
            },
          },
        });
        await supertest
          .post(`/api/fleet/agents/bulk_upgrade`)
          .set('kbn-xsrf', 'xxx')
          .send({
            agents: ['agent1', 'agent2'],
            version: fleetServerVersion,
          });
        const [agent1data, agent2data] = await Promise.all([
          supertest.get(`/api/fleet/agents/agent1`).set('kbn-xsrf', 'xxx'),
          supertest.get(`/api/fleet/agents/agent2`).set('kbn-xsrf', 'xxx'),
        ]);
        expect(typeof agent1data.body.item.upgrade_started_at).to.be('undefined');
        expect(typeof agent2data.body.item.upgrade_started_at).to.be('string');
      });

      it('should not upgrade a non-upgradeable agent during bulk_upgrade', async () => {
        const kibanaVersion = await kibanaServer.version.get();
        await es.update({
          id: 'agent1',
          refresh: 'wait_for',
          index: AGENTS_INDEX,
          body: {
            doc: {
              local_metadata: { elastic: { agent: { upgradeable: true, version: '0.0.0' } } },
            },
          },
        });
        await es.update({
          id: 'agent2',
          refresh: 'wait_for',
          index: AGENTS_INDEX,
          body: {
            doc: {
              local_metadata: {
                elastic: {
                  agent: { upgradeable: true, version: semver.inc(kibanaVersion, 'patch') },
                },
              },
            },
          },
        });
        await es.update({
          id: 'agent3',
          refresh: 'wait_for',
          index: AGENTS_INDEX,
          body: {
            doc: {
              local_metadata: { elastic: { agent: { upgradeable: false, version: '0.0.0' } } },
            },
          },
        });
        await supertest
          .post(`/api/fleet/agents/bulk_upgrade`)
          .set('kbn-xsrf', 'xxx')
          .send({
            agents: ['agent1', 'agent2', 'agent3'],
            version: fleetServerVersion,
          });
        const [agent1data, agent2data, agent3data] = await Promise.all([
          supertest.get(`/api/fleet/agents/agent1`).set('kbn-xsrf', 'xxx'),
          supertest.get(`/api/fleet/agents/agent2`).set('kbn-xsrf', 'xxx'),
          supertest.get(`/api/fleet/agents/agent3`).set('kbn-xsrf', 'xxx'),
        ]);
        expect(typeof agent1data.body.item.upgrade_started_at).to.be('string');
        expect(typeof agent2data.body.item.upgrade_started_at).to.be('undefined');
        expect(typeof agent3data.body.item.upgrade_started_at).to.be('undefined');
      });

      it('should not upgrade a recently upgraded agent during bulk_upgrade', async () => {
        await es.update({
          id: 'agent1',
          refresh: 'wait_for',
          index: AGENTS_INDEX,
          body: {
            doc: {
              upgraded_at: new Date(Date.now() - 11 * 6e4).toISOString(),
              local_metadata: {
                elastic: {
                  agent: {
                    upgradeable: true,
                    version: '0.0.0',
                  },
                },
              },
            },
          },
        });
        await es.update({
          id: 'agent2',
          refresh: 'wait_for',
          index: AGENTS_INDEX,
          body: {
            doc: {
              upgraded_at: new Date(Date.now() - 9 * 6e4).toISOString(),
              local_metadata: {
                elastic: {
                  agent: {
                    upgradeable: true,
                    version: '0.0.0',
                  },
                },
              },
            },
          },
        });
        await supertest
          .post(`/api/fleet/agents/bulk_upgrade`)
          .set('kbn-xsrf', 'xxx')
          .send({
            agents: ['agent1', 'agent2'],
            version: fleetServerVersion,
          });
        const [agent1data, agent2data] = await Promise.all([
          supertest.get(`/api/fleet/agents/agent1`).set('kbn-xsrf', 'xxx'),
          supertest.get(`/api/fleet/agents/agent2`).set('kbn-xsrf', 'xxx'),
        ]);
        expect(typeof agent1data.body.item.upgrade_started_at).to.be('string');
        expect(typeof agent2data.body.item.upgrade_started_at).to.be('undefined');
      });

      it('should not upgrade a recently upgraded agent during bulk_upgrade even with force flag', async () => {
        await es.update({
          id: 'agent1',
          refresh: 'wait_for',
          index: AGENTS_INDEX,
          body: {
            doc: {
              upgraded_at: new Date(Date.now() - 11 * 6e4).toISOString(),
              local_metadata: {
                elastic: {
                  agent: {
                    upgradeable: true,
                    version: '0.0.0',
                  },
                },
              },
            },
          },
        });
        await es.update({
          id: 'agent2',
          refresh: 'wait_for',
          index: AGENTS_INDEX,
          body: {
            doc: {
              upgraded_at: new Date(Date.now() - 9 * 6e4).toISOString(),
              local_metadata: {
                elastic: {
                  agent: {
                    upgradeable: true,
                    version: '0.0.0',
                  },
                },
              },
            },
          },
        });
        await supertest
          .post(`/api/fleet/agents/bulk_upgrade`)
          .set('kbn-xsrf', 'xxx')
          .send({
            agents: ['agent1', 'agent2'],
            version: fleetServerVersion,
            force: true,
          });
        const [agent1data, agent2data] = await Promise.all([
          supertest.get(`/api/fleet/agents/agent1`).set('kbn-xsrf', 'xxx'),
          supertest.get(`/api/fleet/agents/agent2`).set('kbn-xsrf', 'xxx'),
        ]);
        expect(typeof agent1data.body.item.upgrade_started_at).to.be('string');
        expect(typeof agent2data.body.item.upgrade_started_at).to.be('undefined');
      });

      it('should upgrade a non upgradeable agent during bulk_upgrade with force flag', async () => {
        await es.update({
          id: 'agent1',
          refresh: 'wait_for',
          index: AGENTS_INDEX,
          body: {
            doc: {
              local_metadata: { elastic: { agent: { upgradeable: true, version: '0.0.0' } } },
            },
          },
        });
        await es.update({
          id: 'agent2',
          refresh: 'wait_for',
          index: AGENTS_INDEX,
          body: {
            doc: {
              local_metadata: {
                elastic: {
                  agent: { upgradeable: true, version: semver.inc(fleetServerVersion, 'patch') },
                },
              },
            },
          },
        });
        await es.update({
          id: 'agent3',
          refresh: 'wait_for',
          index: AGENTS_INDEX,
          body: {
            doc: {
              local_metadata: { elastic: { agent: { upgradeable: false, version: '0.0.0' } } },
            },
          },
        });
        await supertest
          .post(`/api/fleet/agents/bulk_upgrade`)
          .set('kbn-xsrf', 'xxx')
          .send({
            agents: ['agent1', 'agent2', 'agent3'],
            version: fleetServerVersion,
            force: true,
          });
        const [agent1data, agent2data, agent3data] = await Promise.all([
          supertest.get(`/api/fleet/agents/agent1`).set('kbn-xsrf', 'xxx'),
          supertest.get(`/api/fleet/agents/agent2`).set('kbn-xsrf', 'xxx'),
          supertest.get(`/api/fleet/agents/agent3`).set('kbn-xsrf', 'xxx'),
        ]);
        expect(typeof agent1data.body.item.upgrade_started_at).to.be('string');
        expect(typeof agent2data.body.item.upgrade_started_at).to.be('string');
        expect(typeof agent3data.body.item.upgrade_started_at).to.be('string');
      });

      it('should respond 400 if trying to bulk upgrade to a version that is higher than the latest installed kibana version', async () => {
        const kibanaVersion = await kibanaServer.version.get();
        const higherVersion = semver.inc(kibanaVersion, 'patch');
        await es.update({
          id: 'agent1',
          refresh: 'wait_for',
          index: AGENTS_INDEX,
          body: {
            doc: {
              policy_id: `agent-policy-1`,
              local_metadata: { elastic: { agent: { upgradeable: true, version: '6.0.0' } } },
            },
          },
        });
        await es.update({
          id: 'agent2',
          refresh: 'wait_for',
          index: AGENTS_INDEX,
          body: {
            doc: {
              policy_id: `agent-policy-2`,
              local_metadata: { elastic: { agent: { upgradeable: true, version: '6.0.0' } } },
            },
          },
        });
        await supertest
          .post(`/api/fleet/agents/bulk_upgrade`)
          .set('kbn-xsrf', 'xxx')
          .send({
            agents: ['agent1', 'agent2'],
            version: higherVersion,
          })
          .expect(400);
      });

      it('should respond 400 if trying to bulk upgrade to a version that is higher than the latest fleet server version', async () => {
        const higherVersion = '7.17.0';
        await es.update({
          id: 'agent1',
          refresh: 'wait_for',
          index: AGENTS_INDEX,
          body: {
            doc: {
              policy_id: `agent-policy-1`,
              local_metadata: { elastic: { agent: { upgradeable: true, version: '0.0.0' } } },
            },
          },
        });
        await es.update({
          id: 'agent2',
          refresh: 'wait_for',
          index: AGENTS_INDEX,
          body: {
            doc: {
              policy_id: `agent-policy-2`,
              local_metadata: { elastic: { agent: { upgradeable: true, version: '0.0.0' } } },
            },
          },
        });
        await supertest
          .post(`/api/fleet/agents/bulk_upgrade`)
          .set('kbn-xsrf', 'xxx')
          .send({
            agents: ['agent1', 'agent2'],
            version: higherVersion,
          })
          .expect(400);
      });

      it('should prevent any agent to downgrade', async () => {
        await es.update({
          id: 'agent1',
          refresh: 'wait_for',
          index: AGENTS_INDEX,
          body: {
            doc: {
              policy_id: `agent-policy-1`,
              local_metadata: { elastic: { agent: { upgradeable: true, version: '6.0.0' } } },
            },
          },
        });
        await es.update({
          id: 'agent2',
          refresh: 'wait_for',
          index: AGENTS_INDEX,
          body: {
            doc: {
              policy_id: `agent-policy-2`,
              local_metadata: { elastic: { agent: { upgradeable: true, version: '6.0.0' } } },
            },
          },
        });
        await supertest
          .post(`/api/fleet/agents/bulk_upgrade`)
          .set('kbn-xsrf', 'xxx')
          .send({
            agents: ['agent1', 'agent2'],
            version: '5.0.0',
          })
          .expect(200);
        const [agent1data, agent2data] = await Promise.all([
          supertest.get(`/api/fleet/agents/agent1`).set('kbn-xsrf', 'xxx'),
          supertest.get(`/api/fleet/agents/agent2`).set('kbn-xsrf', 'xxx'),
        ]);
        expect(typeof agent1data.body.item.upgrade_started_at).to.be('undefined');
        expect(typeof agent2data.body.item.upgrade_started_at).to.be('undefined');
      });

      it('should respond 200 if source_uri parameter is passed', async () => {
        await es.update({
          id: 'agent1',
          refresh: 'wait_for',
          index: AGENTS_INDEX,
          body: {
            doc: {
              local_metadata: { elastic: { agent: { upgradeable: true, version: '0.0.0' } } },
            },
          },
        });
        await es.update({
          id: 'agent2',
          refresh: 'wait_for',
          index: AGENTS_INDEX,
          body: {
            doc: {
              local_metadata: {
                elastic: {
                  agent: { upgradeable: false, version: '0.0.0' },
                },
              },
            },
          },
        });
        await supertest
          .post(`/api/fleet/agents/bulk_upgrade`)
          .set('kbn-xsrf', 'xxx')
          .send({
            version: fleetServerVersion,
            agents: ['agent1', 'agent2'],
            source_uri: 'http://path/to/download',
          })
          .expect(200);

        const actionsRes = await es.search({
          index: '.fleet-actions',
          body: {
            sort: [{ '@timestamp': { order: 'desc' } }],
          },
        });
        const action: any = actionsRes.hits.hits[0]._source;

        expect(action.data.sourceURI).contain('http://path/to/download');
      });

      it('enrolled in a hosted agent policy bulk upgrade should respond with 200 and object of results. Should not update the hosted agent SOs', async () => {
        // move agent2 to policy2 to keep it regular
        await supertest.put(`/api/fleet/agents/agent2/reassign`).set('kbn-xsrf', 'xxx').send({
          policy_id: 'policy2',
        });
        // update enrolled policy to hosted
        await supertest.put(`/api/fleet/agent_policies/policy1`).set('kbn-xsrf', 'xxxx').send({
          name: 'Test policy',
          namespace: 'default',
          is_managed: true,
        });

        await es.update({
          id: 'agent1',
          refresh: 'wait_for',
          index: AGENTS_INDEX,
          body: {
            doc: {
              local_metadata: { elastic: { agent: { upgradeable: true, version: '0.0.0' } } },
            },
          },
        });
        await es.update({
          id: 'agent2',
          refresh: 'wait_for',
          index: AGENTS_INDEX,
          body: {
            doc: {
              local_metadata: {
                elastic: {
                  agent: { upgradeable: true, version: '0.0.0' },
                },
              },
            },
          },
        });
        // attempt to upgrade agent in hosted agent policy
        await supertest
          .post(`/api/fleet/agents/bulk_upgrade`)
          .set('kbn-xsrf', 'xxx')
          .send({
            version: fleetServerVersion,
            agents: ['agent1', 'agent2'],
          })
          .expect(200);

        const [agent1data, agent2data] = await Promise.all([
          supertest.get(`/api/fleet/agents/agent1`),
          supertest.get(`/api/fleet/agents/agent2`),
        ]);

        expect(typeof agent1data.body.item.upgrade_started_at).to.be('undefined');
        expect(typeof agent2data.body.item.upgrade_started_at).to.be('string');

        const { body } = await supertest
          .get(`/api/fleet/agents/action_status`)
          .set('kbn-xsrf', 'xxx');
        const actionStatus = body.items[0];
        expect(actionStatus.nbAgentsFailed).to.eql(1);
      });

      it('enrolled in a hosted agent policy bulk upgrade with force flag should respond with 200 and update the agent SOs', async () => {
        // update enrolled policy to hosted
        await supertest.put(`/api/fleet/agent_policies/policy1`).set('kbn-xsrf', 'xxxx').send({
          name: 'Test policy',
          namespace: 'default',
          is_managed: true,
        });

        await es.update({
          id: 'agent1',
          refresh: 'wait_for',
          index: AGENTS_INDEX,
          body: {
            doc: {
              local_metadata: { elastic: { agent: { upgradeable: true, version: '0.0.0' } } },
            },
          },
        });
        await es.update({
          id: 'agent2',
          refresh: 'wait_for',
          index: AGENTS_INDEX,
          body: {
            doc: {
              local_metadata: {
                elastic: {
                  agent: { upgradeable: true, version: fleetServerVersion },
                },
              },
            },
          },
        });
        // attempt to upgrade agent in hosted agent policy
        await supertest
          .post(`/api/fleet/agents/bulk_upgrade`)
          .set('kbn-xsrf', 'xxx')
          .send({
            version: fleetServerVersion,
            agents: ['agent1', 'agent2'],
            force: true,
          });

        const [agent1data, agent2data] = await Promise.all([
          supertest.get(`/api/fleet/agents/agent1`),
          supertest.get(`/api/fleet/agents/agent2`),
        ]);
        expect(typeof agent1data.body.item.upgrade_started_at).to.be('string');
        expect(typeof agent2data.body.item.upgrade_started_at).to.be('string');
      });

      it('should set a long expiration time when the start_time is set to now (immediate rollout period)', async () => {
        await es.update({
          id: 'agent1',
          refresh: 'wait_for',
          index: AGENTS_INDEX,
          body: {
            doc: {
              local_metadata: { elastic: { agent: { upgradeable: true, version: '0.0.0' } } },
            },
          },
        });
        await es.update({
          id: 'agent2',
          refresh: 'wait_for',
          index: AGENTS_INDEX,
          body: {
            doc: {
              local_metadata: { elastic: { agent: { upgradeable: true, version: '0.0.0' } } },
            },
          },
        });
        const today = new Date(Date.now());
        await supertest
          .post(`/api/fleet/agents/bulk_upgrade`)
          .set('kbn-xsrf', 'xxx')
          .send({
            version: fleetServerVersion,
            agents: ['agent1', 'agent2'],
            start_time: today.toISOString(),
          })
          .expect(200);

        const actionsRes = await es.search({
          index: '.fleet-actions',
          body: {
            sort: [{ '@timestamp': { order: 'desc' } }],
          },
        });

        const action: any = actionsRes.hits.hits[0]._source;
        expect(action).to.have.keys(
          'agents',
          'start_time',
          'minimum_execution_duration',
          'expiration'
        );
        // add 30 days from now
        const nextMonth = moment(today).add(30, 'days').toISOString().slice(0, 10);

        expect(action.expiration).contain(`${nextMonth}`);
        expect(action.agents).contain('agent1');
        expect(action.agents).contain('agent2');
      });
    });
  });
}
