/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AIOPS_ENABLED } from '@kbn/aiops-plugin/common';

import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('AIOps', function () {
    this.tags(['aiops']);

    if (AIOPS_ENABLED) {
      loadTestFile(require.resolve('./explain_log_rate_spikes'));
    }
  });
}
