/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('filters', function () {
    loadTestFile(require.resolve('./create_filters'));
    loadTestFile(require.resolve('./get_filters'));
    loadTestFile(require.resolve('./delete_filters'));
    loadTestFile(require.resolve('./update_filters'));
  });
}
