/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../services';
import { createUsersAndRoles } from '../../common/lib/create_users_and_roles';

// eslint-disable-next-line import/no-default-export
export default function ({ getService, loadTestFile }: FtrProviderContext) {
  const es = getService('legacyEs');
  const supertest = getService('supertest');

  describe('saved objects tagging API', function () {
    this.tags('ciGroup9');

    before(async () => {
      await createUsersAndRoles(es, supertest);
    });

    loadTestFile(require.resolve('./get'));
  });
}
