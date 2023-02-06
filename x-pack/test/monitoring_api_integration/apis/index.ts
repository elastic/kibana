/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../api_integration/ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('Monitoring Endpoints', function () {
    loadTestFile(require.resolve('./apm'));
    loadTestFile(require.resolve('./beats'));
    loadTestFile(require.resolve('./elasticsearch'));
    loadTestFile(require.resolve('./enterprisesearch'));
  });
}
