/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('@ess @serverless SecuritySolution Saved Objects', () => {
    loadTestFile(require.resolve('./notes'));
    loadTestFile(require.resolve('./pinned_events'));
    loadTestFile(require.resolve('./timeline'));
  });
}
