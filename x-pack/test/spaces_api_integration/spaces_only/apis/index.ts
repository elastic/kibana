/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TestInvoker } from '../../common/lib/types';

// eslint-disable-next-line import/no-default-export
export default function spacesOnlyTestSuite({ loadTestFile }: TestInvoker) {
  describe('spaces api without security', function() {
    this.tags('ciGroup5');

    loadTestFile(require.resolve('./create'));
    loadTestFile(require.resolve('./delete'));
    loadTestFile(require.resolve('./get_all'));
    loadTestFile(require.resolve('./get'));
    loadTestFile(require.resolve('./select'));
    loadTestFile(require.resolve('./update'));
  });
}
