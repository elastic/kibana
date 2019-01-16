/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// export default function ({ loadTestFile }) {
export default function () {
  describe('apis', function () {
    this.tags('ciGroup5');

    // These commented out tests are only for within the secops branch and should not be merged into master
    // loadTestFile(require.resolve('./es'));
    // loadTestFile(require.resolve('./security'));
    // loadTestFile(require.resolve('./monitoring'));
    // loadTestFile(require.resolve('./xpack_main'));
    // loadTestFile(require.resolve('./logstash'));
    // loadTestFile(require.resolve('./kibana'));
    // loadTestFile(require.resolve('./infra'));
    // Only running our secops test for now since we are working in our own branch
    // TODO: Re add this whenever tests are working again
    // loadTestFile(require.resolve('./secops'));

    // loadTestFile(require.resolve('./beats'));
    // loadTestFile(require.resolve('./management'));
    // loadTestFile(require.resolve('./uptime'));
  });
}
