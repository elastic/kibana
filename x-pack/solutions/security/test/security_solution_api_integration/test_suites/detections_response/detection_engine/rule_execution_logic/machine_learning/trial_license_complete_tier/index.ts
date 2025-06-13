/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('Machine learning rule execution logic API', function () {
    loadTestFile(require.resolve('./machine_learning'));
    loadTestFile(require.resolve('./machine_learning_alert_suppression'));
    loadTestFile(require.resolve('./machine_learning_manual_run'));
  });
}
