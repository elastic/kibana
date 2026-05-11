/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PublicStepDefinition } from '@kbn/workflows-extensions/public';
import { setAttackStatusStepCommonDefinition } from '../../../../common/workflows/step_types/set_attack_status_step/set_attack_status_step_common';

export const setAttackStatusStepDefinition: PublicStepDefinition = {
  ...setAttackStatusStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/flag')
      .then(({ icon }) => ({ default: icon }))
      .catch(() =>
        import('@elastic/eui/es/components/icon/assets/empty').then(({ icon }) => ({
          default: icon,
        }))
      )
  ),
};
