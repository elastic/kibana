/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../ftr_provider_context';

export default ({ loadTestFile }: FtrProviderContext) => {
  describe('Index Management', function () {
    loadTestFile(require.resolve('./component_templates'));
    loadTestFile(require.resolve('./create_enrich_policy'));
    loadTestFile(require.resolve('./data_streams'));
    loadTestFile(require.resolve('./enrich_policies'));
    loadTestFile(require.resolve('./index_templates'));
    loadTestFile(require.resolve('./indices'));
    loadTestFile(require.resolve('./index_detail'));
  });
};
