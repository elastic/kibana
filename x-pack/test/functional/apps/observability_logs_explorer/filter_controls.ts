/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrProviderContext } from './config';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['observabilityLogsExplorer']);
  const testSubjects = getService('testSubjects');

  describe('Filter controls customization', () => {
    before('initialize tests', async () => {
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
    });

    after('clean up archives', async () => {
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
    });

    it('renders a filter controls section as part of the unified search bar', async () => {
      await PageObjects.observabilityLogsExplorer.navigateTo();
      await testSubjects.existOrFail('dataSourceFiltersCustomization', { allowHidden: true });
    });
  });
}
