/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FtrProviderContext } from '../../../../ftr_provider_context_edr_workflows';

export default function endpointAPIIntegrationTests({ loadTestFile }: FtrProviderContext) {
  // FLAKY: https://github.com/elastic/kibana/issues/250957
  describe.skip('Endpoint related user role migrations, feature deprecations', function () {
    loadTestFile(require.resolve('./siem_artifact_api_actions'));
    loadTestFile(require.resolve('./siem_artifact_sub_privileges'));
  });
}
