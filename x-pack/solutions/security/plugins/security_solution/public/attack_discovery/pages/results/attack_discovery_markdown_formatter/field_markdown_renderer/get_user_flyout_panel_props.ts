/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FlyoutPanelProps } from '@kbn/expandable-flyout';
import { TableId } from '@kbn/securitysolution-data-table';
import { UserPanelKey } from '../../../../../flyout/entity_details/shared/constants';

export const isUserName = (fieldName: string) => fieldName === 'user.name';

export const getUserFlyoutPanelProps = ({
  contextId,
  userName,
}: {
  contextId: string;
  userName: string;
}): FlyoutPanelProps => ({
  id: UserPanelKey,
  params: {
    userName,
    contextID: contextId,
    scopeId: TableId.alertsOnAlertsPage,
  },
});
