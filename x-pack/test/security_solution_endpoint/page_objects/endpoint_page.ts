/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WebElementWrapper } from '@kbn/ftr-common-functional-ui-services';
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

    async ensureIsOnEndpointListPage() {
      await testSubjects.existOrFail('endpointPage');
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

    async waitForTableToNotHaveData(dataTestSubj: string, timeout = 2000) {
      await retry.waitForWithTimeout('table to not have data', timeout, async () => {
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

    /**
     * Returns an Endpoint table row (`<tr>`)
     *
     * @param [endpointAgentId] if defined, then it will look for the row matching this endpoint id
     */
    async getEndpointTableRow(endpointAgentId?: string) {
      await this.ensureIsOnEndpointListPage();
      const table = await testSubjects.find('endpointListTable');

      let endpointRow: WebElementWrapper;

      if (endpointAgentId) {
        endpointRow = await testSubjects.findService.descendantDisplayedByCssSelector(
          `[data-endpoint-id="${endpointAgentId}"]`,
          table
        );
      } else {
        endpointRow = (
          await testSubjects.findService.allDescendantDisplayedByTagName('tr', table)
        )[0];
      }

      return endpointRow;
    },

    /**
     * Displays the Endpoint details for an endpoint
     * @param [endpointAgentId] if defined, then the details for this specific endpoint will be opened.
     */
    async showEndpointDetails(endpointAgentId?: string) {
      const endpointRow = await this.getEndpointTableRow(endpointAgentId);

      await (await testSubjects.findDescendant('hostnameCellLink', endpointRow)).click();
      await testSubjects.existOrFail('endpointDetailsFlyout');
    },

    /**
     * Display the Responder page overlay for one of the Endpoints on the Endpoint list.
     *
     * @param [endpointAgentId] If defined, will be used as the endpoint for which Responder
     * will be opened. If not, then the first endpoint on the list will be used.
     */
    async showResponderFromEndpointList(endpointAgentId?: string) {
      testSubjects.retry.waitFor(
        `opening table row action menu ${
          endpointAgentId ? `for endpoint id: ${endpointAgentId}` : 'for first row in the table'
        }`,
        async () => {
          const endpointRow = await this.getEndpointTableRow(endpointAgentId);

          // Click the row menu
          await (await testSubjects.findDescendant('endpointTableRowActions', endpointRow)).click();
          await testSubjects.existOrFail('tableRowActionsMenuPanel');

          return true;
        }
      );

      const rowMenuPanel = await testSubjects.findDescendant(
        'console',
        await testSubjects.find('tableRowActionsMenuPanel')
      );

      await rowMenuPanel.click();
      await testSubjects.existOrFail('consolePageOverlay');
    },

    /**
     * Shows the details panel for the given a given endpoint and displays Responder
     * from the details action menu
     *
     * @param [endpointAgentId]
     */
    async showResponderFromEndpointDetails(endpointAgentId?: string) {
      await this.showEndpointDetails(endpointAgentId);

      await testSubjects.click('endpointDetailsActionsButton');
      await testSubjects.existOrFail('endpointDetailsActionsPopover');

      await testSubjects.click('console');
      await testSubjects.existOrFail('consolePageOverlay');
    },
  };
}
