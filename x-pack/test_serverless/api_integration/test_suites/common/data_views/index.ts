/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('index_patterns', function () {
    this.tags(['esGate']);

    loadTestFile(require.resolve('./es_errors'));
    loadTestFile(require.resolve('./existing_indices_route'));
    loadTestFile(require.resolve('./fields_for_wildcard_route'));
    loadTestFile(require.resolve('./data_views_crud'));
    // TODO: Removed `scripted_fields_crud` since
    // scripted fields are not supported in Serverless
    loadTestFile(require.resolve('./fields_api'));
    loadTestFile(require.resolve('./default_index_pattern'));
    loadTestFile(require.resolve('./runtime_fields_crud'));
    loadTestFile(require.resolve('./integration'));
    // TODO: Removed `deprecations` since
    // scripted fields are not supported in Serverless
    loadTestFile(require.resolve('./has_user_index_pattern'));
    loadTestFile(require.resolve('./swap_references'));
  });
}
