/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default function ({ loadTestFile }) {
<<<<<<< HEAD
  describe('apis', () => {
=======
  describe('apis', function () {
    this.tags('ciGroup5');

>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
    loadTestFile(require.resolve('./es'));
    loadTestFile(require.resolve('./security'));
    loadTestFile(require.resolve('./monitoring'));
    loadTestFile(require.resolve('./xpack_main'));
    loadTestFile(require.resolve('./logstash'));
    loadTestFile(require.resolve('./kibana'));
    loadTestFile(require.resolve('./infra'));
    loadTestFile(require.resolve('./beats'));
  });
}
