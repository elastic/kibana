/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('Detection Engine Basic and Essentials API', function () {
    loadTestFile(require.resolve('./create_rules'));
    loadTestFile(require.resolve('./create_ml_rules'));
    loadTestFile(require.resolve('./open_close_alerts'));
    loadTestFile(require.resolve('./query_alerts'));
    loadTestFile(require.resolve('./query_alerts_backword_compatibility'));
  });
}
