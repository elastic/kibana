/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { WebElementWrapper } from 'test/functional/services/lib/web_element_wrapper';
import { FtrProviderContext } from '../ftr_provider_context';

export function EndpointPageProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  return {
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
        .map(th =>
          $(th)
            .text()
            .replace(/&nbsp;/g, '')
            .trim()
        );
    },

    async welcomeEndpointTitle() {
      return await testSubjects.getVisibleText('welcomeTitle');
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
        .map(row =>
          $(row)
            .find('.euiTableCellContent')
            .toArray()
            .map(cell =>
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
        if (tableData[1][0] === 'No items found') return false;
        return true;
      });
    },
  };
}
