/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PublicStepDefinition } from '@kbn/workflows-extensions/public';
import { getRelatedAlertsStepCommonDefinition } from '../../../../common/workflows/step_types/get_related_alerts_step/get_related_alerts_step_common';

export const getRelatedAlertsStepDefinition: PublicStepDefinition = {
  ...getRelatedAlertsStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/share')
      .then(({ icon }) => ({ default: icon }))
      .catch(() =>
        import('@elastic/eui/es/components/icon/assets/search').then(({ icon }) => ({
          default: icon,
        }))
      )
  ),
};
