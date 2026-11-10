/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityPageName } from '@kbn/deeplinks-security';

export interface EndpointManagementArea {
  /**
   * Deep link id. Both surfaces key off it: the nav item is `nav-item-id-<id>` on serverless and
   * `solutionSideNavPanelLink-<id>` on stateful, and the Manage landing card is `LandingItem-<id>`.
   */
  readonly linkId: string;
  /** Sub-feature privilege prefix that grants the area, e.g. `blocklist_` for `blocklist_read`. */
  readonly privilegePrefix: string;
}

/**
 * Every artifact type shares one nav item and one landing card, so several privilege prefixes map
 * onto `artifacts`. Each prefix is still exercised separately: the privilege differs even where the
 * surface does not.
 */
export const ENDPOINT_MANAGEMENT_AREAS: readonly EndpointManagementArea[] = [
  { linkId: SecurityPageName.endpoints, privilegePrefix: 'endpoint_list_' },
  { linkId: SecurityPageName.policies, privilegePrefix: 'policy_management_' },
  { linkId: SecurityPageName.artifacts, privilegePrefix: 'trusted_applications_' },
  { linkId: SecurityPageName.artifacts, privilegePrefix: 'trusted_devices_' },
  { linkId: SecurityPageName.artifacts, privilegePrefix: 'event_filters_' },
  { linkId: SecurityPageName.artifacts, privilegePrefix: 'blocklist_' },
  { linkId: SecurityPageName.artifacts, privilegePrefix: 'host_isolation_exceptions_' },
  { linkId: SecurityPageName.artifacts, privilegePrefix: 'endpoint_exceptions_' },
  { linkId: SecurityPageName.responseActionsHistory, privilegePrefix: 'actions_log_management_' },
];

export const ENDPOINT_MANAGEMENT_LINK_IDS: readonly string[] = [
  ...new Set(ENDPOINT_MANAGEMENT_AREAS.map(({ linkId }) => linkId)),
];
