/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ loadTestFile }: DeploymentAgnosticFtrProviderContext) {
  describe('errors', () => {
    loadTestFile(require.resolve('./error_group_list.spec.ts'));
    loadTestFile(require.resolve('./group_id_samples.spec.ts'));
    loadTestFile(require.resolve('./distribution.spec.ts'));
    loadTestFile(require.resolve('./top_errors_for_transaction/top_errors_main_stats.spec.ts'));
    loadTestFile(
      require.resolve('./top_erroneous_transactions/top_erroneous_transactions.spec.ts')
    );
  });
}
