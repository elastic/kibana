/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrProviderContext } from '../../../../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('Rule exception workflow APIs Authentication - Complete Tier', function () {
    loadTestFile(require.resolve('./tier_1_analyst'));
    loadTestFile(require.resolve('./tier_2_analyst'));
    loadTestFile(require.resolve('./threat_intel_analyst'));
    loadTestFile(require.resolve('./tier_3_analyst'));
    loadTestFile(require.resolve('./viewer'));
    loadTestFile(require.resolve('./rule_author'));
    loadTestFile(require.resolve('./soc_manager'));
    loadTestFile(require.resolve('./endpoint_operations_analyst'));
    loadTestFile(require.resolve('./endpoint_policy_manager'));
    loadTestFile(require.resolve('./platform_engineer'));
    loadTestFile(require.resolve('./editor'));
    loadTestFile(require.resolve('./admin'));
  });
}
