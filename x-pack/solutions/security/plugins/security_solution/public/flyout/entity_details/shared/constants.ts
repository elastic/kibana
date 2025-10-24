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

export const HostPanelKey: HostPanelExpandableFlyoutProps['key'] = 'host-panel';
export const UserPanelKey: UserPanelExpandableFlyoutProps['key'] = 'user-panel';
export const ServicePanelKey: ServicePanelExpandableFlyoutProps['key'] = 'service-panel';
export const GenericEntityPanelKey: GenericEntityPanelExpandableFlyoutProps['key'] =
  'generic-entity-panel';
