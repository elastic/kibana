/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line
export default function ({ getService, loadTestFile }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');

  describe('Security POC', function () {
    before(async () => {
      await esArchiver.load('auditbeat');
    });
    this.tags('ciGroup7');
    loadTestFile(require.resolve('./poc.ts'));
  });
}
