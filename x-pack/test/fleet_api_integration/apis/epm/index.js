/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setupTestUsers } from '../test_users';

export default function loadTests({ loadTestFile, getService }) {
  describe('EPM Endpoints', () => {
    before(async () => {
      await setupTestUsers(getService('security'));
    });
    loadTestFile(require.resolve('./test_upgrade_tsdb'));
    loadTestFile(require.resolve('./delete'));
    loadTestFile(require.resolve('./list'));
    loadTestFile(require.resolve('./setup'));
    loadTestFile(require.resolve('./get'));
    loadTestFile(require.resolve('./file'));
    loadTestFile(require.resolve('./template'));
    loadTestFile(require.resolve('./ilm'));
    loadTestFile(require.resolve('./install_bundled'));
    loadTestFile(require.resolve('./install_by_upload'));
    loadTestFile(require.resolve('./install_custom'));
    loadTestFile(require.resolve('./install_endpoint'));
    loadTestFile(require.resolve('./install_overrides'));
    loadTestFile(require.resolve('./install_prerelease'));
    loadTestFile(require.resolve('./install_remove_assets'));
    loadTestFile(require.resolve('./install_remove_kbn_assets_in_space'));
    loadTestFile(require.resolve('./install_remove_multiple'));
    loadTestFile(require.resolve('./install_update'));
    loadTestFile(require.resolve('./install_tsds_disable'));
    loadTestFile(require.resolve('./install_tag_assets'));
    loadTestFile(require.resolve('./bulk_upgrade'));
    loadTestFile(require.resolve('./bulk_install'));
    loadTestFile(require.resolve('./update_assets'));
    loadTestFile(require.resolve('./data_stream'));
    loadTestFile(require.resolve('./package_install_complete'));
    loadTestFile(require.resolve('./remove_legacy_templates'));
    loadTestFile(require.resolve('./install_error_rollback'));
    loadTestFile(require.resolve('./final_pipeline'));
    loadTestFile(require.resolve('./custom_ingest_pipeline'));
    loadTestFile(require.resolve('./verification_key_id'));
    loadTestFile(require.resolve('./install_integration_in_multiple_spaces.ts'));
    loadTestFile(require.resolve('./install_hidden_datastreams'));
    loadTestFile(require.resolve('./bulk_get_assets'));
    loadTestFile(require.resolve('./install_dynamic_template_metric'));
    loadTestFile(require.resolve('./routing_rules'));
    loadTestFile(require.resolve('./install_runtime_field'));
    loadTestFile(require.resolve('./get_templates_inputs'));
    loadTestFile(require.resolve('./data_views'));
  });
}
