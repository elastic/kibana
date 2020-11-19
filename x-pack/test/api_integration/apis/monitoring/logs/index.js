/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default function ({ loadTestFile }) {
  describe('Logs', () => {
    loadTestFile(require.resolve('./node_detail'));
    loadTestFile(require.resolve('./index_detail'));
    loadTestFile(require.resolve('./cluster'));
    loadTestFile(require.resolve('./multiple_clusters'));
  });
}
