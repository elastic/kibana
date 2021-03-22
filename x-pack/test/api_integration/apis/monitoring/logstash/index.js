/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export default function ({ loadTestFile }) {
  describe('Logstash', () => {
    loadTestFile(require.resolve('./overview'));
    loadTestFile(require.resolve('./overview_mb'));
    loadTestFile(require.resolve('./nodes'));
    loadTestFile(require.resolve('./nodes_mb'));
    loadTestFile(require.resolve('./node_detail'));
    loadTestFile(require.resolve('./node_detail_mb'));
    loadTestFile(require.resolve('./multicluster_pipelines'));
    loadTestFile(require.resolve('./multicluster_pipelines_mb'));
    loadTestFile(require.resolve('./pipelines'));
    loadTestFile(require.resolve('./pipelines_mb'));
  });
}
