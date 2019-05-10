/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default function ({ loadTestFile }) {
  describe('management', () => {
    loadTestFile(require.resolve('./advanced_settings'));
    loadTestFile(require.resolve('./cross_cluster_replication'));
    loadTestFile(require.resolve('./remote_clusters'));
    loadTestFile(require.resolve('./rollup'));
    loadTestFile(require.resolve('./index_management'));
    loadTestFile(require.resolve('./index_lifecycle_management'));
  });
}
