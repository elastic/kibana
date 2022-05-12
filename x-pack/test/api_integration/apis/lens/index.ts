/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function lensApiIntegrationTests({ loadTestFile }: FtrProviderContext) {
  describe('Lens', () => {
    loadTestFile(require.resolve('./existing_fields'));
    loadTestFile(require.resolve('./legacy_existing_fields'));
    loadTestFile(require.resolve('./field_stats'));
    loadTestFile(require.resolve('./telemetry'));
  });
}
