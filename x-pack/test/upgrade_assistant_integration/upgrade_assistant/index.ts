/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('upgrade assistant', function () {
    // FAILING VERSION BUMP: https://github.com/elastic/kibana/issues/209048
    // loadTestFile(require.resolve('./reindexing'));
    loadTestFile(require.resolve('./api_deprecations'));
  });
}
