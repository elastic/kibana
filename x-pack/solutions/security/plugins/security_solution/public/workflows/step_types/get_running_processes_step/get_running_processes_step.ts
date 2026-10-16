/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createPublicStepDefinition } from '@kbn/workflows-extensions/public';
import { getRunningProcessesStepCommonDefinition } from '../../../../common/workflows/step_types/get_running_processes_step/get_running_processes_step_common';

export const getRunningProcessesStepDefinition = createPublicStepDefinition({
  ...getRunningProcessesStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/list_bullet').then(({ icon }) => ({
      default: icon,
    }))
  ),
});
