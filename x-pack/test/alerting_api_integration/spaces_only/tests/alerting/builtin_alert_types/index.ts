/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function alertingTests({ loadTestFile }: FtrProviderContext) {
  describe('builtin alertTypes', () => {
    loadTestFile(require.resolve('./index_threshold'));
    loadTestFile(require.resolve('./es_query'));
  });
}
