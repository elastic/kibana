/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { TestInvoker } from './lib/types';

// tslint:disable:no-default-export
export default function spacesApp({ loadTestFile }: TestInvoker) {
  describe('Spaces app', function spacesAppTestSuite() {
<<<<<<< HEAD
=======
    (this as any).tags('ciGroup4');

>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
    loadTestFile(require.resolve('./spaces_selection'));
  });
}
