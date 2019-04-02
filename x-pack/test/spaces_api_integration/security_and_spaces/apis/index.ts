/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createUsersAndRoles } from '../../common/lib/create_users_and_roles';
import { TestInvoker } from '../../common/lib/types';

// tslint:disable:no-default-export
export default function({ loadTestFile, getService }: TestInvoker) {
  const es = getService('es');
  const supertest = getService('supertest');

  describe('spaces api with security', function() {
    this.tags('ciGroup1'); // DO NOT CHECK THIS BACK INTO MASTER -- THIS IS TEMP FROM ciGroup5 to ciGroup1 for siem to keep this running quickly

    before(async () => {
      await createUsersAndRoles(es, supertest);
    });

    loadTestFile(require.resolve('./create'));
    loadTestFile(require.resolve('./delete'));
    loadTestFile(require.resolve('./get_all'));
    loadTestFile(require.resolve('./get'));
    loadTestFile(require.resolve('./select'));
    loadTestFile(require.resolve('./update'));
  });
}
