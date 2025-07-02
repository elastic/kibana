/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createStatefulTestConfig } from '@kbn/test-suites-xpack/api_integration/deployment_agnostic/default_configs/stateful.config.base';
import { services } from '../../services';
import type { ObltDeploymentAgnosticCommonServices } from '../../services';

export default createStatefulTestConfig<ObltDeploymentAgnosticCommonServices>({
  testFiles: [require.resolve('./oblt.index.ts')],
  services,
  junit: {
    reportName: 'Stateful Observability - Deployment-agnostic API Integration Tests',
  },
});
