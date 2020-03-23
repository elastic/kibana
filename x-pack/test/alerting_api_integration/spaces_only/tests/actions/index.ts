/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function actionsTests({ loadTestFile }: FtrProviderContext) {
  describe('Actions', () => {
    loadTestFile(require.resolve('./create'));
    loadTestFile(require.resolve('./delete'));
    loadTestFile(require.resolve('./find'));
    loadTestFile(require.resolve('./get'));
    loadTestFile(require.resolve('./list_action_types'));
    loadTestFile(require.resolve('./update'));
    loadTestFile(require.resolve('./execute'));
    loadTestFile(require.resolve('./builtin_action_types/es_index'));
    loadTestFile(require.resolve('./builtin_action_types/webhook'));
    loadTestFile(require.resolve('./type_not_enabled'));
  });
}
