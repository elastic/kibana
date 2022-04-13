/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { setupSpacesAndUsers, tearDown } from '..';

// eslint-disable-next-line import/no-default-export
export default function actionsTests({ loadTestFile, getService }: FtrProviderContext) {
  describe('Actions', () => {
    before(async () => {
      await setupSpacesAndUsers(getService);
    });

    after(async () => {
      await tearDown(getService);
    });

    loadTestFile(require.resolve('./builtin_action_types/email'));
    loadTestFile(require.resolve('./builtin_action_types/es_index'));
    loadTestFile(require.resolve('./builtin_action_types/es_index_preconfigured'));
    loadTestFile(require.resolve('./builtin_action_types/pagerduty'));
    loadTestFile(require.resolve('./builtin_action_types/swimlane'));
    loadTestFile(require.resolve('./builtin_action_types/server_log'));
    loadTestFile(require.resolve('./builtin_action_types/servicenow_itsm'));
    loadTestFile(require.resolve('./builtin_action_types/servicenow_sir'));
    loadTestFile(require.resolve('./builtin_action_types/servicenow_itom'));
    loadTestFile(require.resolve('./builtin_action_types/jira'));
    loadTestFile(require.resolve('./builtin_action_types/resilient'));
    loadTestFile(require.resolve('./builtin_action_types/slack'));
    loadTestFile(require.resolve('./builtin_action_types/webhook'));
    loadTestFile(require.resolve('./builtin_action_types/xmatters'));
    loadTestFile(require.resolve('./create'));
    loadTestFile(require.resolve('./delete'));
    loadTestFile(require.resolve('./execute'));
    loadTestFile(require.resolve('./get_all'));
    loadTestFile(require.resolve('./get'));
    loadTestFile(require.resolve('./connector_types'));
    loadTestFile(require.resolve('./update'));
  });
}
