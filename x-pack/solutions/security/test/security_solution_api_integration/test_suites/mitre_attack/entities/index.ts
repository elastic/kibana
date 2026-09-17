/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('Managed MITRE ATT&CK API', () => {
    // population.ts runs first so it operates against the real artifact data.
    // get_entities.ts runs after and manages its own before/after fixture lifecycle.
    loadTestFile(require.resolve('./population'));
    loadTestFile(require.resolve('./get_entities'));
  });
}
