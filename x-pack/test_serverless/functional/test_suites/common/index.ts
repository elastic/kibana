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

    // platform security
    loadTestFile(require.resolve('./security/navigation/avatar_menu'));

    // Management
    loadTestFile(require.resolve('./management'));
    loadTestFile(require.resolve('./index_management'));
    loadTestFile(require.resolve('./ingest_pipelines'));

    // Data View Management
    loadTestFile(require.resolve('./data_view_mgmt'));
  });
}
