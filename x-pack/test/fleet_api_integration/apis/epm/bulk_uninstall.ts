/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { SpaceTestApiClient } from '../space_awareness/api_helper';
import { cleanFleetAgents, createFleetAgent } from '../space_awareness/helpers';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const fleetAndAgents = getService('fleetAndAgents');
  const kibanaServer = getService('kibanaServer');
  const esClient = getService('es');

  const apiClient = new SpaceTestApiClient(supertest);

  const deletePackage = async (name: string, version: string) => {
    await supertest.delete(`/api/fleet/epm/packages/${name}/${version}`).set('kbn-xsrf', 'xxxx');
  };

  const installPackage = async (name: string, version: string) => {
    await supertest
      .post(`/api/fleet/epm/packages/${name}/${version}`)
      .send({ force: true })
      .set('kbn-xsrf', 'xxxx');
  };

  describe('packages/_bulk_uninstall', () => {
    skipIfNoDockerRegistry(providerContext);

    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await fleetAndAgents.setup();
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    describe('Validations', () => {
      it('should not allow to create a _bulk_uninstall with non installed packages', async () => {
        const res = await supertest
          .post(`/api/fleet/epm/packages/_bulk_uninstall`)
          .set('kbn-xsrf', 'xxxx')
          .send({ packages: [{ name: 'idonotexists', version: '1.0.0' }] })
          .expect(400);

        expect(res.body.message).equal('Cannot uninstall non-installed packages: idonotexists');
      });
    });

    describe('Uninstall task', () => {
      const PACKAGE_POLICY_ID = 'test-1';
      const AGENT_POLICY_ID = 'test-1';
      beforeEach(async () => {
        await installPackage('multiple_versions', '0.1.0');
        await apiClient.createAgentPolicy(undefined, {
          name: `Test policy ${Date.now()}`,
          namespace: 'default',
          id: AGENT_POLICY_ID,
        });
        await apiClient.createPackagePolicy(undefined, {
          id: PACKAGE_POLICY_ID,
          policy_ids: [AGENT_POLICY_ID],
          package: {
            name: 'multiple_versions',
            version: '0.1.0',
          },
          name: PACKAGE_POLICY_ID,
          description: '',
          namespace: '',
          inputs: {},
        });
      });

      afterEach(async () => {
        await cleanFleetAgents(esClient);
        await deletePackage('multiple_versions', '0.1.0');
        await supertest
          .delete(`/api/fleet/package_policies/${PACKAGE_POLICY_ID}`)
          .set('kbn-xsrf', 'xxxx');
        await apiClient.deleteAgentPolicy(AGENT_POLICY_ID).catch(() => {});
      });

      it('should allow to create a _bulk_uninstall with installed packages that will failed if there is active agents', async () => {
        await createFleetAgent(esClient, AGENT_POLICY_ID);
        const res = await supertest
          .post(`/api/fleet/epm/packages/_bulk_uninstall`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            packages: [{ name: 'multiple_versions', version: '0.1.0' }],
          })
          .expect(200);

        const maxTimeout = Date.now() + 60 * 1000;
        let lastPollResult: string = '';
        while (Date.now() < maxTimeout) {
          const pollRes = await supertest
            .get(`/api/fleet/epm/packages/_bulk_uninstall/${res.body.taskId}`)
            .set('kbn-xsrf', 'xxxx')
            .expect(200);

          await new Promise((resolve) => setTimeout(resolve, 1000));

          if (pollRes.body.status === 'failed') {
            return;
          }

          lastPollResult = JSON.stringify(pollRes.body);
        }

        throw new Error(`bulk uninstall of "multiple_versions" never succeed: ${lastPollResult}`);
      });
      it('should allow to create a _bulk_uninstall with installed packages that will succeed', async () => {
        const res = await supertest
          .post(`/api/fleet/epm/packages/_bulk_uninstall`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            packages: [{ name: 'multiple_versions', version: '0.1.0' }],
          })
          .expect(200);

        const maxTimeout = Date.now() + 60 * 1000;
        let lastPollResult: string = '';
        while (Date.now() < maxTimeout) {
          const pollRes = await supertest
            .get(`/api/fleet/epm/packages/_bulk_uninstall/${res.body.taskId}`)
            .set('kbn-xsrf', 'xxxx')
            .expect(200);

          await new Promise((resolve) => setTimeout(resolve, 1000));

          if (pollRes.body.status === 'success') {
            return;
          }

          lastPollResult = JSON.stringify(pollRes.body);
        }

        throw new Error(`bulk uninstall of "multiple_versions" never succeed: ${lastPollResult}`);
      });
    });
  });
}
