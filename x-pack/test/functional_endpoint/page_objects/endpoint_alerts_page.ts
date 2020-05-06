/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../ftr_provider_context';
import { WebElementWrapper } from '../../../../test/functional/services/lib/web_element_wrapper';

export function EndpointAlertsPageProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  /**
   * @function parseStyles
   * Parses a string of inline styles into a javascript object with casing for react
   *
   * @param {string} styles
   * @returns {Object}
   */
  const parseStyle = (styles: any) =>
    styles
      .split(';')
      .filter((style: any) => style.split(':')[0] && style.split(':')[1])
      .map((style: any) => [
        style
          .split(':')[0]
          .trim()
          .replace(/-./g, (c: any) => c.substr(1).toUpperCase()),
        style
          .split(':')
          .slice(1)
          .join(':')
          .trim(),
      ])
      .reduce(
        (styleObj: any, style: any) => ({
          ...styleObj,
          [style[0]]: style[1],
        }),
        {}
      );

  return {
    async enterSearchBarQuery(query: string) {
      return await testSubjects.setValue('alertsSearchBar', query, { clearWithKeyboard: true });
    },
    async submitSearchBarFilter() {
      return testSubjects.click('querySubmitButton');
    },
    async setSearchBarDate(timestamp: string) {
      await testSubjects.click('superDatePickerShowDatesButton');
      await testSubjects.click('superDatePickerstartDatePopoverButton');
      await testSubjects.click('superDatePickerAbsoluteTab');
      await testSubjects.setValue('superDatePickerAbsoluteDateInput', timestamp);
      await this.submitSearchBarFilter();
    },
    /**
     * Finds a table and returns the data in a nested array with row 0 is the headers if they exist.
     * It uses euiTableCellContent to avoid poluting the array data with the euiTableRowCell__mobileHeader data.
     * @param dataTestSubj
     * @param element
     * @returns Promise<string[][]>
     */
    async getEndpointAlertResolverTableData(dataTestSubj: string, element: string) {
      await testSubjects.exists(dataTestSubj);
      const hostTable: WebElementWrapper = await testSubjects.find(dataTestSubj);
      const $ = await hostTable.parseDomContent();
      return $(element)
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
    /**
     * Finds a nodes and returns the data in a nested array of nodes.
     * @param dataTestSubj
     * @param element
     * @returns Promise<string[][]>
     */
    async getEndpointAlertResolverNodeData(dataTestSubj: string, element: string) {
      await testSubjects.exists(dataTestSubj);
      const Elements = await testSubjects.findAll(dataTestSubj);
      const $ = [];
      for (const value of Elements) {
        $.push(await value.getAttribute(element));
      }
      return $;
    },
    /**
     * Gets a array of not parsed styles and returns the Array of parsed styles.
     * @returns Promise<string[][]>
     * @param dataTestSubj
     * @param element
     */
    async parseStyles(dataTestSubj: string, element: string) {
      const tableData = await this.getEndpointAlertResolverNodeData(dataTestSubj, element);
      const $ = [];
      for (let i = 1; i < tableData.length; i++) {
        const eachStyle = parseStyle(tableData[i]);
        $.push(eachStyle);
      }
      return $;
    },

    async waitForTableToHaveData(dataTestSubj: string) {
      await retry.waitForWithTimeout('table to have data', 2000, async () => {
        const tableData = await this.getEndpointAlertResolverTableData(dataTestSubj, 'tr');
        if (tableData[1][0] === 'No items found') {
          return false;
        }
        return true;
      });
    },
  };
}
