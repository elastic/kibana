/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('Serverless Common UI - Examples', function () {
    this.tags('skipMKI');
    loadTestFile(require.resolve('./data_view_field_editor_example'));
    loadTestFile(require.resolve('./discover_customization_examples'));
    loadTestFile(require.resolve('./field_formats'));
    loadTestFile(require.resolve('./partial_results'));
    loadTestFile(require.resolve('./search'));
    loadTestFile(require.resolve('./search_examples'));
    loadTestFile(require.resolve('./unified_field_list_examples'));
  });
}
