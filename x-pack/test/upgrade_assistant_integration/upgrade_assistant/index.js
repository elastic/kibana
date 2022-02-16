/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export default function ({ loadTestFile }) {
  describe('upgrade assistant', function () {
    this.tags('ciGroup7');
    this.onlyEsVersion('<=7');

    loadTestFile(require.resolve('./reindexing'));
  });
}
