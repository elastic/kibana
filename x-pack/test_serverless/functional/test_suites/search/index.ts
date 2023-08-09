/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('serverless search UI', function () {
    loadTestFile(require.resolve('./landing_page'));
    loadTestFile(require.resolve('./empty_page'));
    loadTestFile(require.resolve('./navigation'));
    loadTestFile(require.resolve('./cases/attachment_framework'));
    loadTestFile(require.resolve('./examples/data_view_field_editor_example'));
    loadTestFile(require.resolve('./examples/discover_customization_examples'));
    loadTestFile(require.resolve('./examples/field_formats'));
    loadTestFile(require.resolve('./examples/partial_results'));
    loadTestFile(require.resolve('./examples/search'));
    loadTestFile(require.resolve('./examples/search_examples'));
    loadTestFile(require.resolve('./examples/unified_field_list_examples'));
  });
}
