/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../services';

// eslint-disable-next-line import/no-default-export
export default function({ loadTestFile }: FtrProviderContext) {
  describe('Licensing plugin server client', function() {
    this.tags('ciGroup2');
    loadTestFile(require.resolve('./info'));
    loadTestFile(require.resolve('./header'));

    // MUST BE LAST! CHANGES LICENSE TYPE!
    loadTestFile(require.resolve('./updates'));
  });
}
