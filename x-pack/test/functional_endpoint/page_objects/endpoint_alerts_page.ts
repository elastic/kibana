/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../ftr_provider_context';
import { WebElementWrapper } from '../../../../test/functional/services/lib/web_element_wrapper';
// import { contains } from 'vega-lite/build/src/util';

export function EndpointAlertsPageProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');

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
     * Finds a table and returns the data in a nested array with row 0 is the headers if they exist.
     * It uses euiTableCellContent to avoid poluting the array data with the euiTableRowCell__mobileHeader data.
     * @param dataTestSubj
     * @param element
     * @returns Promise<string[][]>
     */
    async getEndpointAlertResolverNodeData(dataTestSubj: string, element: string) {
      await testSubjects.exists(dataTestSubj);
      const Elements = await testSubjects.findAll(dataTestSubj);
      const $ = [];
      // console.log(Elements.length);
      for (const value of Elements) {
        $.push(await value.getAttribute(element));
      }
      return $;
    },
  };
}
