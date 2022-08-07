/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../services';

// eslint-disable-next-line import/no-default-export
export default function ({ loadTestFile }: FtrProviderContext) {
  describe('saved objects tagging API', function () {
    loadTestFile(require.resolve('./delete'));
    loadTestFile(require.resolve('./create'));
    loadTestFile(require.resolve('./update'));
    loadTestFile(require.resolve('./bulk_assign'));
    loadTestFile(require.resolve('./usage_collection'));
  });
}
