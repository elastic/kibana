/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'settings', 'header', 'snapshotRestore']);
  const a11y = getService('a11y');
  const es = getService('es');

  async function createRepo(repoName: string) {
    await es.snapshot.createRepository({
      name: repoName,
      verify: true,
      repository: {
        type: 'fs',
        settings: {
          location: 'temp',
        },
      },
    });
  }

  describe('Stack management- snapshot restore a11y tests', () => {
    before(async () => {
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickSnapshotRestore();
    });

    describe('empty state', () => {
      it('empty snapshots table', async () => {
        await a11y.testAppSnapshot();
      });

      it('empty repositories table', async () => {
        await PageObjects.snapshotRestore.navToRepositories();
        await a11y.testAppSnapshot();
      });

      it('empty policies table', async () => {
        await PageObjects.snapshotRestore.navToPolicies();
        await a11y.testAppSnapshot();
      });

      it('empty restored snapshots status table', async () => {
        await PageObjects.snapshotRestore.navToRestoreStatus();
        await a11y.testAppSnapshot();
      });
    });

    describe('table views with data', () => {
      const testRepoName = 'testrepo';
      const snapshotName = `testsnapshot${Date.now().toString()}`;
      before(async () => {
        await createRepo(testRepoName);
        await es.snapshot.create({
          repository: testRepoName,
          snapshot: snapshotName,
          wait_for_completion: true,
        });

        await PageObjects.settings.navigateTo();
        await PageObjects.settings.clickSnapshotRestore();
      });
      it('snapshots table with data', async () => {
        await a11y.testAppSnapshot();
      });
      it('repository table with data', async () => {
        await PageObjects.snapshotRestore.navToRepositories();
        await a11y.testAppSnapshot();
      });

      after(async () => {
        await es.snapshot.delete({ snapshot: snapshotName, repository: testRepoName });
        await es.snapshot.deleteRepository({ name: [testRepoName] });
      });
    });

    describe('create policy wizard', () => {
      const testRepoName = 'policyrepo';
      before(async () => {
        await createRepo(testRepoName);
        await PageObjects.snapshotRestore.navToPolicies();
      });
      it('page one', async () => {
        await PageObjects.snapshotRestore.fillCreateNewPolicyPageOne(
          'testpolicy',
          '<daily-snap-{now/d}>'
        );
        await a11y.testAppSnapshot();
      });
      it('page two', async () => {
        await PageObjects.snapshotRestore.fillCreateNewPolicyPageTwo();
        await a11y.testAppSnapshot();
      });
      it('page three', async () => {
        await PageObjects.snapshotRestore.fillCreateNewPolicyPageThree();
        await a11y.testAppSnapshot();
      });
      it('submit page four and flyout', async () => {
        await PageObjects.snapshotRestore.submitNewPolicy();
        await a11y.testAppSnapshot();
      });
      it('policy table with data', async () => {
        await PageObjects.snapshotRestore.closeFlyout();
        await a11y.testAppSnapshot();
      });

      after(async () => {
        await es.snapshot.deleteRepository({ name: [testRepoName] });
        await es.slm.deleteLifecycle({ policy_id: 'testpolicy' });
      });
    });
  });
}
