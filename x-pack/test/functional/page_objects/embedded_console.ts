/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrProviderContext } from '../ftr_provider_context';

export function EmbeddedConsoleProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');

  return {
    async expectEmbeddedConsoleControlBarExists() {
      await testSubjects.existOrFail('consoleEmbeddedSection');
    },
    async expectEmbeddedConsoleToBeOpen() {
      await testSubjects.existOrFail('consoleEmbeddedBody');
    },
    async expectEmbeddedConsoleToBeClosed() {
      await testSubjects.missingOrFail('consoleEmbeddedBody');
    },
    async clickEmbeddedConsoleControlBar() {
      await testSubjects.click('consoleEmbeddedControlBar');
    },
    async expectEmbeddedConsoleNotebooksButtonExists() {
      await testSubjects.existOrFail('consoleEmbeddedNotebooksButton');
    },
    async clickEmbeddedConsoleNotebooksButton() {
      await testSubjects.click('consoleEmbeddedNotebooksButton');
    },
    async expectEmbeddedConsoleNotebooksToBeOpen() {
      await testSubjects.existOrFail('consoleEmbeddedNotebooksContainer');
    },
    async expectEmbeddedConsoleNotebooksToBeClosed() {
      await testSubjects.missingOrFail('consoleEmbeddedNotebooksContainer');
    },
    async expectEmbeddedConsoleNotebookListItemToBeAvailable(id: string) {
      await testSubjects.existOrFail(`console-embedded-notebook-select-btn-${id}`);
    },
    async clickEmbeddedConsoleNotebook(id: string) {
      await testSubjects.click(`console-embedded-notebook-select-btn-${id}`);
    },
    async expectEmbeddedConsoleNotebookToBeAvailable(id: string) {
      await testSubjects.click(`console-embedded-notebook-select-btn-${id}`);
    },
  };
}
