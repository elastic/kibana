/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('serverless common API', function () {
    loadTestFile(require.resolve('./encrypted_saved_objects'));
    loadTestFile(require.resolve('./security/anonymous'));
    loadTestFile(require.resolve('./security/api_keys'));
    loadTestFile(require.resolve('./security/authentication'));
    loadTestFile(require.resolve('./security/authentication_http'));
    loadTestFile(require.resolve('./security/authorization'));
    loadTestFile(require.resolve('./security/misc'));
    loadTestFile(require.resolve('./security/response_headers'));
    loadTestFile(require.resolve('./security/role_mappings'));
    loadTestFile(require.resolve('./security/sessions'));
    loadTestFile(require.resolve('./security/users'));
    loadTestFile(require.resolve('./security/user_profiles'));
    loadTestFile(require.resolve('./security/views'));
    loadTestFile(require.resolve('./spaces'));
    loadTestFile(require.resolve('./rollups'));
    loadTestFile(require.resolve('./scripted_fields'));
    loadTestFile(require.resolve('./index_management'));
    loadTestFile(require.resolve('./alerting'));
    loadTestFile(require.resolve('./ingest_pipelines'));
  });
}
