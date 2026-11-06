/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { FlyoutGroupedAttachments } from '@kbn/agentic-investigations-common';
import type { RegisterFlyoutGroupedAttachment } from '@kbn/agentic-investigations-common';
import { SecurityAgentBuilderAttachments } from '../../../../common/constants';
import type { AlertsGroupRendererDeps } from './alerts_group_renderer';

export const registerAlertsFlyoutGroupedAttachment = ({
  register,
  ...deps
}: AlertsGroupRendererDeps & { register: RegisterFlyoutGroupedAttachment }): void => {
  register(
    FlyoutGroupedAttachments.ALERTS,
    [SecurityAgentBuilderAttachments.alert, SecurityAgentBuilderAttachments.alerts],
    lazy(async () => {
      const { createAlertsGroupRenderer } = await import(
        /* webpackChunkName: "security_alerts_grouped_attachment" */
        './alerts_group_renderer'
      );
      return { default: createAlertsGroupRenderer(deps) };
    })
  );
};
