/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaFunctionalTestDefaultProviders } from '../../../types/providers';

// eslint-disable-next-line import/no-default-export
export default function actionsTests({ loadTestFile }: KibanaFunctionalTestDefaultProviders) {
  describe('Actions', () => {
    loadTestFile(require.resolve('./create'));
    loadTestFile(require.resolve('./delete'));
    loadTestFile(require.resolve('./find'));
    loadTestFile(require.resolve('./get'));
    loadTestFile(require.resolve('./list_action_types'));
    loadTestFile(require.resolve('./update'));
    loadTestFile(require.resolve('./fire'));
    loadTestFile(require.resolve('./builtin_action_types/server_log'));
    loadTestFile(require.resolve('./builtin_action_types/slack'));
    loadTestFile(require.resolve('./builtin_action_types/email'));
  });
}
