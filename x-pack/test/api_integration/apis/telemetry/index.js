/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export default function ({ loadTestFile }) {
  describe('Telemetry', () => {
    loadTestFile(require.resolve('./telemetry'));
    loadTestFile(require.resolve('./telemetry_local'));
    loadTestFile(require.resolve('./opt_in'));
    loadTestFile(require.resolve('./telemetry_optin_notice_seen'));
  });
}
