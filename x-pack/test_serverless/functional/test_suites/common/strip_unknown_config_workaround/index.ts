/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  // this is a super smoke test just to validate that Kibana successfully starts even when
  // the configuration includes invalid config (excess config keys).
  // Use in combination of FTR configs that inject such excess keys.
  describe('Serverless Common UI - Strip Unknown Config Workaround', function () {
    this.tags(['skipMKI', 'esGate']);

    loadTestFile(require.resolve('./home_page'));
  });
}
