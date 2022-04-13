/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('Dev Tools', function () {
    this.tags('ciGroup13');

    loadTestFile(require.resolve('./breadcrumbs'));
    loadTestFile(require.resolve('./feature_controls'));
    loadTestFile(require.resolve('./searchprofiler_editor'));
  });
}
