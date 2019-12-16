/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default function({ loadTestFile }) {
  describe('EPM Endpoints', function() {
    this.tags('ciGroup7');
    loadTestFile(require.resolve('./list'));
    loadTestFile(require.resolve('./file'));
    loadTestFile(require.resolve('./template'));
    loadTestFile(require.resolve('./ilm'));
    loadTestFile(require.resolve('./data_sources'));
  });
}
