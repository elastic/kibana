/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createPublicStepDefinition } from '@kbn/workflows-extensions/public';
import { createExceptionListItemStepCommonDefinition } from '../../../../common/workflows/step_types/create_exception_list_item_step/create_exception_list_item_step_common';

export const createExceptionListItemStepDefinition = createPublicStepDefinition({
  ...createExceptionListItemStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/list_check').then(({ icon }) => ({
      default: icon,
    }))
  ),
});
