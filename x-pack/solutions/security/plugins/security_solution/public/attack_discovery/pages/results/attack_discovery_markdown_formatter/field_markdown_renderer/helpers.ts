/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FlyoutPanelProps } from '@kbn/expandable-flyout';

import { getHostFlyoutPanelProps, isHostName } from './get_host_flyout_panel_props';
import { getUserFlyoutPanelProps, isUserName } from './get_user_flyout_panel_props';

export const getFlyoutPanelProps = ({
  contextId,
  fieldName,
  value,
}: {
  contextId: string;
  fieldName: string;
  value: string | number | undefined;
}): FlyoutPanelProps | null => {
  if (isHostName(fieldName) && typeof value === 'string') {
    return getHostFlyoutPanelProps({ contextId, hostName: value });
  }

  if (isUserName(fieldName) && typeof value === 'string') {
    return getUserFlyoutPanelProps({ contextId, userName: value });
  }

  return null;
};
