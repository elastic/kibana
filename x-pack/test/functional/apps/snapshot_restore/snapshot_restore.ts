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
    before(async () => {
      await security.testUser.setRoles(['snapshot_restore_user'], { skipBrowserRefresh: true });
      await pageObjects.common.navigateToApp('snapshotRestore');

      // Create a repository
      await es.snapshot.createRepository({
        name: 'my-repository',
        verify: true,
        repository: {
          type: 'fs',
          settings: {
            location: '/tmp/es-backups/',
            compress: true,
          },
        },
      });

      // Create a snapshot
      await es.snapshot.create({
        snapshot: 'my-snapshot',
        repository: 'my-repository',
      });

      // Wait for snapshot to be ready
      await pageObjects.common.sleep(2000);

      // Refresh page so that the snapshot shows up in the snapshots table
      await browser.refresh();
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

    after(async () => {
      await es.snapshot.delete({
        snapshot: 'my-snapshot',
        repository: 'my-repository',
      });
      await es.snapshot.deleteRepository({
        name: 'my-repository',
      });
      await security.testUser.restoreDefaults();
    });
  });
};
