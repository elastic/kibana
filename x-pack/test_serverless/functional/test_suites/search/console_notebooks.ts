/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects(['svlCommonPage', 'svlCommonNavigation']);

  describe('Console Notebooks', function () {
    before(async () => {
      await pageObjects.svlCommonPage.loginWithRole('viewer');
    });

    after(async () => {
      await pageObjects.svlCommonPage.forceLogout();
    });

    it('has notebooks view available', async () => {
      // Expect Console Bar & Notebooks button to exist
      await pageObjects.svlCommonNavigation.devConsole.expectEmbeddedConsoleControlBarExists();
      await pageObjects.svlCommonNavigation.devConsole.expectEmbeddedConsoleNotebooksButtonExists();

      // Click the Notebooks button to open console to See Notebooks
      await pageObjects.svlCommonNavigation.devConsole.clickEmbeddedConsoleNotebooksButton();
      await pageObjects.svlCommonNavigation.devConsole.expectEmbeddedConsoleNotebooksToBeOpen();

      // Click the Notebooks button again to switch to the dev console
      await pageObjects.svlCommonNavigation.devConsole.clickEmbeddedConsoleNotebooksButton();
      await pageObjects.svlCommonNavigation.devConsole.expectEmbeddedConsoleToBeOpen();
      await pageObjects.svlCommonNavigation.devConsole.expectEmbeddedConsoleNotebooksToBeClosed();

      // Clicking control bar should close the console
      await pageObjects.svlCommonNavigation.devConsole.clickEmbeddedConsoleControlBar();
      await pageObjects.svlCommonNavigation.devConsole.expectEmbeddedConsoleNotebooksToBeClosed();
      await pageObjects.svlCommonNavigation.devConsole.expectEmbeddedConsoleToBeClosed();

      // Re-open console and then open Notebooks
      await pageObjects.svlCommonNavigation.devConsole.clickEmbeddedConsoleControlBar();
      await pageObjects.svlCommonNavigation.devConsole.expectEmbeddedConsoleToBeOpen();
      await pageObjects.svlCommonNavigation.devConsole.clickEmbeddedConsoleNotebooksButton();
      await pageObjects.svlCommonNavigation.devConsole.expectEmbeddedConsoleNotebooksToBeOpen();

      // Close the console
      await pageObjects.svlCommonNavigation.devConsole.clickEmbeddedConsoleControlBar();
      await pageObjects.svlCommonNavigation.devConsole.expectEmbeddedConsoleNotebooksToBeClosed();
      await pageObjects.svlCommonNavigation.devConsole.expectEmbeddedConsoleToBeClosed();
    });

    it('can open notebooks', async () => {
      // Click the Notebooks button to open console to See Notebooks
      await pageObjects.svlCommonNavigation.devConsole.clickEmbeddedConsoleNotebooksButton();
      await pageObjects.svlCommonNavigation.devConsole.expectEmbeddedConsoleNotebooksToBeOpen();

      const defaultNotebooks = [
        '00_quick_start',
        '01_keyword_querying_filtering',
        '02_hybrid_search',
        '03_elser',
        '04_multilingual',
      ];
      for (const notebookId of defaultNotebooks) {
        await pageObjects.svlCommonNavigation.devConsole.expectEmbeddedConsoleNotebookListItemToBeAvailable(
          notebookId
        );
        await pageObjects.svlCommonNavigation.devConsole.clickEmbeddedConsoleNotebook(notebookId);
        await pageObjects.svlCommonNavigation.devConsole.expectEmbeddedConsoleNotebookToBeAvailable(
          notebookId
        );
      }
    });
  });
}
