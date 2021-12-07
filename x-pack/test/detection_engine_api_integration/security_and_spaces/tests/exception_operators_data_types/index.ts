/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default ({ loadTestFile }: FtrProviderContext): void => {
  describe('Detection exceptions data types and operators', function () {
    describe('', function () {
      this.tags('ciGroup23');

      loadTestFile(require.resolve('./date'));
      loadTestFile(require.resolve('./double'));
      loadTestFile(require.resolve('./float'));
      loadTestFile(require.resolve('./integer'));
    });

    describe('', function () {
      this.tags('ciGroup24');

      loadTestFile(require.resolve('./ip'));
      loadTestFile(require.resolve('./ip_array'));
      loadTestFile(require.resolve('./keyword'));
      loadTestFile(require.resolve('./keyword_array'));
      loadTestFile(require.resolve('./long'));
      loadTestFile(require.resolve('./text'));
      loadTestFile(require.resolve('./text_array'));
    });
  });
};
