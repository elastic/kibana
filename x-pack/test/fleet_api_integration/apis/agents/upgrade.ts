/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect/expect.js';
import semver from 'semver';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { setupFleetAndAgents } from './services';
import { skipIfNoDockerRegistry } from '../../helpers';
import { AGENT_SAVED_OBJECT_TYPE } from '../../../../plugins/fleet/common';

const makeSnapshotVersion = (version: string) => {
  return version.endsWith('-SNAPSHOT') ? version : `${version}-SNAPSHOT`;
};

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');

  describe('fleet upgrade agent', () => {
    skipIfNoDockerRegistry(providerContext);
    setupFleetAndAgents(providerContext);
    beforeEach(async () => {
      await esArchiver.loadIfNeeded('fleet/agents');
    });
    afterEach(async () => {
      await esArchiver.unload('fleet/agents');
    });

    it('should respond 200 to upgrade agent and update the agent SO', async () => {
      const kibanaVersion = await kibanaServer.version.get();
      await kibanaServer.savedObjects.update({
        id: 'agent1',
        type: AGENT_SAVED_OBJECT_TYPE,
        attributes: {
          local_metadata: { elastic: { agent: { upgradeable: true, version: '0.0.0' } } },
        },
      });
      await supertest
        .post(`/api/fleet/agents/agent1/upgrade`)
        .set('kbn-xsrf', 'xxx')
        .send({
          version: kibanaVersion,
          source_uri: 'http://path/to/download',
        })
        .expect(200);

      const res = await supertest.get(`/api/fleet/agents/agent1`).set('kbn-xsrf', 'xxx');
      expect(typeof res.body.item.upgrade_started_at).to.be('string');
    });
    it('should respond 400 if upgrading agent with version the same as snapshot version', async () => {
      const kibanaVersion = await kibanaServer.version.get();
      const kibanaVersionSnapshot = makeSnapshotVersion(kibanaVersion);
      await kibanaServer.savedObjects.update({
        id: 'agent1',
        type: AGENT_SAVED_OBJECT_TYPE,
        attributes: {
          local_metadata: { elastic: { agent: { upgradeable: true, version: kibanaVersion } } },
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
      await kibanaServer.savedObjects.update({
        id: 'agent1',
        type: AGENT_SAVED_OBJECT_TYPE,
        attributes: {
          local_metadata: { elastic: { agent: { upgradeable: true, version: kibanaVersion } } },
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

      await kibanaServer.savedObjects.update({
        id: 'agent1',
        type: AGENT_SAVED_OBJECT_TYPE,
        attributes: {
          local_metadata: { elastic: { agent: { upgradeable: true, version: '0.0.0' } } },
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
      await kibanaServer.savedObjects.update({
        id: 'agent1',
        type: AGENT_SAVED_OBJECT_TYPE,
        attributes: {
          local_metadata: { elastic: { agent: { upgradeable: true, version: '0.0.0' } } },
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
          source_uri: 'http://path/to/download',
        })
        .expect(400);
    });
    it('should respond 400 if trying to upgrade an agent that is unenrolling', async () => {
      const kibanaVersion = await kibanaServer.version.get();
      await supertest.post(`/api/fleet/agents/agent1/unenroll`).set('kbn-xsrf', 'xxx').send({
        force: true,
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
      await kibanaServer.savedObjects.update({
        id: 'agent1',
        type: AGENT_SAVED_OBJECT_TYPE,
        attributes: { unenrolled_at: new Date().toISOString() },
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

    it('should respond 200 to bulk upgrade upgradeable agents and update the agent SOs', async () => {
      const kibanaVersion = await kibanaServer.version.get();
      await kibanaServer.savedObjects.update({
        id: 'agent1',
        type: AGENT_SAVED_OBJECT_TYPE,
        attributes: {
          local_metadata: { elastic: { agent: { upgradeable: true, version: '0.0.0' } } },
        },
      });
      await kibanaServer.savedObjects.update({
        id: 'agent2',
        type: AGENT_SAVED_OBJECT_TYPE,
        attributes: {
          local_metadata: {
            elastic: { agent: { upgradeable: true, version: semver.inc(kibanaVersion, 'patch') } },
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
      await kibanaServer.savedObjects.update({
        id: 'agent1',
        type: AGENT_SAVED_OBJECT_TYPE,
        attributes: {
          local_metadata: { elastic: { agent: { upgradeable: true, version: '0.0.0' } } },
        },
      });
      await kibanaServer.savedObjects.update({
        id: 'agent2',
        type: AGENT_SAVED_OBJECT_TYPE,
        attributes: {
          local_metadata: {
            elastic: { agent: { upgradeable: true, version: semver.inc(kibanaVersion, 'patch') } },
          },
        },
      });
      await supertest
        .post(`/api/fleet/agents/bulk_upgrade`)
        .set('kbn-xsrf', 'xxx')
        .send({
          agents: 'fleet-agents.active: true',
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
        force: true,
      });
      await kibanaServer.savedObjects.update({
        id: 'agent1',
        type: AGENT_SAVED_OBJECT_TYPE,
        attributes: {
          local_metadata: { elastic: { agent: { upgradeable: true, version: '0.0.0' } } },
        },
      });
      await kibanaServer.savedObjects.update({
        id: 'agent2',
        type: AGENT_SAVED_OBJECT_TYPE,
        attributes: {
          local_metadata: {
            elastic: { agent: { upgradeable: true, version: '0.0.0' } },
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
      await kibanaServer.savedObjects.update({
        id: 'agent1',
        type: AGENT_SAVED_OBJECT_TYPE,
        attributes: {
          unenrolled_at: new Date().toISOString(),
          local_metadata: { elastic: { agent: { upgradeable: true, version: '0.0.0' } } },
        },
      });
      await kibanaServer.savedObjects.update({
        id: 'agent2',
        type: AGENT_SAVED_OBJECT_TYPE,
        attributes: {
          local_metadata: {
            elastic: { agent: { upgradeable: true, version: '0.0.0' } },
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
      await kibanaServer.savedObjects.update({
        id: 'agent1',
        type: AGENT_SAVED_OBJECT_TYPE,
        attributes: {
          local_metadata: { elastic: { agent: { upgradeable: true, version: '0.0.0' } } },
        },
      });
      await kibanaServer.savedObjects.update({
        id: 'agent2',
        type: AGENT_SAVED_OBJECT_TYPE,
        attributes: {
          local_metadata: {
            elastic: { agent: { upgradeable: true, version: semver.inc(kibanaVersion, 'patch') } },
          },
        },
      });
      await kibanaServer.savedObjects.update({
        id: 'agent3',
        type: AGENT_SAVED_OBJECT_TYPE,
        attributes: {
          local_metadata: { elastic: { agent: { upgradeable: false, version: '0.0.0' } } },
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
      await kibanaServer.savedObjects.update({
        id: 'agent1',
        type: AGENT_SAVED_OBJECT_TYPE,
        attributes: {
          local_metadata: { elastic: { agent: { upgradeable: true, version: '0.0.0' } } },
        },
      });
      await kibanaServer.savedObjects.update({
        id: 'agent2',
        type: AGENT_SAVED_OBJECT_TYPE,
        attributes: {
          local_metadata: {
            elastic: { agent: { upgradeable: true, version: semver.inc(kibanaVersion, 'patch') } },
          },
        },
      });
      await kibanaServer.savedObjects.update({
        id: 'agent3',
        type: AGENT_SAVED_OBJECT_TYPE,
        attributes: {
          local_metadata: { elastic: { agent: { upgradeable: false, version: '0.0.0' } } },
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
      await kibanaServer.savedObjects.update({
        id: 'agent1',
        type: AGENT_SAVED_OBJECT_TYPE,
        attributes: {
          local_metadata: { elastic: { agent: { upgradeable: true, version: '0.0.0' } } },
        },
      });
      await kibanaServer.savedObjects.update({
        id: 'agent2',
        type: AGENT_SAVED_OBJECT_TYPE,
        attributes: {
          local_metadata: { elastic: { agent: { upgradeable: true, version: '0.0.0' } } },
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
  });
}
