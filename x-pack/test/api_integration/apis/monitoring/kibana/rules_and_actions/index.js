/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export default function ({ loadTestFile }) {
  // TODO: Unskip when https://github.com/elastic/kibana/pull/132853 is merged
  describe.skip('Rules and Actions', () => {
    loadTestFile(require.resolve('./overview'));
    loadTestFile(require.resolve('./instance'));
  });
}
