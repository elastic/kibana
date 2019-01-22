/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { TestInvoker } from './lib/types';

// tslint:disable:no-default-export
export default function codeApp({ loadTestFile }: TestInvoker) {
  describe('Code app', function codeAppTestSuite() {
    this.tags('ciGroup2');
    // Temporarily disable functional test for code.
    // loadTestFile(require.resolve('./import_repository'));
  });
}
