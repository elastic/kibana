/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WebElementWrapper } from '@kbn/ftr-common-functional-ui-services';
import { FtrProviderContext } from '../../ftr_provider_context';
import { TabsParams } from '../../page_objects/infra_logs_page';

export function LogStreamPageProvider({ getPageObjects, getService }: FtrProviderContext) {
  const pageObjects = getPageObjects(['infraLogs']);
  const retry = getService('retry');
  const find = getService('find');
  const testSubjects = getService('testSubjects');

  return {
    async navigateTo(params?: TabsParams['stream']) {
      await pageObjects.infraLogs.navigateToTab('stream', params);
    },

    async getColumnHeaderLabels(): Promise<string[]> {
      const columnHeaderElements: WebElementWrapper[] = await testSubjects.findAll(
        '~logColumnHeader'
      );
      return await Promise.all(columnHeaderElements.map((element) => element.getVisibleText()));
    },

    async getStreamEntries(minimumItems = 1): Promise<WebElementWrapper[]> {
      await retry.try(async () => {
        const elements = await testSubjects.findAll('~streamEntry');
        if (!elements || elements.length < minimumItems) {
          throw new Error();
        }
      });

      return await testSubjects.findAll('~streamEntry');
    },

    async getLogColumnsOfStreamEntry(
      entryElement: WebElementWrapper
    ): Promise<WebElementWrapper[]> {
      return await testSubjects.findAllDescendant('~logColumn', entryElement);
    },

    async getLogEntryColumnValueByName(
      entryElement: WebElementWrapper,
      column: string
    ): Promise<string> {
      const columnElement = await testSubjects.findDescendant(`~${column}`, entryElement);

      const contentElement = await columnElement.findByCssSelector(
        `[data-test-subj='LogEntryColumnContent']`
      );

      return await contentElement.getVisibleText();
    },

    async openLogEntryDetailsFlyout(entryElement: WebElementWrapper) {
      await entryElement.click();

      const menuButton = await testSubjects.findDescendant(
        `~infraLogEntryContextMenuButton`,
        entryElement
      );
      await menuButton.click();

      await find.clickByButtonText('View details');
    },

    async getNoLogsIndicesPrompt() {
      return await testSubjects.find('noLogsIndicesPrompt');
    },

    async getNoDataPage() {
      return await testSubjects.find('noDataPage');
    },
  };
}
