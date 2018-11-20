/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


export default function ({ loadTestFile }) {
  describe('InfraOps GraphQL Endpoints', () => {
<<<<<<< HEAD
    loadTestFile(require.resolve('./capabilities'));
=======
    loadTestFile(require.resolve('./metadata'));
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
    loadTestFile(require.resolve('./log_entries'));
    loadTestFile(require.resolve('./log_summary'));
    loadTestFile(require.resolve('./metrics'));
    loadTestFile(require.resolve('./sources'));
    loadTestFile(require.resolve('./waffle'));
  });
}
