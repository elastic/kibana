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
import type { IocsGroupRendererDeps } from './iocs_group_renderer';

export const registerIocsFlyoutGroupedAttachment = ({
  register,
  ...deps
}: IocsGroupRendererDeps & { register: RegisterFlyoutGroupedAttachment }): void => {
  register(
    FlyoutGroupedAttachments.IOCS,
    [SecurityAgentBuilderAttachments.investigationIocs],
    lazy(async () => {
      const { createIocsGroupRenderer } = await import(
        /* webpackChunkName: "security_iocs_grouped_attachment" */
        './iocs_group_renderer'
      );
      return { default: createIocsGroupRenderer(deps) };
    })
  );
};
