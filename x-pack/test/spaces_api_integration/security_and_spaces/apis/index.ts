/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createUsersAndRoles } from '../../common/lib/create_users_and_roles';
import { FtrProviderContext } from '../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ loadTestFile, getService }: FtrProviderContext) {
  const es = getService('es');
  const supertest = getService('supertest');

  describe('spaces api with security', function () {
    before(async () => {
      await createUsersAndRoles(es, supertest);
    });

    loadTestFile(require.resolve('./copy_to_space'));
    loadTestFile(require.resolve('./resolve_copy_to_space_conflicts'));
    loadTestFile(require.resolve('./create'));
    loadTestFile(require.resolve('./delete'));
    loadTestFile(require.resolve('./get_all'));
    loadTestFile(require.resolve('./get_shareable_references'));
    loadTestFile(require.resolve('./get'));
    loadTestFile(require.resolve('./update'));
    loadTestFile(require.resolve('./update_objects_spaces'));
    loadTestFile(require.resolve('./disable_legacy_url_aliases'));
  });
}
