/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createPublicStepDefinition } from '@kbn/workflows-extensions/public';
import { introspectLogsCommonDefinition } from '../../common/step_types/introspect_logs';

export const introspectLogsStepDefinition = createPublicStepDefinition({
  ...introspectLogsCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/inspect').then(({ icon }) => ({
      default: icon,
    }))
  ),
});
