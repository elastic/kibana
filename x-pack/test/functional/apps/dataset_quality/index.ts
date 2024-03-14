/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DatasetQualityFtrProviderContext } from './config';

export default function ({ loadTestFile }: DatasetQualityFtrProviderContext) {
  describe('Dataset Quality', function () {
    loadTestFile(require.resolve('./home'));
    loadTestFile(require.resolve('./dataset_quality_summary'));
    loadTestFile(require.resolve('./dataset_quality_table'));
    loadTestFile(require.resolve('./dataset_quality_table_filters'));
    loadTestFile(require.resolve('./dataset_quality_flyout'));
  });
}
