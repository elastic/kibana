/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const dataViews = getService('dataViews');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common', 'lens', 'header', 'timePicker']);

  describe('lens no data', () => {
    before(async function () {
      // delete all non-hidden indices to make it really "no data"
      const indices = Object.keys(await es.indices.get({ index: '*' }));
      await Promise.all(indices.map(async (index) => await es.indices.delete({ index })));
      await kibanaServer.savedObjects.clean({ types: ['index-pattern'] });
      await PageObjects.common.navigateToApp('lens');
    });

    after(async () => {
      await kibanaServer.savedObjects.clean({ types: ['index-pattern'] });
      await esArchiver.unload('x-pack/test/functional/es_archives/logstash_functional');
    });

    it('when no data opens integrations', async () => {
      await PageObjects.header.waitUntilLoadingHasFinished();

      const addIntegrations = await testSubjects.find('kbnOverviewAddIntegrations');
      await addIntegrations.click();
      await PageObjects.common.waitUntilUrlIncludes('integrations/browse');
    });

    it('adds a new data view when no data views', async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');
      await kibanaServer.savedObjects.clean({ types: ['index-pattern'] });
      await PageObjects.common.navigateToApp('lens');

      const dataViewToCreate = 'logstash';
      await dataViews.createFromPrompt({ name: dataViewToCreate });
      await dataViews.waitForSwitcherToBe(`${dataViewToCreate}*`);
    });
  });
}
