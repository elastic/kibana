/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TODO: Changed from PluginFunctionalProviderContext to FtrProviderContext in Serverless
import type { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getService, getPageObjects, loadTestFile }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const browser = getService('browser');
  const es = getService('es');
  const PageObjects = getPageObjects(['common', 'header', 'settings', 'svlCommonNavigation']);
  const testSubjects = getService('testSubjects');

  describe('data view field editor example', function () {
    before(async () => {
      // TODO: This fails in Serverless with
      // "index_not_found_exception: no such index [.kibana_ingest]",
      // but the tests still run
      try {
        await esArchiver.emptyKibanaIndex();
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
      }
      await browser.setWindowSize(1300, 900);
      await es.transport.request({
        path: '/blogs/_doc',
        method: 'POST',
        body: { user: 'matt', message: 20 },
      });

      // TODO: Navigation to Data View Management is different in Serverless
      await PageObjects.common.navigateToApp('management');
      await testSubjects.click('app-card-dataViews');
      await PageObjects.settings.createIndexPattern('blogs', null);
      await PageObjects.common.navigateToApp('dataViewFieldEditorExample');
    });

    loadTestFile(require.resolve('./data_view_field_editor_example'));
  });
}
