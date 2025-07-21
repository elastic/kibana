/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

export default function ({ loadTestFile }: DeploymentAgnosticFtrProviderContext) {
  describe('ElasticSearch query rule', () => {
    loadTestFile(require.resolve('./query_dsl'));
    loadTestFile(require.resolve('./query_dsl_with_group_by'));
    loadTestFile(require.resolve('./consumers_and_privileges'));
  });
}
