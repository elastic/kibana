/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FtrProviderContext } from '../../../common/ftr_provider_context';

export default function servicesIntegrationTests({ loadTestFile }: FtrProviderContext) {
  describe('Services', function () {
    loadTestFile(require.resolve('./annotations'));
    loadTestFile(require.resolve('./top_services'));
    loadTestFile(require.resolve('./agent_name'));
    loadTestFile(require.resolve('./transaction_types'));
  });
}
