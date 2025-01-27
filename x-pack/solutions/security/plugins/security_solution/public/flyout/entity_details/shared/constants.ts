/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UniversalEntityPanelExpandableFlyoutProps } from '../universal_right';
import { EntityType } from '../../../../common/entity_analytics/types';
import type { HostPanelExpandableFlyoutProps } from '../host_right';
import type { ServicePanelExpandableFlyoutProps } from '../service_right';
import type { UserPanelExpandableFlyoutProps } from '../user_right';

export const ONE_WEEK_IN_HOURS = 24 * 7;

export const getEntraUserIndex = (spaceId: string = 'default') =>
  `logs-entityanalytics_entra_id.user-${spaceId}`;

export const ENTRA_ID_PACKAGE_NAME = 'entityanalytics_entra_id';

export const getOktaUserIndex = (spaceId: string = 'default') =>
  `logs-entityanalytics_okta.user-${spaceId}`;

export const OKTA_PACKAGE_NAME = 'entityanalytics_okta';

export const MANAGED_USER_QUERY_ID = 'managedUserDetailsQuery';

export const HostPanelKey: HostPanelExpandableFlyoutProps['key'] = 'host-panel';
export const UserPanelKey: UserPanelExpandableFlyoutProps['key'] = 'user-panel';
export const ServicePanelKey: ServicePanelExpandableFlyoutProps['key'] = 'service-panel';
export const UniversalEntityPanelKey: UniversalEntityPanelExpandableFlyoutProps['key'] =
  'universal-entity-panel';

export const EntityPanelKeyByType: Record<EntityType, string | undefined> = {
  [EntityType.host]: HostPanelKey,
  [EntityType.user]: UserPanelKey,
  [EntityType.service]: ServicePanelKey,
  [EntityType.universal]: undefined, // TODO create universal flyout?
};

// TODO rename all params and merged them as 'entityName'
export const EntityPanelParamByType: Record<EntityType, string | undefined> = {
  [EntityType.host]: 'hostName',
  [EntityType.user]: 'userName',
  [EntityType.service]: 'serviceName',
  [EntityType.universal]: undefined, // TODO create universal flyout?
};
