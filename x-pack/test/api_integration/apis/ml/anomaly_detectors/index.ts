/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('anomaly detectors', function () {
    loadTestFile(require.resolve('./create'));
    loadTestFile(require.resolve('./get'));
    loadTestFile(require.resolve('./get_with_spaces'));
    loadTestFile(require.resolve('./get_stats_with_spaces'));
    loadTestFile(require.resolve('./open_with_spaces'));
    loadTestFile(require.resolve('./close_with_spaces'));
    loadTestFile(require.resolve('./delete_with_spaces'));
    loadTestFile(require.resolve('./create_with_spaces'));
    loadTestFile(require.resolve('./forecast_with_spaces'));
  });
}
