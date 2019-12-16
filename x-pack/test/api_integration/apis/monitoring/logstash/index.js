/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default function({ loadTestFile }) {
  // FAILING: https://github.com/elastic/kibana/issues/52476
  describe.skip('Logstash', () => {
    loadTestFile(require.resolve('./overview'));
    loadTestFile(require.resolve('./nodes'));
    loadTestFile(require.resolve('./node_detail'));
    loadTestFile(require.resolve('./multicluster_pipelines'));
    loadTestFile(require.resolve('./pipelines'));
  });
}
