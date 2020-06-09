/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { WebElementWrapper } from 'test/functional/services/lib/web_element_wrapper';
import { FtrProviderContext } from '../ftr_provider_context';

export function EndpointPageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects(['common', 'header']);
  const retry = getService('retry');

  return {
    /**
     * Navigate to the Endpoints list page
     */
    async navigateToEndpointList(searchParams?: string) {
      await pageObjects.common.navigateToApp('securitySolution', {
        hash: `/management/endpoints${searchParams ? `?${searchParams}` : ''}`,
      });
      await pageObjects.header.waitUntilLoadingHasFinished();
    },

    /**
     * Finds the Table with the given `selector` (test subject) and returns
     * back an array containing the table's header column text
     *
     * @param selector
     * @returns Promise<string[]>
     */
    async tableHeaderVisibleText(selector: string) {
      const $ = await (await testSubjects.find('policyTable')).parseDomContent();
      return $('thead tr th')
        .toArray()
        .map((th) =>
          $(th)
            .text()
            .replace(/&nbsp;/g, '')
            .trim()
        );
    },

    /**
     * Finds a table and returns the data in a nested array with row 0 is the headers if they exist.
     * It uses euiTableCellContent to avoid poluting the array data with the euiTableRowCell__mobileHeader data.
     * @param dataTestSubj
     * @returns Promise<string[][]>
     */
    async getEndpointAppTableData(dataTestSubj: string) {
      await testSubjects.exists(dataTestSubj);
      const hostTable: WebElementWrapper = await testSubjects.find(dataTestSubj);
      const $ = await hostTable.parseDomContent();
      return $('tr')
        .toArray()
        .map((row) =>
          $(row)
            .find('.euiTableCellContent')
            .toArray()
            .map((cell) =>
              $(cell)
                .text()
                .replace(/&nbsp;/g, '')
                .trim()
            )
        );
    },

    async waitForTableToHaveData(dataTestSubj: string) {
      await retry.waitForWithTimeout('table to have data', 2000, async () => {
        const tableData = await this.getEndpointAppTableData(dataTestSubj);
        if (tableData[1][0] === 'No items found') {
          return false;
        }
        return true;
      });
    },

    async waitForVisibleTextToChange(dataTestSubj: string, currentText: string) {
      await retry.waitForWithTimeout('visible text to change', 2000, async () => {
        const detailFlyoutTitle = await testSubjects.getVisibleText(dataTestSubj);
        return detailFlyoutTitle !== currentText;
      });
    },

    async hostFlyoutDescriptionKeys(dataTestSubj: string) {
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

    async hostFlyoutDescriptionValues(dataTestSubj: string) {
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
