/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('Upgrade Assistant', () => {
    loadTestFile(require.resolve('./upgrade_assistant'));
    loadTestFile(require.resolve('./cloud_backup_status'));
    loadTestFile(require.resolve('./privileges'));
    loadTestFile(require.resolve('./es_deprecations'));
    loadTestFile(require.resolve('./es_deprecation_logs'));
    loadTestFile(require.resolve('./remote_clusters'));
    loadTestFile(require.resolve('./cluster_settings'));
  });
}
