/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function EndpointPageProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const table = getService('table');

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

    async getManagementTableData() {
      return await table.getDataFromTestSubj('managementListTable');
    },
  };
}
