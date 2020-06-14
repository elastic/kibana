/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function IngestManagerCreateDatasource({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const find = getService('find');

  return {
    /**
     * Validates that the page shown is the Datasource Craete Page
     */
    async ensureOnCreatePageOrFail() {
      await testSubjects.existOrFail('createDataSource_header');
    },

    /**
     * Finds and returns the Cancel button on the sticky bottom bar
     */
    async findCancelButton() {
      return await testSubjects.find('createDatasourceCancelButton');
    },

    /**
     * Finds and returns the Cancel back link at the top of the create page
     */
    async findBackLink() {
      return await testSubjects.find('createDataSource_cancelBackLink');
    },

    /**
     * Finds and returns the save button on the sticky bottom bar
     */
    async findDSaveButton() {
      return await testSubjects.find('createDatasourceSaveButton');
    },

    /**
     * Selects an agent configuration on the form
     * @param name
     * Visual name of the configuration. if one is not provided, the first agent
     * configuration on the list will be chosen
     */
    async selectAgentConfig(name?: string) {
      // if we have a name, then find the button with that `title` set.
      if (name) {
        // FIXME implement
      }
      // Else, just select the first agent configuration that is present
      else {
        await (await find.byCssSelector('button[]')).click();
      }
    },

    /**
     * Set the name of the datasource on the input field
     * @param name
     */
    async setDatasourceName(name: string) {},
  };
}
