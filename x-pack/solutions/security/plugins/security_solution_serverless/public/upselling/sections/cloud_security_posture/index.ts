/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';

export const CloudSecurityPostureIntegrationPliBlockLazy = lazy(() =>
  import('./cloud_security_posture_integration_pli_block').then(
    ({ CloudSecurityPostureIntegrationPliBlock }) => ({
      default: CloudSecurityPostureIntegrationPliBlock,
    })
  )
);
