/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('Observability Infra', function () {
    //  TimeoutError: Waiting for element to be located By(css selector, [data-test-subj="infrastructure-alerts-and-rules"])
    this.tags(['failsOnMKI']);
    loadTestFile(require.resolve('./header_menu'));
    loadTestFile(require.resolve('./node_details'));
    loadTestFile(require.resolve('./hosts_page'));
    loadTestFile(require.resolve('./infra'));
  });
}
