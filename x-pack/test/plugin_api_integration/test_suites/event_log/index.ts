/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('event_log', function taskManagerSuite() {
    this.tags('ciGroup2');
    loadTestFile(require.resolve('./public_api_integration'));
    loadTestFile(require.resolve('./service_api_integration'));
  });
}
