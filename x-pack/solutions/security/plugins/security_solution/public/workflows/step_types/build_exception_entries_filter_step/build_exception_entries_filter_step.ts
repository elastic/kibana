/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createPublicStepDefinition } from '@kbn/workflows-extensions/public';
import { buildExceptionEntriesFilterStepCommonDefinition } from '../../../../common/workflows/step_types/build_exception_entries_filter_step/build_exception_entries_filter_step_common';

export const buildExceptionEntriesFilterStepDefinition = createPublicStepDefinition({
  ...buildExceptionEntriesFilterStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/filter_exclude').then(({ icon }) => ({
      default: icon,
    }))
  ),
});
