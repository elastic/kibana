/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export default function ({ loadTestFile }) {
  describe('rollup app', function () {
    this.tags('ciGroup28');

    loadTestFile(require.resolve('./rollup_jobs'));
    loadTestFile(require.resolve('./hybrid_index_pattern'));
    loadTestFile(require.resolve('./tsvb'));
  });
}
