/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PublicStepDefinition } from '@kbn/workflows-extensions/public';
import { renderAlertNarrativeStepCommonDefinition } from '../../../../common/workflows/step_types/render_alert_narrative_step/render_alert_narrative_step_common';

export const renderAlertNarrativeStepDefinition: PublicStepDefinition = {
  ...renderAlertNarrativeStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/timeslider')
      .then(({ icon }) => ({ default: icon }))
      .catch(() =>
        import('@elastic/eui/es/components/icon/assets/documents').then(({ icon }) => ({
          default: icon,
        }))
      )
  ),
};
