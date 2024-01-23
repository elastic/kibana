/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../common/ftr_provider_context';

export default ({ loadTestFile }: FtrProviderContext): void => {
  describe('X-Pack Accessibility Tests - Group 3', function () {
    loadTestFile(require.resolve('./upgrade_assistant'));
    loadTestFile(require.resolve('./canvas'));
    loadTestFile(require.resolve('./maps'));
    loadTestFile(require.resolve('./graph'));
    loadTestFile(require.resolve('./security_solution'));
    loadTestFile(require.resolve('./ml_embeddables_in_dashboard'));
    loadTestFile(require.resolve('./rules_connectors'));
    // Please make sure that the remote clusters, snapshot and restore and
    // CCR tests stay in that order. Their execution fails if rearranged.
    loadTestFile(require.resolve('./remote_clusters'));
    loadTestFile(require.resolve('./snapshot_and_restore'));
    loadTestFile(require.resolve('./cross_cluster_replication'));
    loadTestFile(require.resolve('./reporting'));
    loadTestFile(require.resolve('./enterprise_search'));

    // loadTestFile(require.resolve('./license_management'));
    // loadTestFile(require.resolve('./tags'));
    // loadTestFile(require.resolve('./search_sessions'));
    // loadTestFile(require.resolve('./stack_monitoring'));
    // loadTestFile(require.resolve('./watcher'));
    // loadTestFile(require.resolve('./rollup_jobs'));
    // loadTestFile(require.resolve('./observability'));
  });
};
