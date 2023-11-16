/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('runtime_fields_crud', () => {
    loadTestFile(require.resolve('./create_runtime_field'));
    loadTestFile(require.resolve('./get_runtime_field'));
    loadTestFile(require.resolve('./delete_runtime_field'));
    loadTestFile(require.resolve('./put_runtime_field'));
    loadTestFile(require.resolve('./update_runtime_field'));
  });
}
