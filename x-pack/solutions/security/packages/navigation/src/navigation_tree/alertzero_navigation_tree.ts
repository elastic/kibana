/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NodeDefinition } from '@kbn/core-chrome-browser';
import { ALERTZERO_APP_ID, SecurityPageName } from '../constants';
import { i18nStrings } from '../i18n_strings';
import { alertZeroLink } from '../links';

/**
 * Solution navigation for the AlertZero app, shared by ESS and serverless so the two cannot drift.
 *
 * Nodes are omitted from the rendered tree when the `securitySolution:enableAlertZero` advanced setting is
 * off (or the `xpack.alertzero.enabled` deployment kill switch is off): the AlertZero app is then either
 * unregistered or `AppStatus.inaccessible`, and core drops the deep links these nodes reference.
 */

/**
 * The AlertZero nodes that open the solution navigation body, in display order.
 *
 * Returned as a list rather than a single node because AlertZero contributes several top-level entries that
 * interleave with platform ones (Agents sits between this group and Watches when Agents is on).
 */
export const createAlertZeroNavigationTree = (): NodeDefinition[] => [
  {
    link: alertZeroLink(),
    // Note the sidebar sentence-cases every label, so "AlertZero" is also registered in the `@kbn/shared-ux-label-formatter` title case glossary.
    title: i18nStrings.alertZero.title,
    icon: 'sun',
  },
  {
    link: alertZeroLink(SecurityPageName.alertZeroEscalations),
    icon: 'flag',
  },
];

/** AlertZero nodes that follow the Agents entry, or the Escalations entry without Agents. */
export const createAlertZeroSecondaryNavigationTree = (): NodeDefinition[] => [
  {
    // Kept a flat entry on purpose: the per-watch, Workers and Skills links are registered as deep
    // links so they stay searchable, but they are not children here — the chrome sub-panel is not the
    // navigation we want for them. The in-page subnav owns that, including the per-watch accent dots
    // that `NodeDefinition` cannot express.
    link: alertZeroLink(SecurityPageName.alertZeroWatches),
    icon: 'eye',
  },
];

/**
 * Whether the AlertZero entries are shown in the solution navigation. The `securitySolution:enableAlertZero`
 * setting alone is not enough: the app is also hidden when the deployment kill switch is off or the user has no
 * access, so read its registration from the core `applications$` map instead.
 */
export const isAlertZeroNavVisible = (
  applications: ReadonlyMap<string, { visibleIn?: readonly string[] }>
): boolean => applications.get(ALERTZERO_APP_ID)?.visibleIn?.includes('projectSideNav') === true;
