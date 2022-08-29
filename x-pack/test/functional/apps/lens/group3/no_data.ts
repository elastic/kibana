/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const retry = getService('retry');
  const find = getService('find');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common', 'lens', 'header', 'timePicker']);

  const createDataView = async (dataViewName: string) => {
    await testSubjects.setValue('createIndexPatternTitleInput', dataViewName, {
      clearWithKeyboard: true,
      typeCharByChar: true,
    });
    await testSubjects.click('saveIndexPatternButton');
  };

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

      const button = await testSubjects.find('createDataViewButton');
      button.click();
      await retry.waitForWithTimeout('index pattern editor form to be visible', 15000, async () => {
        return await (await find.byClassName('indexPatternEditor__form')).isDisplayed();
      });

      const dataViewToCreate = 'logstash';
      await createDataView(dataViewToCreate);
      await PageObjects.header.waitUntilLoadingHasFinished();
      await retry.waitForWithTimeout(
        'data view selector to include a newly created dataview',
        5000,
        async () => {
          const dataViewTitle = await PageObjects.lens.getDataPanelIndexPattern();
          // data view editor will add wildcard symbol by default
          // so we need to include it in our original title when comparing
          return dataViewTitle === `${dataViewToCreate}*`;
        }
      );
    });
  });
}
