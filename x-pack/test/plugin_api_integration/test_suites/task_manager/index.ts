/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('task_manager', function taskManagerSuite() {
    this.tags('ciGroup12');
    loadTestFile(require.resolve('./health_route'));
    loadTestFile(require.resolve('./task_management'));
    loadTestFile(require.resolve('./task_management_scheduled_at'));
    loadTestFile(require.resolve('./task_management_removed_types'));

    loadTestFile(require.resolve('./migrations'));
  });
}
