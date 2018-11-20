/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TestInvoker } from '../../common/lib/types';

// tslint:disable:no-default-export
export default function({ loadTestFile }: TestInvoker) {
<<<<<<< HEAD
  describe('saved objects spaces only enabled', () => {
=======
  describe('saved objects spaces only enabled', function() {
    (this as any).tags('ciGroup5');

>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
    loadTestFile(require.resolve('./bulk_create'));
    loadTestFile(require.resolve('./bulk_get'));
    loadTestFile(require.resolve('./create'));
    loadTestFile(require.resolve('./delete'));
    loadTestFile(require.resolve('./find'));
    loadTestFile(require.resolve('./get'));
    loadTestFile(require.resolve('./update'));
  });
}
