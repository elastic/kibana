/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default function ({ loadTestFile }) {
  describe('logstash', function () {
    this.tags('ciGroup2');

    loadTestFile(require.resolve('./grok_debugger'));
  });
}
