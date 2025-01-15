/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('trained models', function () {
    loadTestFile(require.resolve('./trained_models_list'));
    loadTestFile(require.resolve('./get_models'));
    loadTestFile(require.resolve('./get_model_stats'));
    loadTestFile(require.resolve('./get_model_pipelines'));
    loadTestFile(require.resolve('./delete_model'));
    loadTestFile(require.resolve('./put_model'));
    loadTestFile(require.resolve('./start_stop_deployment'));
    loadTestFile(require.resolve('./model_downloads'));
  });
}
