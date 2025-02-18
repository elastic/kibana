/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ loadTestFile }: DeploymentAgnosticFtrProviderContext) {
  describe('diagnostics', () => {
    loadTestFile(require.resolve('./apm_events.spec.ts'));
    loadTestFile(require.resolve('./data_streams.spec.ts'));
    loadTestFile(require.resolve('./index_pattern_settings.spec.ts'));
    loadTestFile(require.resolve('./index_templates.spec.ts'));
    loadTestFile(require.resolve('./indices.spec.ts'));
    loadTestFile(require.resolve('./privileges.spec.ts'));
  });
}
