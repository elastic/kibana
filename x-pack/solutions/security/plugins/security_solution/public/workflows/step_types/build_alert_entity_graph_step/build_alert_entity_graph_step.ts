/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PublicStepDefinition } from '@kbn/workflows-extensions/public';
import { buildAlertEntityGraphStepCommonDefinition } from '../../../../common/workflows/step_types/build_alert_entity_graph_step/build_alert_entity_graph_step_common';

export const buildAlertEntityGraphStepDefinition: PublicStepDefinition = {
  ...buildAlertEntityGraphStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/link')
      .then(({ icon }) => ({ default: icon }))
      .catch(() =>
        import('@elastic/eui/es/components/icon/assets/search').then(({ icon }) => ({
          default: icon,
        }))
      )
  ),
};
