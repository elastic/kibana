/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../../../../ftr_provider_context';

export default ({ loadTestFile }: FtrProviderContext): void => {
  describe('Exception Items - Utility Endpoints - RBAC - Serverless', function () {
    loadTestFile(require.resolve('./t1_analyst'));
    loadTestFile(require.resolve('./t2_analyst'));
    loadTestFile(require.resolve('./t3_analyst'));
    loadTestFile(require.resolve('./threat_intelligence_analyst'));
    loadTestFile(require.resolve('./viewer'));
    loadTestFile(require.resolve('./editor'));
    loadTestFile(require.resolve('./endpoint_operations_analyst'));
    loadTestFile(require.resolve('./endpoint_policy_manager'));
    loadTestFile(require.resolve('./platform_engineer'));
    loadTestFile(require.resolve('./soc_manager'));
  });
};
