/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('serverless common API', function () {
    this.tags(['esGate']);

    loadTestFile(require.resolve('./anonymous'));
    loadTestFile(require.resolve('./api_keys'));
    loadTestFile(require.resolve('./authentication'));
    loadTestFile(require.resolve('./authentication_http'));
    loadTestFile(require.resolve('./authorization'));
    loadTestFile(require.resolve('./encrypted_saved_objects'));
    loadTestFile(require.resolve('./misc'));
    loadTestFile(require.resolve('./response_headers'));
    loadTestFile(require.resolve('./role_mappings'));
    loadTestFile(require.resolve('./sessions'));
    loadTestFile(require.resolve('./users'));
    loadTestFile(require.resolve('./request_as_viewer'));
    loadTestFile(require.resolve('./user_profiles'));
    loadTestFile(require.resolve('./views'));
  });
}
