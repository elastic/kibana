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
import type { RulesGroupRendererDeps } from './rules_group_renderer';

export const registerRulesFlyoutGroupedAttachment = ({
  register,
  ...deps
}: RulesGroupRendererDeps & { register: RegisterFlyoutGroupedAttachment }): void => {
  register(
    FlyoutGroupedAttachments.RULES,
    [SecurityAgentBuilderAttachments.rule],
    lazy(async () => {
      const { createRulesGroupRenderer } = await import(
        /* webpackChunkName: "security_rules_grouped_attachment" */
        './rules_group_renderer'
      );
      return { default: createRulesGroupRenderer(deps) };
    })
  );
};
