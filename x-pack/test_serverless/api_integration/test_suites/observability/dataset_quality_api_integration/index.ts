/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('Dataset Quality', function () {
    loadTestFile(require.resolve('./data_stream_details'));
    loadTestFile(require.resolve('./data_stream_settings'));
    loadTestFile(require.resolve('./degraded_field_values'));
    loadTestFile(require.resolve('./degraded_field_analyze'));
  });
}
