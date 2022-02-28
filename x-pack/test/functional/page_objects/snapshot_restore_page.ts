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
  };
}
