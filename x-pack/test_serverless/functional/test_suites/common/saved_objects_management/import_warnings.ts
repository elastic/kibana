/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'svlCommonPage', 'savedObjects']);

  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');

  describe('import warnings', () => {
    before(async () => {
      // emptyKibanaIndex fails in Serverless with
      // "index_not_found_exception: no such index [.kibana_ingest]",
      // so it was switched to `savedObjects.cleanStandardList()
      await kibanaServer.savedObjects.cleanStandardList();
      await PageObjects.svlCommonPage.loginAsAdmin();
    });

    beforeEach(async () => {
      await PageObjects.common.navigateToApp('management');
      await testSubjects.click('app-card-objects');
      await PageObjects.savedObjects.waitTableIsLoaded();
    });

    it('should display simple warnings', async () => {
      await PageObjects.savedObjects.importFile(
        path.join(__dirname, 'exports', '_import_type_1.ndjson')
      );

      await PageObjects.savedObjects.checkImportSucceeded();
      const warnings = await PageObjects.savedObjects.getImportWarnings();

      expect(warnings).to.eql([
        {
          message: 'warning for test_import_warning_1',
          type: 'simple',
        },
      ]);
    });

    it('should display action warnings', async () => {
      await PageObjects.savedObjects.importFile(
        path.join(__dirname, 'exports', '_import_type_2.ndjson')
      );

      await PageObjects.savedObjects.checkImportSucceeded();
      const warnings = await PageObjects.savedObjects.getImportWarnings();

      expect(warnings).to.eql([
        {
          type: 'action_required',
          message: 'warning for test_import_warning_2',
        },
      ]);
    });

    it('should display warnings coming from multiple types', async () => {
      await PageObjects.savedObjects.importFile(
        path.join(__dirname, 'exports', '_import_both_types.ndjson')
      );

      await PageObjects.savedObjects.checkImportSucceeded();
      const warnings = await PageObjects.savedObjects.getImportWarnings();

      expect(warnings).to.eql([
        {
          message: 'warning for test_import_warning_1',
          type: 'simple',
        },
        {
          type: 'action_required',
          message: 'warning for test_import_warning_2',
        },
      ]);
    });
  });
}
