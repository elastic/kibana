/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('Entity Analytics - Entity Store', function () {
    loadTestFile(require.resolve('./entities_list'));
    loadTestFile(require.resolve('./entity_store'));
    loadTestFile(require.resolve('./field_retention_operators'));
    loadTestFile(require.resolve('./entity_store_nondefault_spaces'));
  });
}
