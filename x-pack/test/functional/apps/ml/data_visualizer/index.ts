/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('data visualizer', function () {
    this.tags(['skipFirefox']);

    loadTestFile(require.resolve('./index_data_visualizer'));
    loadTestFile(require.resolve('./file_data_visualizer'));
  });
}
