/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function IngestManager({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');

  return {
    /**
     * Validates that the page shown is the Datasource Craete Page
     */
    async ensureDatasourceCratePageOrFail() {
      await testSubjects.existOrFail('createDataSource_header');
    },

    async findDatasourceCreateCancelButton() {},

    async findDatasourceCreateBackLink() {},

    async findDatasourceCreateSaveButton() {},
  };
}
