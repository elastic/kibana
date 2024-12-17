/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ loadTestFile }: DeploymentAgnosticFtrProviderContext) {
  describe('Services', () => {
    loadTestFile(require.resolve('./error_groups/error_groups_detailed_statistics.spec.ts'));
    loadTestFile(require.resolve('./error_groups/error_groups_main_statistics.spec.ts'));
    loadTestFile(require.resolve('./service_details/service_details.spec.ts'));
    loadTestFile(require.resolve('./service_icons/service_icons.spec.ts'));
    loadTestFile(require.resolve('./agent.spec.ts'));
    loadTestFile(require.resolve('./archive_services_detailed_statistics.spec.ts'));
    loadTestFile(require.resolve('./derived_annotations.spec.ts'));
    loadTestFile(require.resolve('./get_service_node_metadata.spec.ts'));
    loadTestFile(require.resolve('./service_alerts.spec.ts'));
    loadTestFile(require.resolve('./services_detailed_statistics.spec.ts'));
    loadTestFile(require.resolve('./top_services.spec.ts'));
    loadTestFile(require.resolve('./transaction_types.spec.ts'));
  });
}
