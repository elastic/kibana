import expect from 'expect.js';

import { bdd } from '../../../support';

import PageObjects from '../../../support/page_objects';

bdd.describe('Manage Repositories', function manageRepositoryTest() {
  bdd.before(function () {
    // Navigate to the code app.
    PageObjects.common.debug('navigate to code app');
    return PageObjects.common.navigateToApp('code');
  });

  bdd.it('import repository', async function() {
    // Fill in the import repository input box with a valid git repository url.
    await PageObjects.code.fillImportRepositoryUrlInputBox(
      'https://github.com/elastic/code-examples_empty-file'
    );
    // Click the import repository button.
    await PageObjects.code.clickImportRepositoryButton();

    await PageObjects.common.tryForTime(300000, async () => {
      const repositoryItem = await PageObjects.common.findTestSubject('codeRepositoryItem');
      expect(await repositoryItem.getVisibleText()).to.equal(
        'elastic/code-examples_empty-file'
      );
    });

    // Wait for the index to start.
    await PageObjects.common.try(async () => {
      const ongoing = PageObjects.common.findTestSubject('repositoryIndexOngoing');
      const exist = !!ongoing;
      expect(exist).to.be(true);
    });
    // Wait for the index to end.
    await PageObjects.common.try(async () => {
      const done = PageObjects.common.findTestSubject('repositoryIndexDone');
      const exist = !!done;
      expect(exist).to.be(true);
    });
  });

  bdd.it('delete repository', async () => {
    // Click the delete repository button.
    await PageObjects.code.clickDeleteRepositoryButton();

    await PageObjects.common.try(async () => {
      const confirmButton = PageObjects.common.findTestSubject('confirmModalConfirmButton');
      const exist = !!confirmButton;
      expect(exist).to.be(true);
    });

    await PageObjects.common.findTestSubject('confirmModalConfirmButton').click();

    await PageObjects.common.tryForTime(300000, async () => {
      const importbutton = await PageObjects.common.findTestSubject('importRepositoryButton');
      const exist = !!importbutton;
      expect(exist).to.be(true);
    });
  });
});
