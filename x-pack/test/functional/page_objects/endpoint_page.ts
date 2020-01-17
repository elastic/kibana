/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function EndpointPageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const { header } = getPageObjects(['header']);

  return {
    async welcomeEndpointMessage() {
      return await testSubjects.getVisibleText('welcomeEndpointMessage');
    },
    async endpointsSearchBar() {
      return await testSubjects.find('endpointsSearchBar');
    },
    async navToEndpointList() {
      const sideNav = await testSubjects.find('menuEndpoint');
      const navItems = await sideNav.findAllByCssSelector('button');
      const endpointButton = navItems[3];
      await endpointButton.click();
    },
    async changeRowView() {
      const paginationRowPopover = await testSubjects.find('tablePaginationPopoverButton');
      await paginationRowPopover.click();
    },
    async selectFiveRows() {
      const menuPanel = await find.byCssSelector('div.euiContextMenuPanel');
      const menuItems = await menuPanel.findAllByCssSelector('button.euiContextMenuItem');
      await menuItems[0].click();
    },
    async getEndpointListRowsCount() {
      const endpointListRows = await find.allByCssSelector('.euiTableRow');
      // eslint-disable-next-line no-console
      return endpointListRows.length;
    },
    async getAllEndpointListRowsCount() {
      let morePages = true;
      let totalCount = 0;
      while (morePages) {
        totalCount += await this.getEndpointListRowsCount();
        morePages = !(
          (await testSubjects.getAttribute('pagination-button-next', 'disabled')) === 'true'
        );
        if (morePages) {
          await testSubjects.click('pagination-button-next');
          await header.waitUntilLoadingHasFinished();
        }
      }
      return totalCount;
    },
    async checkFirstPageIsActive() {
      const pageOneElement = await testSubjects.getAttributeAll('pagination-button-0', 'class');
      if (pageOneElement[0].indexOf('euiPaginationButton-isActive')) {
        return true;
      }
    },
    async getPagination() {
      const paginationBlock = await find.byCssSelector('.euiPagination');
      const $ = await paginationBlock.parseDomContent();
      const paginationButtons = $('button')
        .toArray()
        // eslint-disable-next-line no-shadow
        .map(button => $(button).attr('aria-label'));
      // eslint-disable-next-line no-console
      return paginationButtons;
    },
  };
}
