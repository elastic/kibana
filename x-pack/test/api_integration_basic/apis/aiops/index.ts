/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('aiops basic license', function () {
    this.tags(['aiops']);

    // The aiops API should return forbidden when called without a trial/platinum license.
    loadTestFile(require.resolve('./permissions'));
  });
}
