/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('@ess @serverless SecuritySolution Automatic Dashboard Migrations', () => {
    loadTestFile(require.resolve('./create'));
    loadTestFile(require.resolve('./stats'));
    loadTestFile(require.resolve('./get'));
    loadTestFile(require.resolve('./update'));
    loadTestFile(require.resolve('./delete'));
    loadTestFile(require.resolve('./dashboards/create'));
    loadTestFile(require.resolve('./resources/missing'));
    loadTestFile(require.resolve('./resources/upsert'));
    loadTestFile(require.resolve('./resources/get'));
    loadTestFile(require.resolve('./dashboards/get'));
    loadTestFile(require.resolve('./stats_all'));
    loadTestFile(require.resolve('./translation_stats'));
  });
}
