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

  describe('Snapshot restore', function () {
    const REPOSITORY = 'my-repository';
    before(async () => {
      await security.testUser.setRoles(['snapshot_restore_user'], { skipBrowserRefresh: true });
      await pageObjects.common.navigateToApp('snapshotRestore');

      // Create a repository
      await es.snapshot.createRepository({
        name: REPOSITORY,
        verify: true,
        repository: {
          type: 'fs',
          settings: {
            location: '/tmp/es-backups/',
            compress: true,
          },
        },
      });
    });

    describe('Snapshot', () => {
      before(async () => {
        // Create a snapshot
        await es.snapshot.create({
          snapshot: 'my-snapshot',
          repository: REPOSITORY,
        });

        // Wait for snapshot to be ready
        await pageObjects.common.sleep(2000);

        // Refresh page so that the snapshot shows up in the snapshots table
        await browser.refresh();
      });

      after(async () => {
        await es.snapshot.delete({
          snapshot: 'my-snapshot',
          repository: REPOSITORY,
        });
      });

      it('Renders the Snapshot restore form', async () => {
        const snapshots = await pageObjects.snapshotRestore.getSnapshotList();
        const snapshotRestoreButton = await snapshots[0].snapshotRestore;
        // Open the Snapshot restore form
        await snapshotRestoreButton.click();

        // Go to second step (Index settings)
        await testSubjects.click('nextButton');

        // Verify that the Index Settings editor is rendered (uses CodeEditor)
        await testSubjects.click('modifyIndexSettingsSwitch');
        expect(await testSubjects.exists('indexSettingsEditor')).to.be(true);

        // Close Index Settings editor
        await testSubjects.click('modifyIndexSettingsSwitch');

        // Go to final step (Review)
        await testSubjects.click('nextButton');

        // Verify that Restore button exists
        expect(await testSubjects.exists('restoreButton')).to.be(true);
      });
    });

    describe('Allows to create and restore a snapshot from a Logsdb index', () => {
      const logsDbIndex = 'logsdb-index';
      const policyId = 'testPolicy';
      const snapshotPrefx = 'logsdb-snap';

      before(async () => {
        await es.indices.create({
          index: logsDbIndex,
          settings: {
            mode: 'logsdb',
          },
        });
        await pageObjects.common.navigateToApp('snapshotRestore');
        // Create a policy
        await pageObjects.snapshotRestore.navToPolicies();
        await pageObjects.snapshotRestore.fillCreateNewPolicyPageOne(
          policyId,
          `<${snapshotPrefx}-{now/d}>`
        );
        await pageObjects.snapshotRestore.fillCreateNewPolicyPageTwo();
        await pageObjects.snapshotRestore.fillCreateNewPolicyPageThree();
        await pageObjects.snapshotRestore.submitNewPolicy();
        await pageObjects.snapshotRestore.closeFlyout();
      });

      after(async () => {
        // Delete the logdb index
        await es.indices.delete({
          index: logsDbIndex,
        });
        // Delete policy
        await es.slm.deleteLifecycle({
          policy_id: policyId,
        });
        await es.snapshot.delete({
          snapshot: `${snapshotPrefx}-*`,
          repository: REPOSITORY,
        });
        await es.indices.delete({
          index: `restored_${logsDbIndex}`,
        });
      });

      it('create snapshot', async () => {
        // Verify there are no snapshots
        await pageObjects.snapshotRestore.navToSnapshots();
        expect(await testSubjects.exists('emptyPrompt')).to.be(true);

        // Run policy snapshot
        await pageObjects.snapshotRestore.navToPolicies();

        await pageObjects.snapshotRestore.clickPolicyNameLink(policyId);
        await pageObjects.snapshotRestore.clickPolicyActionButton();
        await pageObjects.snapshotRestore.clickRunPolicy();
        await pageObjects.snapshotRestore.clickConfirmationModal();
        await pageObjects.snapshotRestore.closeFlyout();

        // Wait for snapshot to be ready
        await pageObjects.common.sleep(2000);

        // Open snapshot info flyout
        await pageObjects.snapshotRestore.navToSnapshots(false);
        await pageObjects.header.waitUntilLoadingHasFinished();
        expect(await testSubjects.exists('snapshotList')).to.be(true);

        // Reload page to make sure snapshot is complete
        await testSubjects.click('reloadButton');
        await pageObjects.header.waitUntilLoadingHasFinished();

        // Verify that one snapshot has been created
        const snapshots = await pageObjects.snapshotRestore.getSnapshotList();
        expect(snapshots.length).to.be(1);

        // Verify that snaphot has been created
        const snapshotLink = snapshots[0].snapshotLink;
        await snapshotLink.click();

        // Verify snapshot exists, is complete and contains the logsdb index
        expect(await testSubjects.exists('detailTitle')).to.be(true);
        expect(await testSubjects.getVisibleText('detailTitle')).to.contain(snapshotPrefx);
        expect(await testSubjects.exists('state')).to.be(true);
        expect(await testSubjects.getVisibleText('state')).to.contain('Complete');
        await pageObjects.snapshotRestore.clickShowCollapsedIndicesIfPresent();
        expect(await testSubjects.getVisibleText('indices')).to.contain(logsDbIndex);
        await pageObjects.snapshotRestore.closeSnaphsotFlyout();
      });

      it('restore snapshot', async () => {
        // Verify there are not restore snapshots
        await pageObjects.snapshotRestore.navToRestoreStatus();
        await pageObjects.header.waitUntilLoadingHasFinished();
        expect(await testSubjects.exists('noRestoredSnapshotsHeader')).to.be(true);

        // restore snapshot
        await pageObjects.snapshotRestore.navToSnapshots(false);
        await pageObjects.header.waitUntilLoadingHasFinished();

        const snapshots = await pageObjects.snapshotRestore.getSnapshotList();
        const snapshotLink = snapshots[0].snapshotLink;
        await snapshotLink.click();
        await pageObjects.snapshotRestore.restoreSnapshot(logsDbIndex, true);

        // Verify snapshot has been restored and is complete
        await pageObjects.snapshotRestore.navToRestoreStatus(false);
        const status = await pageObjects.snapshotRestore.getRestoreStatusList();
        const statusIndex = status[0].index;
        const statusIsComplete = status[0].isComplete;
        expect(await statusIndex.getVisibleText()).to.be(`restored_${logsDbIndex}`);
        expect(await statusIsComplete.getVisibleText()).to.contain('Complete');
      });
    });

    after(async () => {
      await es.snapshot.deleteRepository({
        name: REPOSITORY,
      });
      await security.testUser.restoreDefaults();
    });
  });
};
