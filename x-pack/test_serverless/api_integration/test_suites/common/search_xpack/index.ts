/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  // TODO: This `search` folder was renamed to `search_xpack` to
  // differentiate it from the oss `search` folder (now `search_oss`)
  describe('search', function () {
    this.tags(['esGate']);

    loadTestFile(require.resolve('./search'));
    // TODO: Removed `session` since search
    // sessions are not supported in Serverless
  });
}
