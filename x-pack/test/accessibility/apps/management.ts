/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects([
    'common',
    'settings',
    'header',
    'indexPatternFieldEditorObjects',
    'indexManagement',
  ]);
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const a11y = getService('a11y');

  describe('Management', () => {
    it('main view', async () => {
      await PageObjects.settings.navigateTo();
      await a11y.testAppSnapshot();
    });

    describe('index management', async () => {
      describe('indices', async () => {
        it('empty state', async () => {
          await PageObjects.settings.clickIndexManagement();
          await a11y.testAppSnapshot();
        });
        describe('indices with data', async () => {
          before(async () => {
            await esArchiver.loadIfNeeded(
              'test/functional/fixtures/es_archiver/logstash_functional'
            );
            await kibanaServer.uiSettings.update({
              defaultIndex: 'logstash-*',
            });
            await PageObjects.settings.navigateTo();
          });
          after(async () => {
            await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
          });
          it('index list', async () => {
            await a11y.testAppSnapshot();
          });

          describe('index panel', async () => {
            it('index panel - summary', async () => {
              await PageObjects.settings.clickIndexManagement();
              await PageObjects.indexManagement.clickIndiceAt(0);
              await a11y.testAppSnapshot();
            });

            it('index panel - settings', async () => {
              await PageObjects.indexManagement.clickDetailPanelTabAt(0);
              await a11y.testAppSnapshot();
            });

            it('index panel - mappings', async () => {
              await PageObjects.indexManagement.clickDetailPanelTabAt(1);
              await a11y.testAppSnapshot();
            });

            it('index panel - stats', async () => {
              await PageObjects.indexManagement.clickDetailPanelTabAt(2);
              await a11y.testAppSnapshot();
            });

            it('index panel - edit settings', async () => {
              await PageObjects.indexManagement.clickDetailPanelTabAt(3);
              await a11y.testAppSnapshot();
            });
          });
        });
      });
    });
  });
}
