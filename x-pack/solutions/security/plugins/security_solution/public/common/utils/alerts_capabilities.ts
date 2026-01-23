/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Capabilities } from '@kbn/core/types';
import {
  ALERTS_FEATURE_ID,
  ALERTS_UI_EDIT,
  ALERTS_UI_READ,
  ALERTS_UI_UPDATE_DEPRECATED_PRIVILEGE,
} from '@kbn/security-solution-features/constants';

export interface AlertsUICapabilities {
  alerts: { read: boolean; edit: boolean; legacyUpdate: boolean };
}

export const getAlertsCapabilitiesInitialState = () => ({
  alerts: { read: false, edit: false, legacyUpdate: false },
});

export const extractAlertsCapabilities = (capabilities: Capabilities): AlertsUICapabilities => {
  const alertsCapabilities = capabilities[ALERTS_FEATURE_ID];

  // Alerts permissions
  const readAlerts = alertsCapabilities?.[ALERTS_UI_READ] === true;
  const editAlerts = alertsCapabilities?.[ALERTS_UI_EDIT] === true;

  // Legacy permissions to update alerts in order to preserve backwards compatibility
  const legacyUpdate = alertsCapabilities?.[ALERTS_UI_UPDATE_DEPRECATED_PRIVILEGE] === true;

  return {
    alerts: { read: readAlerts, edit: editAlerts, legacyUpdate },
  };
};
