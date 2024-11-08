/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

export default function apmApiIntegrationTests({
  loadTestFile,
}: DeploymentAgnosticFtrProviderContext) {
  describe('APM', function () {
    loadTestFile(require.resolve('./agent_explorer'));
    loadTestFile(require.resolve('./errors'));
  });
}
