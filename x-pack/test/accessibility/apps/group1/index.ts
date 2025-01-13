/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../common/ftr_provider_context';

export default ({ loadTestFile }: FtrProviderContext): void => {
  describe('X-Pack Accessibility Tests - Group 1', function () {
    loadTestFile(require.resolve('./login_page'));
    loadTestFile(require.resolve('./kibana_overview'));
    loadTestFile(require.resolve('./home'));
    loadTestFile(require.resolve('./management'));
    loadTestFile(require.resolve('./grok_debugger'));
    loadTestFile(require.resolve('./search_profiler'));
    loadTestFile(require.resolve('./painless_lab'));
    loadTestFile(require.resolve('./uptime'));
    loadTestFile(require.resolve('./spaces'));
    loadTestFile(require.resolve('./advanced_settings'));
    loadTestFile(require.resolve('./dashboard_controls'));
    loadTestFile(require.resolve('./dashboard_links'));
    loadTestFile(require.resolve('./dashboard_panel_options'));
    loadTestFile(require.resolve('./users'));
    loadTestFile(require.resolve('./roles'));
    loadTestFile(require.resolve('./ingest_node_pipelines'));
    loadTestFile(require.resolve('./index_lifecycle_management'));
  });
};
