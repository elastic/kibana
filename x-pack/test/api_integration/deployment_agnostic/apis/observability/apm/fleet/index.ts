/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ loadTestFile }: DeploymentAgnosticFtrProviderContext) {
  describe('fleet', () => {
    // loadTestFile(require.resolve('./apm_package_policy.spec.ts'));
    loadTestFile(require.resolve('./input_only_package.spec.ts'));
  });
}
