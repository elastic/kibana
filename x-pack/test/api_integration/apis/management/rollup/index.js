/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export default function ({ loadTestFile }) {
  describe('rollup', () => {
    loadTestFile(require.resolve('./rollup'));
    loadTestFile(require.resolve('./index_patterns_extensions'));
    loadTestFile(require.resolve('./rollup_search'));
  });
}
