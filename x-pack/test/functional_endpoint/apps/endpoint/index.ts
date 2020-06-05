/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('endpoint', function () {
    this.tags('ciGroup7');

    // TODO: Delete
    //       We are under SIEM now, so I don't think we need these Feature control tests
    // loadTestFile(require.resolve('./feature_controls'));

    // TODO: Delete
    //       No more Endpoint app, so no more landing page or header nav
    // loadTestFile(require.resolve('./landing_page'));
    // loadTestFile(require.resolve('./header_nav'));

    // loadTestFile(require.resolve('./host_list'));
    loadTestFile(require.resolve('./policy_list'));

    // loadTestFile(require.resolve('./alerts'));

    // loadTestFile(require.resolve('./resolver'));
  });
}
