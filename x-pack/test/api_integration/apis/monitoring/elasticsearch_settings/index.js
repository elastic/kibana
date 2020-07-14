/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default function ({ loadTestFile }) {
  describe('elasticsearch_settings', () => {
    loadTestFile(require.resolve('./check_cluster'));
    loadTestFile(require.resolve('./check_nodes'));
    loadTestFile(require.resolve('./set_collection_enabled'));
    loadTestFile(require.resolve('./set_collection_interval'));
  });
}
