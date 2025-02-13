/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default ({ loadTestFile }: FtrProviderContext): void => {
  describe('Common', function () {
    loadTestFile(require.resolve('./alerts/get_cases'));
    loadTestFile(require.resolve('./comments/delete_comment'));
    loadTestFile(require.resolve('./comments/find_comments'));
    loadTestFile(require.resolve('./comments/get_comment'));
    loadTestFile(require.resolve('./comments/patch_comment'));
    loadTestFile(require.resolve('./comments/post_comment'));
    loadTestFile(require.resolve('./files/post_file'));
    loadTestFile(require.resolve('./cases/delete_cases'));
    loadTestFile(require.resolve('./cases/find_cases'));
    loadTestFile(require.resolve('./cases/get_case'));
    loadTestFile(require.resolve('./cases/patch_cases'));
    loadTestFile(require.resolve('./cases/post_case'));
    loadTestFile(require.resolve('./cases/reporters/get_reporters'));
    loadTestFile(require.resolve('./cases/tags/get_tags'));
    loadTestFile(require.resolve('./configure/get_configure'));
    loadTestFile(require.resolve('./configure/patch_configure'));
    loadTestFile(require.resolve('./configure/post_configure'));
    loadTestFile(require.resolve('./configure/post_configure'));
    loadTestFile(require.resolve('./metrics/get_cases_metrics'));

    /**
     * Internal routes
     */
    loadTestFile(require.resolve('./internal/bulk_create_attachments'));
    loadTestFile(require.resolve('./internal/suggest_user_profiles'));
  });
};
