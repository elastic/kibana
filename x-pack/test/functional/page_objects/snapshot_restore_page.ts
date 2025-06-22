/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function SnapshotRestorePageProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const find = getService('find');

  return {
    async appTitleText() {
      return await testSubjects.getVisibleText('appTitle');
    },
    async registerRepositoryButton() {
      return await testSubjects.find('registerRepositoryButton');
    },
    async navToRepositories(emptyList: boolean = true) {
      await testSubjects.click('repositories_tab');
      await retry.waitForWithTimeout(
        'Wait for register repository button to be on page',
        10000,
        async () => {
          return await testSubjects.isDisplayed('registerRepositoryButton');
        }
      );
    },
    async navToPolicies(emptyList: boolean = true) {
      await testSubjects.click('policies_tab');
      await retry.waitForWithTimeout(
        'Wait for register repository button to be on page',
        10000,
        async () => {
          return await testSubjects.isDisplayed('createPolicyButton');
        }
      );
    },
    async navToRestoreStatus(emptyList: boolean = true) {
      await testSubjects.click('restore_status_tab');
      await retry.waitForWithTimeout(
        'Wait for register repository button to be on page',
        10000,
        async () => {
          return await testSubjects.isDisplayed(
            emptyList ? 'noRestoredSnapshotsHeader' : 'restoreList'
          );
        }
      );
    },
    async navToSnapshots(emptyList: boolean = true) {
      await testSubjects.click('snapshots_tab');
      await retry.waitForWithTimeout('Wait for snapshot list to be on page', 10000, async () => {
        return await testSubjects.isDisplayed(emptyList ? 'emptyPrompt' : 'snapshotList');
      });
    },

    async fillCreateNewPolicyPageOne(
      policyName: string,
      snapshotName: string,
      repositoryName?: string
    ) {
      await testSubjects.click('createPolicyButton');
      await testSubjects.setValue('nameInput', policyName);
      await testSubjects.setValue('snapshotNameInput', snapshotName);
      if (repositoryName) {
        await testSubjects.selectValue('repositorySelect', repositoryName);
      }
      await testSubjects.click('nextButton');
      await retry.waitFor('all indices to be visible', async () => {
        return await testSubjects.isDisplayed('allIndicesToggle');
      });
    },

    async fillCreateNewPolicyPageTwo(singleIndexToSelect?: string) {
      if (singleIndexToSelect) {
        await testSubjects.click('allIndicesToggle');
        await testSubjects.click('useIndexPatternsButton');
        await testSubjects.setValue('comboBoxSearchInput', singleIndexToSelect);
        await testSubjects.pressEnter('comboBoxSearchInput');
      }
      await testSubjects.click('nextButton');
      await retry.waitFor('expire after value input to be visible', async () => {
        return await testSubjects.isDisplayed('expireAfterValueInput');
      });
    },

    async fillCreateNewPolicyPageThree() {
      await testSubjects.click('nextButton');
      await retry.waitFor('submit button to be visible', async () => {
        return await testSubjects.isDisplayed('submitButton');
      });
    },

    async submitNewPolicy() {
      await testSubjects.click('submitButton');
      await retry.waitFor('policy management button to be visible', async () => {
        return await testSubjects.isDisplayed('policyActionMenuButton');
      });
    },

    async closeFlyout() {
      await testSubjects.click('srPolicyDetailsFlyoutCloseButton');
      await retry.waitFor('policy table to be visible', async () => {
        return await testSubjects.isDisplayed('policyLink');
      });
    },
    async closeSnaphsotFlyout() {
      await testSubjects.click('euiFlyoutCloseButton');
      await retry.waitFor('snapshot table to be visible', async () => {
        return await testSubjects.isDisplayed('snapshotLink');
      });
    },
    async closeRepositoriesFlyout() {
      await testSubjects.click('srRepositoryDetailsFlyoutCloseButton');
      await retry.waitFor('repositories table to be visible', async () => {
        return await testSubjects.isDisplayed('repositoryLink');
      });
    },
    async getSnapshotList() {
      const table = await testSubjects.find('snapshotTable');
      const rows = await table.findAllByTestSubject('row');
      return await Promise.all(
        rows.map(async (row) => {
          return {
            snapshotLink: await row.findByTestSubject('snapshotLink'),
            repoLink: await row.findByTestSubject('repositoryLink'),
            snapshotRestore: row.findByTestSubject('srsnapshotListRestoreActionButton'),
          };
        })
      );
    },
    async getRepoList() {
      const table = await testSubjects.find('repositoryTable');
      const rows = await table.findAllByTestSubject('row');
      return await Promise.all(
        rows.map(async (row) => {
          return {
            repoName: await (await row.findByTestSubject('Name_cell')).getVisibleText(),
            repoLink: await (await row.findByTestSubject('Name_cell')).findByCssSelector('a'),
            repoType: await (await row.findByTestSubject('Type_cell')).getVisibleText(),
            repoEdit: await row.findByTestSubject('editRepositoryButton'),
            repoDelete: await row.findByTestSubject('deleteRepositoryButton'),
          };
        })
      );
    },
    async getRestoreStatusList() {
      const table = await testSubjects.find('restoreList');
      const rows = await table.findAllByTestSubject('row');
      return await Promise.all(
        rows.map(async (row) => {
          return {
            index: await row.findByTestSubject('restoreTableIndex'),
            isComplete: await row.findByTestSubject('restoreTableIsComplete'),
          };
        })
      );
    },
    async viewRepositoryDetails(name: string) {
      const repos = await this.getRepoList();
      if (repos.length === 1) {
        const repoToView = repos.filter((r) => (r.repoName = name))[0];
        await repoToView.repoLink.click();
      }
      await retry.waitForWithTimeout(`Repo title should be ${name}`, 25000, async () => {
        return (await testSubjects.getVisibleText('title')) === name;
      });
    },
    async performRepositoryCleanup() {
      await testSubjects.click('cleanupRepositoryButton');
      await retry.waitForWithTimeout(`wait for code block to be visible`, 25000, async () => {
        return await testSubjects.isDisplayed('cleanupCodeBlock');
      });
      return await testSubjects.getVisibleText('cleanupCodeBlock');
    },

    async clickPolicyNameLink(name: string): Promise<void> {
      await find.clickByLinkText(name);
    },

    async clickRestoredStatusNameLink(name: string): Promise<void> {
      await find.clickByLinkText(name);
    },

    async clickPolicyActionButton() {
      await testSubjects.click('policyActionMenuButton');
      await retry.waitFor('run button to be visible', async () => {
        return await testSubjects.isDisplayed('policyActionMenuRunPolicy');
      });
    },

    async clickRunPolicy() {
      await testSubjects.click('policyActionMenuRunPolicy');
      await retry.waitFor('confirm modal to be visible', async () => {
        return await testSubjects.isDisplayed('confirmModalConfirmButton');
      });
    },

    async clickConfirmationModal() {
      await testSubjects.click('confirmModalConfirmButton');
    },

    async clickShowCollapsedIndicesIfPresent() {
      if (await testSubjects.exists('collapsibleIndicesArrow')) {
        await testSubjects.click('collapsibleIndicesArrow');
      }
    },

    async restoreSnapshot(indexName: string, rename: boolean = false) {
      await testSubjects.click('restoreSnapshotButton');
      await retry.waitFor('restore form to be visible', async () => {
        return await testSubjects.isDisplayed('snapshotRestoreApp');
      });

      await testSubjects.click('allDsAndIndicesToggle');
      await testSubjects.click('restoreIndexPatternsButton');
      await testSubjects.setValue('comboBoxSearchInput', indexName);
      await testSubjects.pressEnter('comboBoxSearchInput');

      if (rename) {
        await testSubjects.click('restoreRenameToggle');
        await testSubjects.setValue('capturePattern', `${indexName}(.*)`);
        await testSubjects.setValue('replacementPattern', `restored_${indexName}$1`);
      }
      await testSubjects.click('nextButton');
      await retry.waitFor('index settings to be visible', async () => {
        return await testSubjects.isDisplayed('indexSettingsTitle');
      });
      await testSubjects.click('nextButton');
      await retry.waitFor('review step to be visible', async () => {
        return await testSubjects.isDisplayed('reviewSnapshotTitle');
      });
      await testSubjects.click('restoreButton');
    },

    async createSourceOnlyRepositoryStepOne(repositoryName: string) {
      await testSubjects.click('registerRepositoryButton');
      await testSubjects.setValue('nameInput', `${repositoryName}`);
      await testSubjects.click('fsRepositoryType');
      await testSubjects.click('sourceOnlyToggle');
      await testSubjects.click('nextButton');
      await retry.waitFor('step two to be visible', async () => {
        return await testSubjects.isDisplayed('stepTwo');
      });
    },
    async createSourceOnlyRepositoryStepTwo(location: string) {
      await testSubjects.setValue('locationInput', location);
      await testSubjects.click('submitButton');
      await retry.waitFor('repository list to be visible', async () => {
        return await testSubjects.isDisplayed('repositoryList');
      });
    },

    async refreshWhileSnapshotIsInProgress() {
      let isInProgress = true;
      while (isInProgress) {
        const table = await testSubjects.find('snapshotTable');
        const rows = await table.findAllByTestSubject('row');
        const snapshotState = await (
          await rows[0].findByTestSubject('snapshotState')
        ).getVisibleText();

        if (snapshotState === 'In progress') {
          await testSubjects.click('reloadButton');
        } else {
          isInProgress = false;
        }
      }
    },
  };
}
