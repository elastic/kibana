/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

export default function ({ loadTestFile }: DeploymentAgnosticFtrProviderContext) {
  describe('Observability Alerting', () => {
    loadTestFile(require.resolve('./burn_rate_rule'));
    loadTestFile(require.resolve('./es_query_rule'));
    loadTestFile(require.resolve('./custom_threshold'));
  });
}
