/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createUsersAndRoles } from '../../common/lib/create_users_and_roles';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function ({ getService, loadTestFile }: FtrProviderContext) {
  const es = getService('legacyEs');
  const supertest = getService('supertest');

  describe('saved objects security only enabled', function () {
    this.tags('ciGroup9');

    before(async () => {
      await createUsersAndRoles(es, supertest);
    });

    loadTestFile(require.resolve('./bulk_create'));
    loadTestFile(require.resolve('./bulk_get'));
    loadTestFile(require.resolve('./bulk_update'));
    loadTestFile(require.resolve('./create'));
    loadTestFile(require.resolve('./delete'));
    loadTestFile(require.resolve('./export'));
    loadTestFile(require.resolve('./find'));
    loadTestFile(require.resolve('./get'));
    loadTestFile(require.resolve('./import'));
    loadTestFile(require.resolve('./resolve_import_errors'));
    loadTestFile(require.resolve('./update'));
  });
}
