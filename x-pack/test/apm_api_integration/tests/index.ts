/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../common/ftr_provider_context';

export default function apmApiIntegrationTests(providerContext: FtrProviderContext) {
  const { loadTestFile, getService } = providerContext;

  loadTestFile(require.resolve('./correlations/slow_transactions'));

  loadTestFile(require.resolve('./csm/csm_services'));
  loadTestFile(require.resolve('./csm/has_rum_data'));
  loadTestFile(require.resolve('./csm/js_errors'));
  loadTestFile(require.resolve('./csm/long_task_metrics'));
  loadTestFile(require.resolve('./csm/page_load_dist'));
  loadTestFile(require.resolve('./csm/page_views'));
  loadTestFile(require.resolve('./csm/url_search'));
  loadTestFile(require.resolve('./csm/web_core_vitals'));

  loadTestFile(require.resolve('./service_maps/service_maps'));

  loadTestFile(require.resolve('./services/annotations'));
  loadTestFile(require.resolve('./services/top_services'));

  loadTestFile(require.resolve('./settings/anomaly_detection/no_access_user'));
  loadTestFile(require.resolve('./settings/anomaly_detection/read_user'));
  loadTestFile(require.resolve('./settings/anomaly_detection/write_user'));

  loadTestFile(require.resolve('./settings/custom_link'));

  loadTestFile(require.resolve('./transactions/latency'));

  getService('runner').run();
}
