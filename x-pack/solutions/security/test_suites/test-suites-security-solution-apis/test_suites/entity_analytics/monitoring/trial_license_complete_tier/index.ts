/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('Entity Analytics - Privilege Monitoring', function () {
    // The engine, schedule, sync and privileged users tests were removed with the privilege
    // monitoring task: they need the task to run. The routes they covered are removed later.
    loadTestFile(require.resolve('./engine_health'));
    loadTestFile(require.resolve('./search_indices'));
    loadTestFile(require.resolve('./privilege_monitoring_privileges_check'));
  });
}
