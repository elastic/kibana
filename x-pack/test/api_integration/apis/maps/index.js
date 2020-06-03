/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default function ({ loadTestFile, getService }) {
  const esArchiver = getService('esArchiver');

  describe('Maps endpoints', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('logstash_functional');
    });

    describe('', () => {
      loadTestFile(require.resolve('./fonts_api'));
      loadTestFile(require.resolve('./index_settings'));
      loadTestFile(require.resolve('./migrations'));
    });
  });
}
