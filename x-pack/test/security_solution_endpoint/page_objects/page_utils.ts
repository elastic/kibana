/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../ftr_provider_context';
import { WebElementWrapper } from '../../../../test/functional/services/lib/web_element_wrapper';

export function EndpointPageUtils({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const find = getService('find');

  return {
    /**
     * Finds a given EuiCheckbox by test subject and clicks on it
     *
     * @param euiCheckBoxTestId
     */
    async clickOnEuiCheckbox(euiCheckBoxTestId: string) {
      // This utility is needed because EuiCheckbox forwards the test subject on to
      // the actual `<input>` which is not actually visible/accessible on the page.
      // In order to actually cause the state of the checkbox to change, the `<label>`
      // must be clicked.
      const euiCheckboxLabelElement = await find.byXPath(
        `//input[@data-test-subj='${euiCheckBoxTestId}']/../label`
      );

      await euiCheckboxLabelElement.click();
    },

    /**
     * Finds the Table with the given `selector` (test subject) and returns
     * back an array containing the table's header column text
     *
     * @param selector
     * @returns Promise<string[]>
     */
    async tableHeaderVisibleText(selector: string) {
      const $ = await (await testSubjects.find(selector)).parseDomContent();
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
    async tableData(dataTestSubj: string) {
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
  };
}
