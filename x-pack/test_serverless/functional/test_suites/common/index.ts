/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('serverless common UI', function () {
    loadTestFile(require.resolve('./home_page'));
    loadTestFile(require.resolve('./management'));

    // reporting management app
    loadTestFile(require.resolve('./reporting'));

    // platform security
    loadTestFile(require.resolve('./security/api_keys'));
    loadTestFile(require.resolve('./security/navigation/avatar_menu'));

    // Management
    loadTestFile(require.resolve('./index_management'));

    // Data View Management
    loadTestFile(require.resolve('./data_view_mgmt'));
  });
}
