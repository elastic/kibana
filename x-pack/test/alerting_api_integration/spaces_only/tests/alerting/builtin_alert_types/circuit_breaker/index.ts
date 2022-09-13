/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function alertingCircuitBreakerTests({ loadTestFile }: FtrProviderContext) {
  describe('circuit_breakers', () => {
    /**
     * This tests the expected behavior for a rule type that hits the alert limit in a single execution.
     */
    loadTestFile(require.resolve('./alert_limit_services'));
    /**
     * This tests the expected behavior for the active and recovered alerts generated over
     * a sequence of rule executions that hit the alert limit.
     */
    loadTestFile(require.resolve('./index_threshold_max_alerts'));
  });
}
