/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default function ({ loadTestFile }) {
  describe('apis', function () {
    this.tags('ciGroup8');

    loadTestFile(require.resolve('./actions'));
    loadTestFile(require.resolve('./alerting'));
  });
}
