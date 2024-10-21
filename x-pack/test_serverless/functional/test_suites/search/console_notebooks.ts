/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects(['svlCommonPage', 'embeddedConsole']);
  const svlSearchNavigation = getService('svlSearchNavigation');

  describe('Console Notebooks', function () {
    before(async () => {
      await pageObjects.svlCommonPage.loginAsViewer();

      await svlSearchNavigation.navigateToGettingStartedPage();
    });

    it('has notebooks view available', async () => {
      // Expect Console Bar & Notebooks button to exist
      await pageObjects.embeddedConsole.expectEmbeddedConsoleControlBarExists();
      await pageObjects.embeddedConsole.expectEmbeddedConsoleNotebooksButtonExists();

      // Click the Notebooks button to open console to See Notebooks
      await pageObjects.embeddedConsole.clickEmbeddedConsoleNotebooksButton();
      await pageObjects.embeddedConsole.expectEmbeddedConsoleNotebooksToBeOpen();

      // Click the Notebooks button again to switch to the dev console
      await pageObjects.embeddedConsole.clickEmbeddedConsoleNotebooksButton();
      await pageObjects.embeddedConsole.expectEmbeddedConsoleToBeOpen();
      await pageObjects.embeddedConsole.expectEmbeddedConsoleNotebooksToBeClosed();

      // Clicking control bar should close the console
      await pageObjects.embeddedConsole.clickEmbeddedConsoleControlBar();
      await pageObjects.embeddedConsole.expectEmbeddedConsoleNotebooksToBeClosed();
      await pageObjects.embeddedConsole.expectEmbeddedConsoleToBeClosed();

      // Re-open console and then open Notebooks
      await pageObjects.embeddedConsole.clickEmbeddedConsoleControlBar();
      await pageObjects.embeddedConsole.expectEmbeddedConsoleToBeOpen();
      await pageObjects.embeddedConsole.clickEmbeddedConsoleNotebooksButton();
      await pageObjects.embeddedConsole.expectEmbeddedConsoleNotebooksToBeOpen();

      // Close the console
      await pageObjects.embeddedConsole.clickEmbeddedConsoleControlBar();
      await pageObjects.embeddedConsole.expectEmbeddedConsoleNotebooksToBeClosed();
      await pageObjects.embeddedConsole.expectEmbeddedConsoleToBeClosed();
    });

    it('can open notebooks', async () => {
      // Click the Notebooks button to open console to See Notebooks
      await pageObjects.embeddedConsole.clickEmbeddedConsoleNotebooksButton();
      await pageObjects.embeddedConsole.expectEmbeddedConsoleNotebooksToBeOpen();

      const defaultNotebooks = [
        '00_quick_start',
        '01_keyword_querying_filtering',
        '02_hybrid_search',
        '03_elser',
        '04_multilingual',
      ];
      for (const notebookId of defaultNotebooks) {
        await pageObjects.embeddedConsole.expectEmbeddedConsoleNotebookListItemToBeAvailable(
          notebookId
        );
        await pageObjects.embeddedConsole.clickEmbeddedConsoleNotebook(notebookId);
        await pageObjects.embeddedConsole.expectEmbeddedConsoleNotebookToBeAvailable(notebookId);
      }
    });
  });
}
