/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FtrProviderContext } from '../../../common/ftr_provider_context';

export default function tracesIntegrationTests({ loadTestFile }: FtrProviderContext) {
  describe('Traces', function () {
    loadTestFile(require.resolve('./top_traces'));
  });
}
