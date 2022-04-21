/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import semver from 'semver';
import { AGENTS_INDEX } from '@kbn/fleet-plugin/common';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { setupFleetAndAgents } from './services';
import { skipIfNoDockerRegistry } from '../../helpers';
import { testUsers } from '../test_users';

const makeSnapshotVersion = (version: string) => {
  return version.endsWith('-SNAPSHOT') ? version : `${version}-SNAPSHOT`;
};

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const es = getService('es');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('fleet upgrade', () => {
    skipIfNoDockerRegistry(providerContext);
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/fleet/agents');
    });
    setupFleetAndAgents(providerContext);
    beforeEach(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/fleet/agents');
    });
    afterEach(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/agents');
    });
    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/agents');
    });

    describe('one agent', () => {
      it('should respond 200 to upgrade agent and update the agent SO', async () => {
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
        await supertest
          .post(`/api/fleet/agents/agent1/upgrade`)
          .set('kbn-xsrf', 'xxx')
          .send({
            version: kibanaVersion,
          })
          .expect(200);

        const res = await supertest.get(`/api/fleet/agents/agent1`).set('kbn-xsrf', 'xxx');
        expect(typeof res.body.item.upgrade_started_at).to.be('string');
      });
      it('should respond 400 if upgrading agent with version the same as snapshot version', async () => {
        const kibanaVersion = await kibanaServer.version.get();
        const kibanaVersionSnapshot = makeSnapshotVersion(kibanaVersion);
        await es.update({
          id: 'agent1',
          refresh: 'wait_for',
          index: AGENTS_INDEX,
          body: {
            doc: {
              local_metadata: { elastic: { agent: { upgradeable: true, version: kibanaVersion } } },
            },
          },
        });
        await supertest
          .post(`/api/fleet/agents/agent1/upgrade`)
          .set('kbn-xsrf', 'xxx')
          .send({
            version: kibanaVersionSnapshot,
          })
          .expect(400);
      });
      it('should respond 200 if upgrading agent with version the same as snapshot version and force flag is passed', async () => {
        const kibanaVersion = await kibanaServer.version.get();
        const kibanaVersionSnapshot = makeSnapshotVersion(kibanaVersion);
        await es.update({
          id: 'agent1',
          refresh: 'wait_for',
          index: AGENTS_INDEX,
          body: {
            doc: {
              local_metadata: { elastic: { agent: { upgradeable: true, version: kibanaVersion } } },
            },
          },
        });
        await supertest
          .post(`/api/fleet/agents/agent1/upgrade`)
          .set('kbn-xsrf', 'xxx')
          .send({
            version: kibanaVersionSnapshot,
            force: true,
          })
          .expect(200);
      });
      it('should respond 200 if upgrading agent with version less than kibana snapshot version', async () => {
        const kibanaVersion = await kibanaServer.version.get();
        const kibanaVersionSnapshot = makeSnapshotVersion(kibanaVersion);

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
            version: kibanaVersionSnapshot,
          })
          .expect(200);
      });
      it('should respond 200 to upgrade agent and update the agent SO without source_uri', async () => {
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
        await supertest
          .post(`/api/fleet/agents/agent1/upgrade`)
          .set('kbn-xsrf', 'xxx')
          .send({
            version: kibanaVersion,
          })
          .expect(200);
        const res = await supertest.get(`/api/fleet/agents/agent1`).set('kbn-xsrf', 'xxx');
        expect(typeof res.body.item.upgrade_started_at).to.be('string');
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
      it('should respond 400 if trying to upgrade with source_uri set', async () => {
        const kibanaVersion = await kibanaServer.version.get();
        const res = await supertest
          .post(`/api/fleet/agents/agent1/upgrade`)
          .set('kbn-xsrf', 'xxx')
          .send({
            version: kibanaVersion,
            source_uri: 'http://path/to/download',
          })
          .expect(400);

        expect(res.body.message).to.eql(
          `source_uri is not allowed or recommended in production. Set xpack.fleet.developer.allowAgentUpgradeSourceUri in kibana.yml to true.`
        );
      });
      it('should respond 400 if trying to upgrade an agent that is unenrolling', async () => {
        const kibanaVersion = await kibanaServer.version.get();
        await supertest.post(`/api/fleet/agents/agent1/unenroll`).set('kbn-xsrf', 'xxx').send({
          revoke: true,
        });
        await supertest
          .post(`/api/fleet/agents/agent1/upgrade`)
          .set('kbn-xsrf', 'xxx')
          .send({
            version: kibanaVersion,
          })
          .expect(400);
      });
      it('should respond 400 if trying to upgrade an agent that is unenrolled', async () => {
        const kibanaVersion = await kibanaServer.version.get();
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
        await supertest
          .post(`/api/fleet/agents/agent1/upgrade`)
          .set('kbn-xsrf', 'xxx')
          .send({
            version: kibanaVersion,
          })
          .expect(400);
      });

      it('should respond 400 if trying to upgrade an agent that is not upgradeable', async () => {
        const kibanaVersion = await kibanaServer.version.get();
        const res = await supertest
          .post(`/api/fleet/agents/agent1/upgrade`)
          .set('kbn-xsrf', 'xxx')
          .send({
            version: kibanaVersion,
          })
          .expect(400);
        expect(res.body.message).to.equal('agent agent1 is not upgradeable');
      });

      it('enrolled in a hosted agent policy should respond 400 to upgrade and not update the agent SOs', async () => {
        // update enrolled policy to hosted
        await supertest.put(`/api/fleet/agent_policies/policy1`).set('kbn-xsrf', 'xxxx').send({
          name: 'Test policy',
          namespace: 'default',
          is_managed: true,
        });

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
        // attempt to upgrade agent in hosted agent policy
        const { body } = await supertest
          .post(`/api/fleet/agents/agent1/upgrade`)
          .set('kbn-xsrf', 'xxx')
          .send({ version: kibanaVersion })
          .expect(400);
        expect(body.message).to.contain(
          'Cannot upgrade agent agent1 in hosted agent policy policy1'
        );

        const agent1data = await supertest.get(`/api/fleet/agents/agent1`);
        expect(typeof agent1data.body.item.upgrade_started_at).to.be('undefined');
      });

      it('should respond 403 if user lacks fleet all permissions', async () => {
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
        await supertestWithoutAuth
          .post(`/api/fleet/agents/agent1/upgrade`)
          .set('kbn-xsrf', 'xxx')
          .auth(testUsers.fleet_no_access.username, testUsers.fleet_no_access.password)
          .send({
            version: kibanaVersion,
          })
          .expect(403);
      });
    });

    describe('multiple agents', () => {
      it('should respond 200 to bulk upgrade upgradeable agents and update the agent SOs', async () => {
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
        await supertest
          .post(`/api/fleet/agents/bulk_upgrade`)
          .set('kbn-xsrf', 'xxx')
          .send({
            version: kibanaVersion,
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

      it('should allow to upgrade multiple upgradeable agents by kuery', async () => {
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
        await supertest
          .post(`/api/fleet/agents/bulk_upgrade`)
          .set('kbn-xsrf', 'xxx')
          .send({
            agents: 'active:true',
            version: kibanaVersion,
          })
          .expect(200);
        const [agent1data, agent2data] = await Promise.all([
          supertest.get(`/api/fleet/agents/agent1`).set('kbn-xsrf', 'xxx'),
          supertest.get(`/api/fleet/agents/agent2`).set('kbn-xsrf', 'xxx'),
        ]);
        expect(typeof agent1data.body.item.upgrade_started_at).to.be('string');
        expect(typeof agent2data.body.item.upgrade_started_at).to.be('undefined');
      });

      it('should not upgrade an unenrolling agent during bulk_upgrade', async () => {
        const kibanaVersion = await kibanaServer.version.get();
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
            version: kibanaVersion,
          });
        const [agent1data, agent2data] = await Promise.all([
          supertest.get(`/api/fleet/agents/agent1`).set('kbn-xsrf', 'xxx'),
          supertest.get(`/api/fleet/agents/agent2`).set('kbn-xsrf', 'xxx'),
        ]);
        expect(typeof agent1data.body.item.upgrade_started_at).to.be('undefined');
        expect(typeof agent2data.body.item.upgrade_started_at).to.be('string');
      });
      it('should not upgrade an unenrolled agent during bulk_upgrade', async () => {
        const kibanaVersion = await kibanaServer.version.get();
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
            version: kibanaVersion,
          });
        const [agent1data, agent2data] = await Promise.all([
          supertest.get(`/api/fleet/agents/agent1`).set('kbn-xsrf', 'xxx'),
          supertest.get(`/api/fleet/agents/agent2`).set('kbn-xsrf', 'xxx'),
        ]);
        expect(typeof agent1data.body.item.upgrade_started_at).to.be('undefined');
        expect(typeof agent2data.body.item.upgrade_started_at).to.be('string');
      });
      it('should not upgrade an non upgradeable agent during bulk_upgrade', async () => {
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
            version: kibanaVersion,
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
      it('should upgrade a non upgradeable agent during bulk_upgrade with force flag', async () => {
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
            version: kibanaVersion,
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
      it('should respond 400 if trying to bulk upgrade to a version that does not match installed kibana version', async () => {
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
            version: '1.0.0',
            force: true,
          })
          .expect(400);
      });

      it('should respond 400 if trying to bulk upgrade to a version that does not match installed kibana version', async () => {
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
              local_metadata: { elastic: { agent: { upgradeable: true, version: '0.0.0' } } },
            },
          },
        });
        const res = await supertest
          .post(`/api/fleet/agents/bulk_upgrade`)
          .set('kbn-xsrf', 'xxx')
          .send({
            agents: ['agent1', 'agent2'],
            version: kibanaVersion,
            source_uri: 'http://path/to/download',
            force: true,
          })
          .expect(400);
        expect(res.body.message).to.eql(
          `source_uri is not allowed or recommended in production. Set xpack.fleet.developer.allowAgentUpgradeSourceUri in kibana.yml to true.`
        );
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
                  agent: { upgradeable: true, version: '0.0.0' },
                },
              },
            },
          },
        });
        // attempt to upgrade agent in hosted agent policy
        const { body } = await supertest
          .post(`/api/fleet/agents/bulk_upgrade`)
          .set('kbn-xsrf', 'xxx')
          .send({
            version: kibanaVersion,
            agents: ['agent1', 'agent2'],
          })
          .expect(200);

        expect(body).to.eql({
          agent1: {
            success: false,
            error:
              'Cannot upgrade agent in hosted agent policy policy1 in Fleet because the agent policy is managed by an external orchestration solution, such as Elastic Cloud, Kubernetes, etc. Please make changes using your orchestration solution.',
          },
          agent2: { success: true },
        });

        const [agent1data, agent2data] = await Promise.all([
          supertest.get(`/api/fleet/agents/agent1`),
          supertest.get(`/api/fleet/agents/agent2`),
        ]);

        expect(typeof agent1data.body.item.upgrade_started_at).to.be('undefined');
        expect(typeof agent2data.body.item.upgrade_started_at).to.be('string');
      });

      it('enrolled in a hosted agent policy bulk upgrade with force flag should respond with 200 and update the agent SOs', async () => {
        // update enrolled policy to hosted
        await supertest.put(`/api/fleet/agent_policies/policy1`).set('kbn-xsrf', 'xxxx').send({
          name: 'Test policy',
          namespace: 'default',
          is_managed: true,
        });

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
        // attempt to upgrade agent in hosted agent policy
        const { body } = await supertest
          .post(`/api/fleet/agents/bulk_upgrade`)
          .set('kbn-xsrf', 'xxx')
          .send({
            version: kibanaVersion,
            agents: ['agent1', 'agent2'],
            force: true,
          });

        expect(body).to.eql({
          agent1: { success: true },
          agent2: { success: true },
        });

        const [agent1data, agent2data] = await Promise.all([
          supertest.get(`/api/fleet/agents/agent1`),
          supertest.get(`/api/fleet/agents/agent2`),
        ]);
        expect(typeof agent1data.body.item.upgrade_started_at).to.be('string');
        expect(typeof agent2data.body.item.upgrade_started_at).to.be('string');
      });
    });
  });
}
