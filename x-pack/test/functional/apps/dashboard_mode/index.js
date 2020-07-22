/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default function ({ loadTestFile }) {
  describe('dashboard mode', function () {
    this.tags('ciGroup7');

    loadTestFile(require.resolve('./dashboard_view_mode'));
    loadTestFile(require.resolve('./dashboard_empty_screen'));
  });
}
