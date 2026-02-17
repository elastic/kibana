/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FtrProviderContext } from '../../../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('@ess @serverless SecuritySolution Automatic Rule Migrations', () => {
    loadTestFile(require.resolve('./create'));
    loadTestFile(require.resolve('./get'));
    loadTestFile(require.resolve('./update'));
    loadTestFile(require.resolve('./delete'));
    loadTestFile(require.resolve('./get_prebuilt_rules'));
    loadTestFile(require.resolve('./install'));
    loadTestFile(require.resolve('./stats'));
    loadTestFile(require.resolve('./start'));
    loadTestFile(require.resolve('./stop'));
    loadTestFile(require.resolve('./get_integrations'));
    loadTestFile(require.resolve('./integrations_stats'));
    loadTestFile(require.resolve('./rules/create'));
    loadTestFile(require.resolve('./rules/get'));
    loadTestFile(require.resolve('./rules/update'));
    loadTestFile(require.resolve('./rules/enhance'));
    loadTestFile(require.resolve('./rules/qradar_create'));
  });
}
