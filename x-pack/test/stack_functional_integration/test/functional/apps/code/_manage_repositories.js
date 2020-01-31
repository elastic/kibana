/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

export default ({ getService, getPageObjects }) => {
  const log = getService('log');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common', 'code']);

  const repo = 'elastic/code-examples_empty-file';

  describe('Manage Repositories', function manageRepositoryTest() {
    before(() => {
      log.debug('navigate to code app');
      return PageObjects.common.navigateToApp('code');
    });

    it('import repository', async function() {
      await PageObjects.code.fillImportRepositoryUrlInputBox(`https://github.com/${repo}`);
      await PageObjects.code.clickImportRepositoryButton();

      await retry.tryForTime(300000, async () => {
        const repositoryItem = await testSubjects.find('codeRepositoryItem');
        expect(await repositoryItem.getVisibleText()).to.equal(repo);
      });
      await retry.try(async function waitForIndexStart() {
        const ongoing = await testSubjects.find('repositoryIndexOngoing');
        const exist = !!ongoing;
        expect(exist).to.be(true);
      });
      await retry.try(async function waitForIndexEnd() {
        const done = await testSubjects.find('repositoryIndexDone');
        const exist = !!done;
        expect(exist).to.be(true);
      });
    });

    it('delete repository', async () => {
      await PageObjects.code.clickDeleteRepositoryButton();

      await retry.try(async () => {
        const confirmButton = await testSubjects.find('confirmModalConfirmButton');
        const exist = !!confirmButton;
        expect(exist).to.be(true);
      });

      await testSubjects.click('confirmModalConfirmButton');

      await retry.tryForTime(300000, async () => {
        const importbutton = await testSubjects.find('importRepositoryButton');
        const exist = !!importbutton;
        expect(exist).to.be(true);
      });
    });
  });
};
