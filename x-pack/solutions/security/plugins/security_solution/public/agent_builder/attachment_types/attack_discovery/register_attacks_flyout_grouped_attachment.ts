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
import type { AttacksGroupRendererDeps } from './attacks_group_renderer';

export const registerAttacksFlyoutGroupedAttachment = ({
  register,
  ...deps
}: AttacksGroupRendererDeps & { register: RegisterFlyoutGroupedAttachment }): void => {
  register(
    FlyoutGroupedAttachments.ATTACKS,
    [SecurityAgentBuilderAttachments.attackDiscovery],
    lazy(async () => {
      const { createAttacksGroupRenderer } = await import(
        /* webpackChunkName: "security_attacks_grouped_attachment" */
        './attacks_group_renderer'
      );
      return { default: createAttacksGroupRenderer(deps) };
    })
  );
};
