/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WebElementWrapper } from '../../../../test/functional/services/lib/web_element_wrapper';
import { FtrProviderContext } from '../ftr_provider_context';

export function EndpointPageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects(['common', 'header', 'endpointPageUtils']);
  const retry = getService('retry');

  return {
    /**
     * Navigate to the Endpoints list page
     */
    async navigateToEndpointList(searchParams?: string) {
      await pageObjects.common.navigateToUrlWithBrowserHistory(
        'securitySolutionManagement',
        `/endpoints${searchParams ? `?${searchParams}` : ''}`
      );
      await pageObjects.header.waitUntilLoadingHasFinished();
    },

    async waitForTableToHaveData(dataTestSubj: string, timeout = 2000) {
      await retry.waitForWithTimeout('table to have data', timeout, async () => {
        const tableData = await pageObjects.endpointPageUtils.tableData(dataTestSubj);
        if (tableData[1][0] === 'No items found') {
          return false;
        }
        return true;
      });
    },

    async waitForTableToHaveNumberOfEntries(
      dataTestSubj: string,
      numberOfEntries = 1,
      timeout = 2000
    ) {
      await retry.waitForWithTimeout('table to have data', timeout, async () => {
        const tableData = await pageObjects.endpointPageUtils.tableData(dataTestSubj);
        if (tableData[1][0] === 'No items found' || tableData.length < numberOfEntries + 1) {
          return false;
        }
        return true;
      });
    },

    async waitForTableToNotHaveData(dataTestSubj: string) {
      await retry.waitForWithTimeout('table to not have data', 2000, async () => {
        const tableData = await pageObjects.endpointPageUtils.tableData(dataTestSubj);
        if (tableData[1][0] === 'No items found') {
          return true;
        }
        return false;
      });
    },

    async waitForVisibleTextToChange(dataTestSubj: string, currentText: string) {
      await retry.waitForWithTimeout('visible text to change', 2000, async () => {
        const detailFlyoutTitle = await testSubjects.getVisibleText(dataTestSubj);
        return detailFlyoutTitle !== currentText;
      });
    },

    async endpointFlyoutDescriptionKeys(dataTestSubj: string) {
      await testSubjects.exists(dataTestSubj);
      const detailsData: WebElementWrapper = await testSubjects.find(dataTestSubj);
      const $ = await detailsData.parseDomContent();
      return $('dt')
        .toArray()
        .map((key) =>
          $(key)
            .text()
            .replace(/&nbsp;/g, '')
            .trim()
        );
    },

    async endpointFlyoutDescriptionValues(dataTestSubj: string) {
      await testSubjects.exists(dataTestSubj);
      const detailsData: WebElementWrapper = await testSubjects.find(dataTestSubj);
      const $ = await detailsData.parseDomContent();
      return $('dd')
        .toArray()
        .map((value, index) => {
          if (index === 1) {
            return '';
          }
          return $(value)
            .text()
            .replace(/&nbsp;/g, '')
            .trim();
        });
    },
  };
}
