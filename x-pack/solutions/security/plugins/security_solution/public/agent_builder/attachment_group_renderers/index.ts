/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ISearchStart } from '@kbn/data-plugin/public';
import { registerAttachmentGroupRenderer } from '@kbn/agentic-investigations-common';
import { DEFAULT_ALERTS_INDEX } from '../../../common/constants';
import type { SecurityCanvasEmbeddedBundle } from '../components/security_redux_embedded_provider';

/**
 * Registers the alert group renderer for the Attachments tab.
 * Must be called from plugin `start()` after all dependencies are available.
 * The renderer is registered as a `React.lazy` component so the domain code
 * stays out of the page-load bundle.
 */
export const registerAlertAttachmentGroupRenderer = ({
  resolveSecurityCanvasContext,
  search,
  spaceId,
}: {
  resolveSecurityCanvasContext: () => Promise<SecurityCanvasEmbeddedBundle>;
  search: ISearchStart;
  spaceId: string;
}): void => {
  const alertsIndex = `${DEFAULT_ALERTS_INDEX}-${spaceId}`;

  const LazyAlertGroupRenderer = React.lazy(async () => {
    const { createAlertGroupRenderer } = await import(
      /* webpackChunkName: "security_alert_group_renderer" */
      './alert_group_renderer'
    );
    return { default: createAlertGroupRenderer(resolveSecurityCanvasContext, search, alertsIndex) };
  });

  registerAttachmentGroupRenderer('alert', LazyAlertGroupRenderer);
};

/**
 * Registers the rule group renderer for the Attachments tab.
 * Must be called from plugin `start()` after all dependencies are available.
 */
export const registerRuleAttachmentGroupRenderer = ({
  resolveSecurityCanvasContext,
}: {
  resolveSecurityCanvasContext: () => Promise<SecurityCanvasEmbeddedBundle>;
}): void => {
  const LazyRuleGroupRenderer = React.lazy(async () => {
    const { createRuleGroupRenderer } = await import(
      /* webpackChunkName: "security_rule_group_renderer" */
      './rule_group_renderer'
    );
    return { default: createRuleGroupRenderer(resolveSecurityCanvasContext) };
  });

  registerAttachmentGroupRenderer('rule', LazyRuleGroupRenderer);
};
