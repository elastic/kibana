/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  // TODO: This `search` folder was renamed to `search_oss` to
  // differentiate it from the x-pack `search` folder (now `search_xpack`)
  describe('search', function () {
    this.tags(['esGate']);

    loadTestFile(require.resolve('./search'));
    // TODO: Removed `sql_search` since
    // SQL is not supported in Serverless
    loadTestFile(require.resolve('./bsearch'));
  });
}
