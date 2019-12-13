/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default function({ loadTestFile }) {
  describe('graphql', () => {
    // each of these test files imports a GQL query from
    // the uptime app and runs it against the live HTTP server,
    // verifying the pre-loaded documents are returned in a way that
    // matches the snapshots contained in './fixtures'
    loadTestFile(require.resolve('./doc_count'));
    loadTestFile(require.resolve('./filter_bar'));
    loadTestFile(require.resolve('./monitor_charts'));
    loadTestFile(require.resolve('./monitor_page_title'));
    loadTestFile(require.resolve('./monitor_states'));
    loadTestFile(require.resolve('./monitor_status_bar'));
    loadTestFile(require.resolve('./ping_list'));
    loadTestFile(require.resolve('./snapshot_histogram'));
  });
}
