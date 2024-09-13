/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ loadTestFile }: FtrProviderContext) => {
  describe('Index Management app', function () {
    loadTestFile(require.resolve('./feature_controls'));
    loadTestFile(require.resolve('./home_page'));
    loadTestFile(require.resolve('./index_template_wizard'));
    loadTestFile(require.resolve('./index_details_page'));
    loadTestFile(require.resolve('./enrich_policies_tab'));
    loadTestFile(require.resolve('./create_enrich_policy'));
    loadTestFile(require.resolve('./data_streams_tab'));
  });
};
