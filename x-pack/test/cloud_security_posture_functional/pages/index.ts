/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ loadTestFile }: FtrProviderContext) {
  describe('Cloud Security Posture', function () {
    loadTestFile(require.resolve('./findings_onboarding'));
    loadTestFile(require.resolve('./findings'));
    loadTestFile(require.resolve('./findings_alerts'));
    loadTestFile(require.resolve('./compliance_dashboard'));
    loadTestFile(require.resolve('./vulnerability_dashboard'));
    loadTestFile(require.resolve('./cis_integration'));
  });
}
