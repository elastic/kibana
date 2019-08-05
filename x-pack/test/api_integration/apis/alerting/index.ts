/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function alertingTests({ loadTestFile }: FtrProviderContext) {
  describe('Alerting', () => {
    loadTestFile(require.resolve('./create'));
    loadTestFile(require.resolve('./delete'));
    loadTestFile(require.resolve('./disable'));
    loadTestFile(require.resolve('./enable'));
    loadTestFile(require.resolve('./find'));
    loadTestFile(require.resolve('./get'));
    loadTestFile(require.resolve('./list_alert_types'));
    loadTestFile(require.resolve('./update'));
    loadTestFile(require.resolve('./alerts'));
  });
}
