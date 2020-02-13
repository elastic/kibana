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
<<<<<<< HEAD
    /**
<<<<<<< HEAD
     * Finds the Table with the given `selector` (test subject) and returns
     * back an array containing the table's header column text
=======
     * Finds the Data Grid with the given `selector` (test subject) and returns
     * back an array containing the grid's header column text
>>>>>>> adds functional tests
     *
     * @param selector
     * @returns Promise<string[]>
     */
<<<<<<< HEAD
    async tableHeaderVisibleText(selector: string) {
      const $ = await (await testSubjects.find('policyTable')).parseDomContent();
      return $('thead tr th')
        .toArray()
        .map(th =>
          $(th)
=======
    async dataGridHeaderVisibleText(selector: string) {
      const $ = await (await testSubjects.find(selector)).parseDomContent();
      return $('.euiDataGridHeaderCell__content')
        .toArray()
        .map(content =>
          $(content)
>>>>>>> adds functional tests
            .text()
            .replace(/&nbsp;/g, '')
            .trim()
        );
    },
<<<<<<< HEAD

=======
>>>>>>> adds functional tests
=======
>>>>>>> switches router/url logic
    async welcomeEndpointTitle() {
      return await testSubjects.getVisibleText('welcomeTitle');
    },

    async getManagementTableData() {
      return await table.getDataFromTestSubj('managementListTable');
    },
  };
}
