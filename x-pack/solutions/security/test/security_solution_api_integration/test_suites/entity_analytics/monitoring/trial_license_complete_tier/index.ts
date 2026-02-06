/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('Entity Analytics - Privilege Monitoring', function () {
    loadTestFile(require.resolve('./monitoring_entity_source_crud'));
    // Split engine tests into separate files for better isolation and reduced flakiness
    loadTestFile(require.resolve('./engine_health'));
    loadTestFile(require.resolve('./engine_init'));
    loadTestFile(require.resolve('./engine_workflow'));
    loadTestFile(require.resolve('./engine_schedule'));
    loadTestFile(require.resolve('./engine_plain_index_sync'));
    loadTestFile(require.resolve('./engine_integrations_sync'));
    loadTestFile(require.resolve('./engine_default_sources'));
    loadTestFile(require.resolve('./search_indices'));
    loadTestFile(require.resolve('./privilege_monitoring_privileges_check'));
    loadTestFile(require.resolve('./privileged_users/api'));
    loadTestFile(require.resolve('./privileged_users/task'));
    loadTestFile(require.resolve('./privileged_users/migrations'));
    loadTestFile(require.resolve('./privileged_users/cross_source_sync'));
  });
}
