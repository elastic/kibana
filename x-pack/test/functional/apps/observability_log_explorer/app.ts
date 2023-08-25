/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['common', 'navigationalSearch', 'observabilityLogExplorer']);
  const testSubjects = getService('testSubjects');

  describe('Application', () => {
    before('initialize tests', async () => {
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
    });

    after('clean up archives', async () => {
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
    });

    it('is shown in the global search', async () => {
      await PageObjects.common.navigateToApp('home');
      await PageObjects.navigationalSearch.searchFor('log explorer');

      const results = await PageObjects.navigationalSearch.getDisplayedResults();
      expect(results[0].label).to.eql('Log Explorer');
    });

    it('is shown in the observability side navigation', async () => {
      await PageObjects.observabilityLogExplorer.navigateTo();
      await testSubjects.existOrFail('observability-nav-observability-log-explorer-explorer');
    });
  });
}
