/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ loadTestFile }: DeploymentAgnosticFtrProviderContext) {
  describe('service_overview', () => {
    loadTestFile(require.resolve('./instance_details.spec.ts'));
    loadTestFile(require.resolve('./instances_detailed_statistics.spec.ts'));
    loadTestFile(require.resolve('./instances_main_statistics.spec.ts'));
    loadTestFile(require.resolve('./dependencies/index.spec.ts'));
  });
}
