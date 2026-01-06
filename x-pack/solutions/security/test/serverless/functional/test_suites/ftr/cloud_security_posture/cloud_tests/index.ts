/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('cloud_security_posture', function () {
    this.tags(['cloud_security_posture_sanity_tests']);
    loadTestFile(require.resolve('./agentless_api_sanity'));
    loadTestFile(require.resolve('./benchmark_sanity'));
    loadTestFile(require.resolve('./findings_sanity'));
    loadTestFile(require.resolve('./dashboard_sanity'));
  });
}
