/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RiskScoreEntityType } from '../../../../common/entity_analytics/types';
import type { HostPanelExpandableFlyoutProps } from '../host_right';
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

export const EntityPanelKeyByType: Record<RiskScoreEntityType, string | undefined> = {
  [RiskScoreEntityType.host]: HostPanelKey,
  [RiskScoreEntityType.user]: UserPanelKey,
  [RiskScoreEntityType.service]: undefined, // TODO create service flyout
};

// TODO rename all params to entityName
export const EntityPanelParamByType: Record<RiskScoreEntityType, string | undefined> = {
  [RiskScoreEntityType.host]: 'hostName',
  [RiskScoreEntityType.user]: 'userName',
  [RiskScoreEntityType.service]: undefined, // TODO create service flyout
};
