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
import type { TimelineGroupRendererDeps } from './timeline_group_renderer';

export const registerTimelineFlyoutGroupedAttachment = ({
  register,
  ...deps
}: TimelineGroupRendererDeps & { register: RegisterFlyoutGroupedAttachment }): void => {
  register(
    FlyoutGroupedAttachments.TIMELINE,
    [SecurityAgentBuilderAttachments.investigationTimeline],
    lazy(async () => {
      const { createTimelineGroupRenderer } = await import(
        /* webpackChunkName: "security_timeline_grouped_attachment" */
        './timeline_group_renderer'
      );
      return { default: createTimelineGroupRenderer(deps) };
    })
  );
};
