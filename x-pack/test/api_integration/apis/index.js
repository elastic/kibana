/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default function ({ loadTestFile }) {
  describe('apis', () => {
    // These commented out tests are only for within the secops branch and should not be merged into master
    // loadTestFile(require.resolve('./es'));
    // loadTestFile(require.resolve('./security'));
    // loadTestFile(require.resolve('./monitoring'));
    // loadTestFile(require.resolve('./xpack_main'));
    // loadTestFile(require.resolve('./logstash'));
    // loadTestFile(require.resolve('./kibana'));
    // loadTestFile(require.resolve('./infra'));

    // TODO: I am only running infra at the moment
    // but in reality I should not be running infra and
    // should instead be running secops which still needs
    // to be built. I kept this api integration test running for right now
    // as an example. -- Frank H.
    // See completion of issue: https://github.com/elastic/ingest-dev/issues/56
    loadTestFile(require.resolve('./infra'));

    // loadTestFile(require.resolve('./beats'));
  });
}
