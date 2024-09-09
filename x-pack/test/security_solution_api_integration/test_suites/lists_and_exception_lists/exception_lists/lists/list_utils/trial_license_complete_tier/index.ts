/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('Exception Lists Utility Endpoints - Lists APIs', function () {
    loadTestFile(require.resolve('./duplicate_exception_list'));
    loadTestFile(require.resolve('./get_exception_filter'));
    loadTestFile(require.resolve('./find_exception_lists'));
    loadTestFile(require.resolve('./summary_exception_lists'));
    loadTestFile(require.resolve('./rbac'));
  });
}
