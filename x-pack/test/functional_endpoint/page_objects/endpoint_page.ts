/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { WebElementWrapper } from 'test/functional/services/lib/web_element_wrapper';
import { FtrProviderContext } from '../ftr_provider_context';

export function EndpointPageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const log = getService('log');
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
        .map(key =>
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

    async clickOnEuiCheckbox(euiCheckBoxTestId: string) {
      const checkboxes = await find.allByCssSelector('.euiCheckbox');
      const silentCatch = () => {};

      log.debug(`Found ${checkboxes.length} EuiCheckbox's`);

      for (const checkbox of checkboxes) {
        log.debug('Checking EuiCheckBox');
        const checkBoxInput: WebElementWrapper | void = await checkbox
          .findByTestSubject(euiCheckBoxTestId)
          .catch(silentCatch);
        if (checkBoxInput !== undefined) {
          log.debug(`Found EuiCheckBox with data-test-subj=${euiCheckBoxTestId}`);

          const labelElement = await checkbox.findByCssSelector('.euiCheckbox__label');

          // Want to ensure that the Click actually did an update - case the internals of
          // EuiCheckbox change in the future
          const beforeClickIsChecked = await checkBoxInput.isSelected();
          await labelElement.click();
          const afterClickIsChecked = await checkBoxInput.isSelected();
          if (beforeClickIsChecked === afterClickIsChecked) {
            throw new Error('click did not update checkbox!');
          }
          return checkbox;
        }
      }
      throw new Error(`EuiCheckbox with data-test-subj of [${euiCheckBoxTestId}] not found!`);
    },
  };
}
