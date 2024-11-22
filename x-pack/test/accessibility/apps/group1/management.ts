/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

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

    describe('index management', () => {
      describe('indices', () => {
        it('empty state', async () => {
          await PageObjects.settings.clickIndexManagement();
          await a11y.testAppSnapshot();
        });
        describe('indices with data', () => {
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

          describe('index details', () => {
            it('index details - overview', async () => {
              await PageObjects.settings.clickIndexManagement();
              await PageObjects.indexManagement.clickIndexAt(0);
              await a11y.testAppSnapshot();
            });

            it('index details - settings', async () => {
              await PageObjects.indexManagement.clickIndexDetailsTab('settings');
              await a11y.testAppSnapshot();
            });

            it('index details - edit settings', async () => {
              await PageObjects.indexManagement.clickIndexDetailsTab('settings');
              await PageObjects.indexManagement.clickIndexDetailsEditSettingsSwitch();
              await a11y.testAppSnapshot();
            });

            it('index details - mappings', async () => {
              await PageObjects.indexManagement.clickIndexDetailsTab('mappings');
              await a11y.testAppSnapshot();
            });

            it('index details - stats', async () => {
              await PageObjects.indexManagement.clickIndexDetailsTab('stats');
              await a11y.testAppSnapshot();
            });
          });
        });
      });
    });
  });
}
