/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  // const pageObjects = getPageObjects([
  // 'common',
  // 'remoteClusters',
  // 'indexManagement',
  // 'crossClusterReplication',
  //   'fleetSettingsPage',
  // ]);
  const security = getService('security');
  const retry = getService('retry');
  // const testSubjects = getService('testSubjects');
  const remoteEs = getService('remoteEs' as 'es');
  const localEs = getService('es');
  const supertest = getService('supertest');

  describe('Fleet Multi Cluster Sync Integrations', function () {
    // const leaderName = 'my-index';
    // const followerName = 'my-follower';
    before(async () => {
      await security.testUser.setRoles(['superuser']);
      // This test is temporarily using superuser because of an issue with the permissions
      // of the follower index creation wizard. There is an open issue to address the issue.
      // We can change the permissions to use follower_index_user once the issue is fixed.
      // https://github.com/elastic/kibana/issues/143720
      // await security.testUser.setRoles(['follower_index_user']);
    });

    describe('Sync integrations', function () {
      before(async () => {
        // await pageObjects.fleetSettingsPage.navigateToSettingsPage();
      });

      it('should add Remote ES output with sync integrations', async () => {
        // await pageObjects.fleetSettingsPage.addRemoteESOutput();

        const { token } = await remoteEs.security.createServiceToken({
          namespace: 'elastic',
          service: 'fleet-server-remote',
        });

        const apiKeyResp = await remoteEs.security.createApiKey({
          name: 'integration_sync_api_key',
          role_descriptors: {
            integration_writer: {
              cluster: [],
              indices: [],
              applications: [
                {
                  application: 'kibana-.kibana',
                  privileges: ['feature_fleet.read', 'feature_fleetv2.read'],
                  resources: ['*'],
                },
              ],
            },
          },
        });

        await supertest
          .post('/api/fleet/outputs')
          .set('kbn-xsrf', 'xxxx')
          .send({
            id: 'remote-elasticsearch1',
            name: 'Remote ES Output',
            type: 'remote_elasticsearch',
            hosts: ['http://localhost:9221'],
            kibana_api_key: apiKeyResp.encoded,
            kibana_url: 'http://localhost:5601/julia',
            sync_integrations: true,
            sync_uninstalled_integrations: true,
            secrets: {
              service_token: token.value,
            },
          })
          .expect(200);

        let resp = await remoteEs.cluster.putSettings({
          persistent: {
            cluster: {
              remote: {
                local: {
                  seeds: ['localhost:9300'],
                },
              },
            },
          },
        });
        expect(resp.acknowledged).to.be(true);

        resp = await remoteEs.ccr.follow({
          index: 'fleet-synced-integrations-ccr-local',
          body: {
            remote_cluster: 'local',
            leader_index: 'fleet-synced-integrations',
          },
          wait_for_active_shards: '1',
        });
        expect(resp.follow_index_created).to.be(true);

        await retry.tryForTime(10000, async () => {
          resp = await remoteEs.get({
            id: 'fleet-synced-integrations',
            index: 'fleet-synced-integrations-ccr-local',
          });
          expect(resp.found).to.be(true);
        });

        // TODO need remote kibana to let sync task run on remote
      });

      after(async () => {
        // Clean up the remote output
        await supertest
          .delete('/api/fleet/outputs/remote-elasticsearch1')
          .set('kbn-xsrf', 'xxxx')
          .expect(200);
      });
    });

    after(async () => {
      await localEs.indices.delete({
        index: 'fleet-synced-integrations',
      });
      await remoteEs.indices.delete({
        index: 'fleet-synced-integrations-ccr-local',
      });
      await security.testUser.restoreDefaults();
    });
  });
};
