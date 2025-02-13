/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getService, getPageObjects, loadTestFile }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['timePicker', 'svlCommonPage']);
  const from = '2024-06-10T14:00:00.000Z';
  const to = '2024-06-10T16:30:00.000Z';

  describe('discover/context_awareness', function () {
    this.tags(['esGate']);

    before(async () => {
      await esArchiver.load('test/functional/fixtures/es_archiver/discover/context_awareness');
      await kibanaServer.importExport.load(
        'test/functional/fixtures/kbn_archiver/discover/context_awareness'
      );
      await kibanaServer.uiSettings.update({
        'timepicker:timeDefaults': `{ "from": "${from}", "to": "${to}"}`,
      });
    });

    after(async () => {
      await esArchiver.unload('test/functional/fixtures/es_archiver/discover/context_awareness');
      await kibanaServer.importExport.unload(
        'test/functional/fixtures/kbn_archiver/discover/context_awareness'
      );
      await PageObjects.timePicker.resetDefaultAbsoluteRangeViaUiSettings();
    });

    loadTestFile(require.resolve('./_framework'));
    loadTestFile(require.resolve('./extensions/_get_row_indicator_provider'));
    loadTestFile(require.resolve('./extensions/_get_row_additional_leading_controls'));
    loadTestFile(require.resolve('./extensions/_get_doc_viewer'));
    loadTestFile(require.resolve('./extensions/_get_cell_renderers'));
    loadTestFile(require.resolve('./extensions/_get_default_app_state'));
    loadTestFile(require.resolve('./extensions/_get_additional_cell_actions'));
    loadTestFile(require.resolve('./extensions/_get_app_menu'));
    loadTestFile(require.resolve('./extensions/_get_render_app_wrapper'));
    loadTestFile(require.resolve('./extensions/_get_default_ad_hoc_data_views'));
  });
}
