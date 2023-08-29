/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';
import loadDiscoverLogExplorerSuite from './discover_log_explorer';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('serverless observability UI', function () {
    loadTestFile(require.resolve('./landing_page'));
    loadTestFile(require.resolve('./navigation'));
    loadDiscoverLogExplorerSuite(loadTestFile);
    loadTestFile(require.resolve('./cases/attachment_framework'));
    loadTestFile(require.resolve('./cases/view_case'));
    loadTestFile(require.resolve('./cases/configure'));
    loadTestFile(require.resolve('./cases/create_case_form'));
    loadTestFile(require.resolve('./cases/list_view'));
  });
}
