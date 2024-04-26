/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../../ftr_provider_context';
import {
  createSpacesAndUsers,
  deleteSpacesAndUsers,
} from '../../../../../common/lib/authentication';

export default function ({ loadTestFile, getService }: FtrProviderContext) {
  describe('@ess SecuritySolution Explore Network', () => {
    before(async () => {
      await createSpacesAndUsers(getService);
    });

    after(async () => {
      await deleteSpacesAndUsers(getService);
    });

    loadTestFile(require.resolve('./network_details'));
    loadTestFile(require.resolve('./network_dns'));
    loadTestFile(require.resolve('./network_top_n_flow'));
    loadTestFile(require.resolve('./tls'));
  });
}
