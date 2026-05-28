/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PublicStepDefinition } from '@kbn/workflows-extensions/public';
import { assignAttackStepCommonDefinition } from '../../../../common/workflows/step_types/assign_attack_step/assign_attack_step_common';

export const assignAttackStepDefinition: PublicStepDefinition = {
  ...assignAttackStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/user')
      .then(({ icon }) => ({ default: icon }))
      .catch(() =>
        import('@elastic/eui/es/components/icon/assets/empty').then(({ icon }) => ({
          default: icon,
        }))
      )
  ),
};
