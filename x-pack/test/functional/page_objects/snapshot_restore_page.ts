/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { map as mapAsync } from 'bluebird';
import { FtrProviderContext } from '../ftr_provider_context';

export function SnapshotRestorePageProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  return {
    async appTitleText() {
      return await testSubjects.getVisibleText('appTitle');
    },
    async registerRepositoryButton() {
      return await testSubjects.find('registerRepositoryButton');
    },
    async navToRepositories() {
      await testSubjects.click('repositories_tab');
      await retry.waitForWithTimeout(
        'Wait for register repository button to be on page',
        10000,
        async () => {
          return await testSubjects.isDisplayed('registerRepositoryButton');
        }
      );
    },
    async getRepoList() {
      const table = await testSubjects.find('repositoryTable');
      const rows = await table.findAllByCssSelector('[data-test-subj="row"]');
      return await mapAsync(rows, async row => {
        return {
          repoName: await (
            await row.findByCssSelector('[data-test-subj="Name_cell"]')
          ).getVisibleText(),
          repoLink: await (
            await row.findByCssSelector('[data-test-subj="Name_cell"]')
          ).findByCssSelector('a'),
          repoType: await (
            await row.findByCssSelector('[data-test-subj="Type_cell"]')
          ).getVisibleText(),
          repoEdit: await row.findByCssSelector('[data-test-subj="editRepositoryButton"]'),
          repoDelete: await row.findByCssSelector('[data-test-subj="deleteRepositoryButton"]'),
        };
      });
    },
    async viewRepositoryDetails(name: string) {
      const repos = await this.getRepoList();
      if (repos.length === 1) {
        const repoToView = repos.filter(r => (r.repoName = name))[0];
        await repoToView.repoLink.click();
      }
      await retry.waitForWithTimeout(`Repo title should be ${name}`, 10000, async () => {
        return (await testSubjects.getVisibleText('title')) === name;
      });
    },
    async performRepositoryCleanup() {
      await testSubjects.click('cleanupRepositoryButton');
      return await testSubjects.getVisibleText('cleanupCodeEditor');
    },
  };
}
