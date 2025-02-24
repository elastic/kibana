/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ loadTestFile }: DeploymentAgnosticFtrProviderContext) {
  describe('service_groups', () => {
    loadTestFile(require.resolve('./save_service_group.spec.ts'));
    loadTestFile(
      require.resolve('./service_group_with_overflow/service_group_with_overflow.spec.ts')
    );
    loadTestFile(require.resolve('./service_group_count/service_group_count.spec.ts'));
  });
}
