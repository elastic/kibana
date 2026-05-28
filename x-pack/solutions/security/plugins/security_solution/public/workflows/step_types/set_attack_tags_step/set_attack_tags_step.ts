/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PublicStepDefinition } from '@kbn/workflows-extensions/public';
import { setAttackTagsStepCommonDefinition } from '../../../../common/workflows/step_types/set_attack_tags_step/set_attack_tags_step_common';

export const setAttackTagsStepDefinition: PublicStepDefinition = {
  ...setAttackTagsStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/tag')
      .then(({ icon }) => ({ default: icon }))
      .catch(() =>
        import('@elastic/eui/es/components/icon/assets/empty').then(({ icon }) => ({
          default: icon,
        }))
      )
  ),
};
