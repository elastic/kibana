/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';

export default function ({ loadTestFile }: DeploymentAgnosticFtrProviderContext) {
  describe('Observability Agent', function () {
    loadTestFile(require.resolve('./tools/get_data_sources.spec.ts'));
    loadTestFile(require.resolve('./tools/search_knowledge_base.spec.ts'));
    loadTestFile(require.resolve('./tools/get_alerts.spec.ts'));
    loadTestFile(require.resolve('./tools/get_downstream_dependencies.spec.ts'));
  });
}
