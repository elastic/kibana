/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createUsersAndRoles } from '../../common/lib/create_users_and_roles';
import { TestInvoker } from '../../common/lib/types';

// eslint-disable-next-line import/no-default-export
export default function ({ loadTestFile, getService }: TestInvoker) {
  const es = getService('es');
  const supertest = getService('supertest');

  describe('spaces api with security', function () {
    this.tags('ciGroup8');

    before(async () => {
      await createUsersAndRoles(es, supertest);
    });

    loadTestFile(require.resolve('./copy_to_space'));
    loadTestFile(require.resolve('./resolve_copy_to_space_conflicts'));
    loadTestFile(require.resolve('./create'));
    loadTestFile(require.resolve('./delete'));
    loadTestFile(require.resolve('./get_all'));
    loadTestFile(require.resolve('./get'));
    loadTestFile(require.resolve('./share_add'));
    loadTestFile(require.resolve('./share_remove'));
    loadTestFile(require.resolve('./update'));
  });
}
