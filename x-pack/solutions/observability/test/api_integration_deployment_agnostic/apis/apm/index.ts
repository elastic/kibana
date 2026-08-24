/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';

export default function apmApiIntegrationTests({
  loadTestFile,
}: DeploymentAgnosticFtrProviderContext) {
  // part_1 and part_2 each declare their own `describe('APM', ...)` block
  loadTestFile(require.resolve('./part_1'));
  loadTestFile(require.resolve('./part_2'));
}
