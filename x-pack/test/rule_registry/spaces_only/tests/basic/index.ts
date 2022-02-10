/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { createSpaces, deleteSpaces } from '../../../common/lib/authentication';

// eslint-disable-next-line import/no-default-export
export default ({ loadTestFile, getService }: FtrProviderContext): void => {
  describe('rule registry spaces only: trial', function () {
    // Fastest ciGroup for the moment.
    this.tags('ciGroup5');

    before(async () => {
      await createSpaces(getService);
    });

    after(async () => {
      await deleteSpaces(getService);
    });

    // Basic
    loadTestFile(require.resolve('./bootstrap'));
  });
};
