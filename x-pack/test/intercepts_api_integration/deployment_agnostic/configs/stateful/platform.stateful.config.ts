/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createStatefulTestConfig } from '../../../../api_integration/deployment_agnostic/default_configs/stateful.config.base';
import { services } from '../../../services';

export default createStatefulTestConfig({
  testFiles: [require.resolve('./platform.index.ts')],
  services,
  junit: {
    reportName: 'Stateful - Intercepts Deployment-agnostic API Integration Tests',
  },
});
