/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../common/ftr_provider_context';
import {
  createSpacesAndUsers,
  deleteSpacesAndUsers,
  activateUserProfiles,
} from '../../../common/lib/authentication';

// eslint-disable-next-line import/no-default-export
export default ({ loadTestFile, getService }: FtrProviderContext): void => {
  describe('cases security and spaces enabled: trial', function () {
    before(async () => {
      await createSpacesAndUsers(getService);
      // once a user profile is created the only way to remove it is to delete the user and roles, so best to activate
      // before all the tests
      await activateUserProfiles(getService);
    });

    after(async () => {
      await deleteSpacesAndUsers(getService);
    });

    // Trial
    loadTestFile(require.resolve('./cases/push_case'));
    loadTestFile(require.resolve('./cases/user_actions/find_user_actions'));
    loadTestFile(require.resolve('./cases/assignees'));
    loadTestFile(require.resolve('./cases/find_cases'));
    loadTestFile(require.resolve('./cases/post_case'));
    loadTestFile(require.resolve('./cases/patch_case'));
    loadTestFile(require.resolve('./configure'));
    loadTestFile(require.resolve('./attachments_framework/registered_persistable_state_trial'));
    // sub privileges are only available with a license above basic
    loadTestFile(require.resolve('./delete_sub_privilege'));
    loadTestFile(require.resolve('./create_comment_sub_privilege.ts'));
    loadTestFile(require.resolve('./user_profiles/get_current'));
    // case observables are only available with a license above basic
    loadTestFile(require.resolve('./internal/observables'));

    // Internal routes
    loadTestFile(require.resolve('./internal/get_user_action_stats'));
    loadTestFile(require.resolve('./internal/suggest_user_profiles'));
    loadTestFile(require.resolve('./internal/get_connectors'));
    loadTestFile(require.resolve('./internal/user_actions_get_users'));
    loadTestFile(require.resolve('./internal/bulk_delete_file_attachments'));

    // Connectors
    loadTestFile(require.resolve('./connectors/cases/cases_connector'));

    // NOTE: These need to be at the end because they could delete the .kibana index and inadvertently remove the users and spaces
    loadTestFile(require.resolve('../common/migrations'));

    // NOTE: These need to be at the end because they could delete the .kibana index and inadvertently remove the users and spaces
    loadTestFile(require.resolve('../common/kibana_alerting_cases_index'));
  });
};
