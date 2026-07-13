/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createPublicStepDefinition } from '@kbn/workflows-extensions/public';
import { createRuleExceptionStepCommonDefinition } from '../../../../common/workflows/step_types/create_rule_exception_step/create_rule_exception_step_common';

export const createRuleExceptionStepDefinition = createPublicStepDefinition({
  ...createRuleExceptionStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/filter_exclude').then(({ icon }) => ({
      default: icon,
    }))
  ),
});
