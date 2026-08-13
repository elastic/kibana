/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NodeDefinition } from '@kbn/core-chrome-browser';
import { SecurityPageName } from '../constants';
import { pndLink } from '../links';

/**
 * Solution navigation for the PND app, shared by ESS and serverless so the two cannot drift.
 *
 * Nodes are omitted from the rendered tree when `xpack.pnd.enabled` is false, because the deep links
 * they reference are only registered by the PND plugin when it is enabled.
 */

/**
 * The PND nodes that sit directly in the solution navigation body, in display order.
 *
 * Returned as a list rather than a single node because PND contributes several top-level entries that
 * interleave with platform ones (Discover sits between Chats and Alerts).
 */
export const createPndNavigationTree = (): NodeDefinition[] => [
  {
    link: pndLink(),
    icon: 'sparkles',
  },
  {
    link: pndLink(SecurityPageName.pndChats),
    icon: 'comment',
  },
];

/** PND nodes that follow the platform Discover / Dashboards entries. */
export const createPndSecondaryNavigationTree = (): NodeDefinition[] => [
  {
    link: pndLink(SecurityPageName.alerts),
    icon: 'bell',
  },
  {
    link: pndLink(SecurityPageName.attacks),
    icon: 'warning',
  },
  {
    // Kept a flat entry on purpose: the per-watch, Workers and Skills links are registered as deep
    // links so they stay searchable, but they are not children here — the chrome sub-panel is not the
    // navigation we want for them. The in-page subnav owns that, including the per-watch accent dots
    // that `NodeDefinition` cannot express.
    link: pndLink(SecurityPageName.pndWatches),
    icon: 'eye',
  },
  {
    link: pndLink(SecurityPageName.pndRecords),
    icon: 'documents',
  },
  {
    link: pndLink(SecurityPageName.pndThreatHunt),
    icon: 'inspect',
  },
  {
    link: pndLink(SecurityPageName.pndStreams),
    icon: 'aggregate',
  },
];
