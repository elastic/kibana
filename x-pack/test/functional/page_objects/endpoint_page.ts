/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function EndpointPageProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const table = getService('table');

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
    async getEndpointListContent() {
      const endpointTable = await table.getDataFromTestSubj('endpointListTable');
      // eslint-disable-next-line no-console
      console.log(endpointTable);
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
