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

    // total runtime ~ 17m
    loadTestFile(require.resolve('./resolve_copy_to_space_conflicts')); // ~ 10m
    loadTestFile(require.resolve('./create')); // ~ 2m
    loadTestFile(require.resolve('./delete')); // ~ 1m 20s
    loadTestFile(require.resolve('./get_all')); // ~ 50s
    loadTestFile(require.resolve('./get_shareable_references')); // ~ 30s
    loadTestFile(require.resolve('./get')); // ~ 30s
    loadTestFile(require.resolve('./update')); // ~ 30s
    loadTestFile(require.resolve('./update_objects_spaces')); // ~ 1m
    loadTestFile(require.resolve('./disable_legacy_url_aliases')); // ~ 30s
  });
}
