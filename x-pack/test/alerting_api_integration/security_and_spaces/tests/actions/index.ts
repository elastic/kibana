/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function actionsTests({ loadTestFile, getService }: FtrProviderContext) {
  describe('Actions', () => {
    loadTestFile(require.resolve('./builtin_action_types/email'));
    loadTestFile(require.resolve('./builtin_action_types/es_index'));
    loadTestFile(require.resolve('./builtin_action_types/es_index_preconfigured'));
    loadTestFile(require.resolve('./builtin_action_types/pagerduty'));
    loadTestFile(require.resolve('./builtin_action_types/server_log'));
    loadTestFile(require.resolve('./builtin_action_types/servicenow'));
    loadTestFile(require.resolve('./builtin_action_types/jira'));
    loadTestFile(require.resolve('./builtin_action_types/resilient'));
    loadTestFile(require.resolve('./builtin_action_types/slack'));
    loadTestFile(require.resolve('./builtin_action_types/webhook'));
    loadTestFile(require.resolve('./create'));
    loadTestFile(require.resolve('./delete'));
    loadTestFile(require.resolve('./execute'));
    loadTestFile(require.resolve('./get_all'));
    loadTestFile(require.resolve('./get'));
    loadTestFile(require.resolve('./list_action_types'));
    loadTestFile(require.resolve('./update'));
  });
}
