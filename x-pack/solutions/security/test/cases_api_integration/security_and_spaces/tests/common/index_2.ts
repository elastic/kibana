/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '@kbn/test-suites-xpack-platform/cases_api_integration/common/ftr_provider_context';

export default ({ loadTestFile }: FtrProviderContext): void => {
  describe('Common (Part 2)', function () {
    /**
     * Internal routes
     */
    loadTestFile(require.resolve('./internal/bulk_create_attachments'));
  });
};
