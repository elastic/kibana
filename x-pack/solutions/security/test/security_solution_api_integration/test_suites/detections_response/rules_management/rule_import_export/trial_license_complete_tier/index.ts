/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('Rules Management - Rule import export API', function () {
    loadTestFile(require.resolve('./export_rules'));
    loadTestFile(require.resolve('./export_rules_ess'));
    loadTestFile(require.resolve('./import_export_rules'));
    loadTestFile(require.resolve('./import_rules'));
    loadTestFile(require.resolve('./import_rules_with_exceptions'));
    loadTestFile(require.resolve('./import_rules_with_actions'));
    loadTestFile(require.resolve('./import_rules_with_overwrite'));
    loadTestFile(require.resolve('./import_rules_conflicts'));
    loadTestFile(require.resolve('./import_rules_response_actions'));
    loadTestFile(require.resolve('./import_rules_ess'));
    loadTestFile(require.resolve('./import_connectors'));
    loadTestFile(require.resolve('./import_rules_at_batch_boundary'));
    loadTestFile(require.resolve('./import_rules_overwrite_at_batch_boundary'));
    loadTestFile(require.resolve('./import_rules_concurrent'));
    loadTestFile(require.resolve('./import_rules_by_type'));
    loadTestFile(require.resolve('./import_rules_identity'));
  });
}
