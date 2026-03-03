/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';

export default function ({ loadTestFile }: DeploymentAgnosticFtrProviderContext) {
  describe('Stateful Observability - Deployment-agnostic APM API integration tests', () => {
    describe('APM', () => {
      loadTestFile(require.resolve('../../apis/apm/service_nodes'));
      loadTestFile(require.resolve('../../apis/apm/service_overview'));
      loadTestFile(require.resolve('../../apis/apm/services'));
      loadTestFile(require.resolve('../../apis/apm/settings'));
      loadTestFile(require.resolve('../../apis/apm/span_links'));
      loadTestFile(require.resolve('../../apis/apm/suggestions'));
      loadTestFile(require.resolve('../../apis/apm/throughput'));
      loadTestFile(require.resolve('../../apis/apm/time_range_metadata'));
      loadTestFile(require.resolve('../../apis/apm/traces'));
      loadTestFile(require.resolve('../../apis/apm/transactions'));
    });
  });
}
