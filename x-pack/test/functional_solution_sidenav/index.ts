/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable import/no-default-export */

import { FtrProviderContext } from './ftr_provider_context';

export default ({ loadTestFile }: FtrProviderContext): void => {
  describe('Solution navigation smoke tests', function () {
    loadTestFile(require.resolve('./tests/observability_sidenav'));
    // loadTestFile(require.resolve('./tests/search_sidenav'));
    // loadTestFile(require.resolve('./tests/security_sidenav'));
  });
};
