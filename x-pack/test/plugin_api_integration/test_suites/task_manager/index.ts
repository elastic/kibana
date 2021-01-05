/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('task_manager', function taskManagerSuite() {
    this.tags('ciGroup2');
    loadTestFile(require.resolve('./health_route'));
    loadTestFile(require.resolve('./task_management'));
    loadTestFile(require.resolve('./task_management_removed_types'));
  });
}
