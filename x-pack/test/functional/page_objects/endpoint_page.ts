/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function EndpointPageProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');

  return {
    async welcomeEndpointMessage() {
      return await testSubjects.getVisibleText('welcomeEndpointMessage');
    },
    async navToEndpointList() {
      const sideNav = await testSubjects.find('endpointSideNav');
      const navItems = await sideNav.findAllByCssSelector('button');
      const endpointButton = navItems[3];
      await endpointButton.click();
    },
    async searchForObject(objectName: string) {
      const searchBox = await testSubjects.find('endpointsSearchBar');
      await searchBox.clearValue();
      await searchBox.type(objectName);
      await searchBox.pressKeys(browser.keys.ENTER);
    },
    async getSavedObjectsInTable() {
      const table = await testSubjects.find('endpointsListTable');
      const cells = await table.findAllByCssSelector('td:nth-child(3)');

      const objects = [];
      for (const cell of cells) {
        objects.push(await cell.getVisibleText());
      }

      return objects;
    },
  };
}
