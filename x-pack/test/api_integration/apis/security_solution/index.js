/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export default function ({ loadTestFile }) {
  describe('SecuritySolution Endpoints', () => {
    loadTestFile(require.resolve('./authentications'));
    loadTestFile(require.resolve('./events'));
    loadTestFile(require.resolve('./hosts'));
    loadTestFile(require.resolve('./host_details'));
    loadTestFile(require.resolve('./kpi_network'));
    loadTestFile(require.resolve('./kpi_hosts'));
    loadTestFile(require.resolve('./matrix_dns_histogram'));
    loadTestFile(require.resolve('./network_details'));
    loadTestFile(require.resolve('./network_dns'));
    loadTestFile(require.resolve('./network_top_n_flow'));
    loadTestFile(require.resolve('./overview_host'));
    loadTestFile(require.resolve('./overview_network'));
    loadTestFile(require.resolve('./saved_objects/notes'));
    loadTestFile(require.resolve('./saved_objects/pinned_events'));
    loadTestFile(require.resolve('./saved_objects/timeline'));
    loadTestFile(require.resolve('./sources'));
    loadTestFile(require.resolve('./timeline'));
    loadTestFile(require.resolve('./timeline_migrations'));
    loadTestFile(require.resolve('./timeline_details'));
    loadTestFile(require.resolve('./uncommon_processes'));
    loadTestFile(require.resolve('./users'));
    loadTestFile(require.resolve('./tls'));
    loadTestFile(require.resolve('./risk_score/indices'));
    loadTestFile(require.resolve('./risk_score/prebuilt_devtools_content'));
    loadTestFile(require.resolve('./risk_score/prebuilt_saved_objects'));
    loadTestFile(require.resolve('./risk_score/stored_scripts'));
    loadTestFile(require.resolve('./risk_score/index_status'));
  });
}
