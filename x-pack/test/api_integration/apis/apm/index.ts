/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function apmApiIntegrationTests({ loadTestFile }: FtrProviderContext) {
  describe('APM specs', () => {
    loadTestFile(require.resolve('./feature_controls'));
    loadTestFile(require.resolve('./agent_configuration'));
    loadTestFile(require.resolve('./custom_link'));
  });
}
