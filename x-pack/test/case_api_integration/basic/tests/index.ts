/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default ({ loadTestFile }: FtrProviderContext): void => {
  describe('case api basic', function() {
    // Fastest ciGroup for the moment.
    this.tags('ciGroup2');

    loadTestFile(require.resolve('./configure/get_configure'));
    loadTestFile(require.resolve('./configure/post_configure'));
    loadTestFile(require.resolve('./configure/patch_configure'));
    loadTestFile(require.resolve('./configure/get_connectors'));
  });
};
