/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function securitySolutionApp({ loadTestFile }: FtrProviderContext) {
  describe('Security Solution functional tests', function () {
    this.tags(['ciGroup11']);

    loadTestFile(require.resolve('./alerts_compatibility'));
  });
}
