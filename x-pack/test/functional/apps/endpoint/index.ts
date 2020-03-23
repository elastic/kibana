/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FtrProviderContext } from '../../ftr_provider_context';
import { FakePackageRegistry } from '../../../epm_api_integration/apis/fake_registry';

export default function({ loadTestFile }: FtrProviderContext) {
  describe('endpoint', function() {
    const registry = new FakePackageRegistry();

    /**
     * The endpoint app depends on the ingest manager app. The ingest manager needs a package registry to install
     * the endpoint package. Before running any tests let's setup a fake package registry that will return the
     * package information.
     */
    before(() => {
      registry.start();
    });

    after(() => {
      registry.stop();
    });

    this.tags('ciGroup7');

    loadTestFile(require.resolve('./feature_controls'));
    loadTestFile(require.resolve('./landing_page'));
    loadTestFile(require.resolve('./header_nav'));
    loadTestFile(require.resolve('./host_list'));
    loadTestFile(require.resolve('./policy_list'));
    loadTestFile(require.resolve('./policy_details'));
    loadTestFile(require.resolve('./alerts'));
  });
}
