/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '@kbn/test-suites-xpack-platform/cases_api_integration/common/ftr_provider_context';

export default ({ loadTestFile }: FtrProviderContext): void => {
  describe('Common', function () {
    /**
     * Public routes
     */
    loadTestFile(require.resolve('./client/update_alert_status'));
    loadTestFile(require.resolve('./comments/delete_comment'));
    loadTestFile(require.resolve('./comments/delete_comments'));
    loadTestFile(require.resolve('./comments/post_comment'));
    loadTestFile(require.resolve('./cases/delete_cases'));
    loadTestFile(require.resolve('./cases/patch_cases'));

    /**
     * Internal routes
     */
    loadTestFile(require.resolve('./internal/bulk_create_attachments'));
  });
};
