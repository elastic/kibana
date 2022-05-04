/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../services';

// eslint-disable-next-line import/no-default-export
export default function ({ loadTestFile }: FtrProviderContext) {
  describe('Licensing plugin server client', function () {
    loadTestFile(require.resolve('./info'));
    loadTestFile(require.resolve('./header'));

    // MUST BE LAST! CHANGES LICENSE TYPE!
    loadTestFile(require.resolve('./updates'));
  });
}
