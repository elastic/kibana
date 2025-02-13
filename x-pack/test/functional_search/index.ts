/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable import/no-default-export */

import { FtrProviderContext } from './ftr_provider_context';

export default ({ loadTestFile }: FtrProviderContext): void => {
  describe('Search solution tests', function () {
    loadTestFile(require.resolve('./tests/search_overview'));
    loadTestFile(require.resolve('./tests/classic_navigation'));
    loadTestFile(require.resolve('./tests/solution_navigation'));
    loadTestFile(require.resolve('./tests/search_start'));
    loadTestFile(require.resolve('./tests/search_index_details'));
  });
};
