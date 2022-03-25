/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');
  const deployment = getService('deployment');

  const CLOUD_SNAPSHOT_REPOSITORY = 'found-snapshots';

  const createCloudRepository = () => {
    return es.snapshot.createRepository({
      name: CLOUD_SNAPSHOT_REPOSITORY,
      body: {
        type: 'fs',
        settings: {
          location: '/tmp/cloud-snapshots/',
        },
      },
      verify: false,
    });
  };

  const createCloudSnapshot = (snapshotName: string) => {
    return es.snapshot.create({
      repository: CLOUD_SNAPSHOT_REPOSITORY,
      snapshot: snapshotName,
      wait_for_completion: true,
      // Configure snapshot so no indices are captured, so the request completes ASAP.
      body: {
        indices: 'this_index_doesnt_exist',
        ignore_unavailable: true,
        include_global_state: false,
      },
    });
  };

  const deleteCloudSnapshot = (snapshotName: string) => {
    return es.snapshot.delete({
      repository: CLOUD_SNAPSHOT_REPOSITORY,
      snapshot: snapshotName,
    });
  };

  describe('Cloud backup status', function () {
    // file system repositories are not supported in cloud
    this.tags(['skipCloud']);
    this.onlyEsVersion('<=7');

    describe('get', () => {
      describe('with backups present', () => {
        // Needs SnapshotInfo type https://github.com/elastic/elasticsearch-specification/issues/685
        let mostRecentSnapshot: any;

        before(async () => {
          const isCloud = await deployment.isCloud();
          if (!isCloud) {
            await createCloudRepository();
          }
          await createCloudSnapshot('test_snapshot_1');
          mostRecentSnapshot = (await createCloudSnapshot('test_snapshot_2')).snapshot;
        });

        after(async () => {
          await deleteCloudSnapshot('test_snapshot_1');
          await deleteCloudSnapshot('test_snapshot_2');
        });

        it('returns status based on most recent snapshot', async () => {
          const { body: cloudBackupStatus } = await supertest
            .get('/api/upgrade_assistant/cloud_backup_status')
            .set('kbn-xsrf', 'xxx')
            .expect(200);

          expect(cloudBackupStatus.isBackedUp).to.be(true);
          expect(cloudBackupStatus.lastBackupTime).to.be(mostRecentSnapshot.start_time);
        });
      });

      describe('without backups present', () => {
        // snapshot repository on Cloud always has a snapshot so the status is returned as backed up
        this.tags(['skipCloud']);
        it('returns not-backed-up status', async () => {
          const { body: cloudBackupStatus } = await supertest
            .get('/api/upgrade_assistant/cloud_backup_status')
            .set('kbn-xsrf', 'xxx')
            .expect(200);

          expect(cloudBackupStatus.isBackedUp).to.be(false);
          expect(cloudBackupStatus.lastBackupTime).to.be(undefined);
        });
      });
    });
  });
}
