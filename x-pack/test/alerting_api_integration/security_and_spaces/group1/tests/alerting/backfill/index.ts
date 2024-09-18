/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function backfillTests({ loadTestFile }: FtrProviderContext) {
  describe('backfill rule runs', () => {
    loadTestFile(require.resolve('./api_key'));
    loadTestFile(require.resolve('./schedule'));
    loadTestFile(require.resolve('./get'));
    loadTestFile(require.resolve('./find'));
    loadTestFile(require.resolve('./delete'));
    loadTestFile(require.resolve('./delete_rule'));
    loadTestFile(require.resolve('./task_runner'));
  });
}
