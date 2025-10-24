/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GenericEntityPanelExpandableFlyoutProps } from '../generic_right';
import type { HostPanelExpandableFlyoutProps } from '../host_right';
import type { ServicePanelExpandableFlyoutProps } from '../service_right';
import type { UserPanelExpandableFlyoutProps } from '../user_right';

export const ONE_WEEK_IN_HOURS = 24 * 7;

export const MANAGED_USER_QUERY_ID = 'managedUserDetailsQuery';

export const HostPanelKeyV2: HostPanelExpandableFlyoutProps['key'] = 'host-panel-v2';
export const UserPanelKeyV2: UserPanelExpandableFlyoutProps['key'] = 'user-panel-v2';
export const ServicePanelKeyV2: ServicePanelExpandableFlyoutProps['key'] = 'service-panel-v2';
export const GenericEntityPanelKeyV2: GenericEntityPanelExpandableFlyoutProps['key'] =
  'generic-entity-panel-v2';
