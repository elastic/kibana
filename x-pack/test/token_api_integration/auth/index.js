/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default function ({ loadTestFile }) {
  describe('token-based auth', function () {
    this.tags('ciGroup6');
    loadTestFile(require.resolve('./login'));
    loadTestFile(require.resolve('./logout'));
    loadTestFile(require.resolve('./header'));
    loadTestFile(require.resolve('./session'));
  });
}
