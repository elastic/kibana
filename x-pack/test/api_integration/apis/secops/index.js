/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


export default function ({ loadTestFile }) {
  describe('SecOps GraphQL Endpoints', () => {
    loadTestFile(require.resolve('./events'));
    loadTestFile(require.resolve('./hosts'));
    loadTestFile(require.resolve('./kpi_events'));
    loadTestFile(require.resolve('./sources'));
    loadTestFile(require.resolve('./timeline'));
    loadTestFile(require.resolve('./uncommon_processes'));
  });
}
