/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../common/ftr_provider_context';

export default ({ loadTestFile }: FtrProviderContext): void => {
  describe('X-Pack Accessibility Tests - Group 2', function () {
    loadTestFile(require.resolve('./ml'));
    loadTestFile(require.resolve('./ml_anomaly_detection'));
    loadTestFile(require.resolve('./transform'));
    loadTestFile(require.resolve('./lens'));
    loadTestFile(require.resolve('./ml_trained_models'));
  });
};
