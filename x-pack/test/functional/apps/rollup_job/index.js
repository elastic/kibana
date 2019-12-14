/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default function({ loadTestFile }) {
  // FLAKY: https://github.com/elastic/kibana/issues/43559
  describe.skip('rollup job', function() {
    this.tags('ciGroup1');

    loadTestFile(require.resolve('./rollup_jobs'));
  });
}
