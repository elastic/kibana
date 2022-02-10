/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';
import { createUsersAndRoles } from '../../common/lib';

// eslint-disable-next-line import/no-default-export
export default function ({ loadTestFile, getService }: FtrProviderContext) {
  describe('saved objects tagging - functional tests', function () {
    this.tags('ciGroup14');

    before(async () => {
      await createUsersAndRoles(getService);
    });

    loadTestFile(require.resolve('./listing'));
    loadTestFile(require.resolve('./bulk_actions'));
    loadTestFile(require.resolve('./bulk_assign'));
    loadTestFile(require.resolve('./create'));
    loadTestFile(require.resolve('./edit'));
    loadTestFile(require.resolve('./som_integration'));
    loadTestFile(require.resolve('./visualize_integration'));
    loadTestFile(require.resolve('./dashboard_integration'));
    loadTestFile(require.resolve('./feature_control'));
    loadTestFile(require.resolve('./maps_integration'));
  });
}
