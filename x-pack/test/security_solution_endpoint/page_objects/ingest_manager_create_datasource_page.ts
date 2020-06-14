/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function IngestManagerCreateDatasource({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');

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

    async selectAgentConfig(name?: string) {},

    /**
     * Finds and returns the save button on the sticky bottom bar
     */
    async findDSaveButton() {
      return await testSubjects.find('createDatasourceSaveButton');
    },
  };
}
