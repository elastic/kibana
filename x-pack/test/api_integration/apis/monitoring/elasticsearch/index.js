/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export default function ({ loadTestFile }) {
  describe('Elasticsearch', () => {
    loadTestFile(require.resolve('./overview'));
    loadTestFile(require.resolve('./overview_mb'));
    loadTestFile(require.resolve('./nodes'));
    loadTestFile(require.resolve('./nodes_mb'));
    loadTestFile(require.resolve('./node_detail'));
    loadTestFile(require.resolve('./node_detail_mb'));
    loadTestFile(require.resolve('./node_detail_advanced'));
    loadTestFile(require.resolve('./node_detail_advanced_mb'));
    loadTestFile(require.resolve('./indices'));
    loadTestFile(require.resolve('./indices_mb'));
    loadTestFile(require.resolve('./index_detail'));
    loadTestFile(require.resolve('./index_detail_mb'));
    loadTestFile(require.resolve('./ccr'));
    loadTestFile(require.resolve('./ccr_mb'));
    loadTestFile(require.resolve('./ccr_shard'));
    loadTestFile(require.resolve('./ccr_shard_mb'));
  });
}
