/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('ResultsService', () => {
    loadTestFile(require.resolve('./get_anomalies_table_data'));
    loadTestFile(require.resolve('./get_categorizer_stats'));
    loadTestFile(require.resolve('./get_stopped_partitions'));
    loadTestFile(require.resolve('./get_category_definition'));
    loadTestFile(require.resolve('./get_category_examples'));
  });
}
