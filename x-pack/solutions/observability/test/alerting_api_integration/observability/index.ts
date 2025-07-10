/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('Observability Rules', () => {
    describe('Rules Endpoints', () => {
      loadTestFile(require.resolve('./metric_threshold_rule'));
      loadTestFile(require.resolve('./custom_threshold_rule_data_view'));
    });
  });
}
