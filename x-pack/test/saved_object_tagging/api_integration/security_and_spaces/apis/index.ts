/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../services';
import { createUsersAndRoles } from '../../../common/lib';

// eslint-disable-next-line import/no-default-export
export default function ({ getService, loadTestFile }: FtrProviderContext) {
  describe('saved objects tagging API - security and spaces integration', function () {
    this.tags('ciGroup10');

    before(async () => {
      await createUsersAndRoles(getService);
    });

    loadTestFile(require.resolve('./get'));
    loadTestFile(require.resolve('./get_all'));
    loadTestFile(require.resolve('./create'));
    loadTestFile(require.resolve('./update'));
    loadTestFile(require.resolve('./delete'));
    loadTestFile(require.resolve('./bulk_assign'));
    loadTestFile(require.resolve('./_find'));
    loadTestFile(require.resolve('./_get_assignable_types'));
    loadTestFile(require.resolve('./_bulk_delete'));
  });
}
