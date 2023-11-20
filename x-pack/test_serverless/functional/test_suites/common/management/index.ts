/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default ({ loadTestFile }: FtrProviderContext) => {
  describe('Serverless Common UI - Management', function () {
    loadTestFile(require.resolve('./index_management/index_templates'));
    loadTestFile(require.resolve('./index_management/indices'));
    loadTestFile(require.resolve('./index_management/create_enrich_policy'));
    loadTestFile(require.resolve('./transforms/search_bar_features'));
    loadTestFile(require.resolve('./transforms/transform_list'));
    loadTestFile(require.resolve('./advanced_settings'));
    loadTestFile(require.resolve('./data_views'));
    loadTestFile(require.resolve('./disabled_uis'));
  });
};
