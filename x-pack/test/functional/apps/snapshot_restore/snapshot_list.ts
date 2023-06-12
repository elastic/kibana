/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['common', 'snapshotRestore', 'header']);
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const es = getService('es');
  const security = getService('security');

  describe('Snapshot list', function () {
    describe('Managed snapshots', function () {
      const FIRST_SNAPSHOT_NAME = 'managed-snapshot-1';
      const SECOND_SNAPSHOT_NAME = 'managed-snapshot-2';
      const MANAGED_REPO_NAME = 'found-snapshots';

      before(async () => {
        await security.testUser.setRoles(['snapshot_restore_user'], { skipBrowserRefresh: true });
        await pageObjects.common.navigateToApp('snapshotRestore');

        // Set cluster settings for manager repository
        await es.cluster.putSettings({
          persistent: {
            'cluster.metadata.managed_repository': 'found-snapshots',
          },
        });

        // Create a managed repository
        await es.snapshot.createRepository({
          name: MANAGED_REPO_NAME,
          type: 'fs',
          settings: {
            location: '/tmp/es-backups/',
            compress: true,
          },
          verify: true,
        });

        // Create managed snapshots
        await es.snapshot.create({
          snapshot: FIRST_SNAPSHOT_NAME,
          repository: MANAGED_REPO_NAME,
        });

        await es.snapshot.create({
          snapshot: SECOND_SNAPSHOT_NAME,
          repository: MANAGED_REPO_NAME,
        });

        // Wait for snapshots to be ready
        await pageObjects.common.sleep(3000);

        // Refresh page so that the snapshots show up in the snapshots table
        await browser.refresh();
      });

      it('Last successful managed snapshot is non-deletable', async () => {
        const snapshots = await pageObjects.snapshotRestore.getSnapshotList();
        const lastSuccessfulSnapshotDeleteButton = snapshots.find(
          (snapshot) => snapshot.snapshotName === SECOND_SNAPSHOT_NAME
        )?.snapshotDelete;
        expect(lastSuccessfulSnapshotDeleteButton).to.not.be(null);

        const firstSuccessfulSnapshotDeleteButton = snapshots.find(
          (snapshot) => snapshot.snapshotName === FIRST_SNAPSHOT_NAME
        )?.snapshotDelete;
        expect(firstSuccessfulSnapshotDeleteButton).to.not.be(null);

        expect(await lastSuccessfulSnapshotDeleteButton?.isEnabled()).to.be(false);
        expect(await firstSuccessfulSnapshotDeleteButton?.isEnabled()).to.be(true);
      });

      it('Last successful managed snapshot is correct when snapshots are filtered', async () => {
        // Filter out last successful managed snapshot
        await testSubjects.setValue('snapshotListSearch', FIRST_SNAPSHOT_NAME);
        // Wait for filter to be applies
        await pageObjects.common.sleep(1000);
        const snapshots = await pageObjects.snapshotRestore.getSnapshotList();
        const firstSuccessfulSnapshotDeleteButton = snapshots.find(
          (snapshot) => snapshot.snapshotName === FIRST_SNAPSHOT_NAME
        )?.snapshotDelete;
        // Verify that the first successful snapshot is in the list and is deletable
        expect(firstSuccessfulSnapshotDeleteButton).to.not.be(null);
        expect(await firstSuccessfulSnapshotDeleteButton?.isEnabled()).to.be(true);

        // Filter out first successful managed snapshot
        await testSubjects.setValue('snapshotListSearch', SECOND_SNAPSHOT_NAME);
        // Wait for filter to be applies
        await pageObjects.common.sleep(1000);
        const newSnapshots = await pageObjects.snapshotRestore.getSnapshotList();
        const lastSuccessfulSnapshotDeleteButton = newSnapshots.find(
          (snapshot) => snapshot.snapshotName === SECOND_SNAPSHOT_NAME
        )?.snapshotDelete;
        // Verify that the last successful snapshot is in the list and is non-deletable
        expect(lastSuccessfulSnapshotDeleteButton).to.not.be(null);
        expect(await lastSuccessfulSnapshotDeleteButton?.isEnabled()).to.be(false);
      });

      after(async () => {
        await es.snapshot.delete({
          snapshot: FIRST_SNAPSHOT_NAME,
          repository: MANAGED_REPO_NAME,
        });
        await es.snapshot.delete({
          snapshot: SECOND_SNAPSHOT_NAME,
          repository: MANAGED_REPO_NAME,
        });
        await es.snapshot.deleteRepository({
          name: MANAGED_REPO_NAME,
        });
        await security.testUser.restoreDefaults();
      });
    });
  });
};
