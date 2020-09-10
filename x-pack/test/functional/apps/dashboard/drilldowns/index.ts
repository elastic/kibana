/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ loadTestFile, getService }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');

  describe('drilldowns', function () {
    this.tags(['skipFirefox']);

    before(async () => {
      await esArchiver.loadIfNeeded('logstash_functional');
      await esArchiver.load('dashboard/drilldowns');
      await kibanaServer.uiSettings.replace({ defaultIndex: 'logstash-*' });
    });

    after(async () => {
      await esArchiver.unload('dashboard/drilldowns');
    });

    loadTestFile(require.resolve('./dashboard_to_dashboard_drilldown'));
    loadTestFile(require.resolve('./dashboard_to_url_drilldown'));
    loadTestFile(require.resolve('./explore_data_panel_action'));

    // Disabled for now as it requires xpack.discoverEnhanced.actions.exploreDataInChart.enabled
    // setting set in kibana.yml to work. Once that is enabled by default, we can re-enable this test suite.
    // loadTestFile(require.resolve('./explore_data_chart_action'));
  });
}
