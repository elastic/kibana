/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

export default function ({ loadTestFile }: DeploymentAgnosticFtrProviderContext) {
  describe('Onboarding', () => {
    loadTestFile(require.resolve('./create_logs_onboarding_flow'));
    loadTestFile(require.resolve('./get_elastic_agent_config'));
    loadTestFile(require.resolve('./get_progress'));
    loadTestFile(require.resolve('./update_progress'));
    loadTestFile(require.resolve('./get_privileges'));
  });
}
