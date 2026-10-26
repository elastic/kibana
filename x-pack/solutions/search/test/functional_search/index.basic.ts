/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable import/no-default-export */

import type { FtrProviderContext } from './ftr_provider_context';

export default ({ loadTestFile }: FtrProviderContext): void => {
  describe('Search solution basic license tests', function () {
    // Copies of nav tests for basic license until we can run a single suite with multiple licenses
    // currently we hide nav items when on basic license, we can test this in a single suite when we
    // we update to show nav items on basic license
    loadTestFile(require.resolve('./tests/classic_navigation.basic'));
    loadTestFile(require.resolve('./tests/solution_navigation.basic'));
  });
};
