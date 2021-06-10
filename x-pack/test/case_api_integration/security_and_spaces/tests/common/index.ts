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
    loadTestFile(require.resolve('./client/update_alert_status'));
    loadTestFile(require.resolve('./comments/delete_comment'));
    loadTestFile(require.resolve('./comments/find_comments'));
    loadTestFile(require.resolve('./comments/get_comment'));
    loadTestFile(require.resolve('./comments/get_all_comments'));
    loadTestFile(require.resolve('./comments/patch_comment'));
    loadTestFile(require.resolve('./comments/post_comment'));
    loadTestFile(require.resolve('./alerts/get_cases'));
    loadTestFile(require.resolve('./cases/delete_cases'));
    loadTestFile(require.resolve('./cases/find_cases'));
    loadTestFile(require.resolve('./cases/get_case'));
    loadTestFile(require.resolve('./cases/patch_cases'));
    loadTestFile(require.resolve('./cases/post_case'));
    loadTestFile(require.resolve('./cases/reporters/get_reporters'));
    loadTestFile(require.resolve('./cases/status/get_status'));
    loadTestFile(require.resolve('./cases/tags/get_tags'));
    loadTestFile(require.resolve('./user_actions/get_all_user_actions'));
    loadTestFile(require.resolve('./configure/get_configure'));
    loadTestFile(require.resolve('./configure/get_connectors'));
    loadTestFile(require.resolve('./configure/patch_configure'));
    loadTestFile(require.resolve('./configure/post_configure'));
    loadTestFile(require.resolve('./connectors/case'));
    loadTestFile(require.resolve('./sub_cases/patch_sub_cases'));
    loadTestFile(require.resolve('./sub_cases/delete_sub_cases'));
    loadTestFile(require.resolve('./sub_cases/get_sub_case'));
    loadTestFile(require.resolve('./sub_cases/find_sub_cases'));

    // NOTE: Migrations are not included because they can inadvertently remove the .kibana indices which removes the users and spaces
    // which causes errors in any tests after them that relies on those
  });
};
