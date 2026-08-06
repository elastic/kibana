/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EuiContextMenuPanelDescriptor,
  EuiContextMenuPanelItemDescriptor,
} from '@elastic/eui';

export const SECURITY_ACTION_MENU_PRESETS = {
  alertRow: 'alertRow',
  documentFlyoutV2: 'documentFlyoutV2',
  documentFlyoutLegacy: 'documentFlyoutLegacy',
  easeAlertRow: 'easeAlertRow',
  easeAlertFlyout: 'easeAlertFlyout',
  attackDiscovery: 'attackDiscovery',
  attackGroup: 'attackGroup',
  attackFlyout: 'attackFlyout',
  entityRiskInput: 'entityRiskInput',
  anomalyRow: 'anomalyRow',
} as const;

export type SecurityActionMenuPreset =
  (typeof SECURITY_ACTION_MENU_PRESETS)[keyof typeof SECURITY_ACTION_MENU_PRESETS];

export type SecurityActionMenuActionId = string;

export interface SecurityActionMenuPlacement {
  before?: SecurityActionMenuActionId;
  after?: SecurityActionMenuActionId;
}

export interface SecurityActionMenuContribution {
  id: SecurityActionMenuActionId;
  items: EuiContextMenuPanelItemDescriptor[];
  panels?: EuiContextMenuPanelDescriptor[];
  placement?: SecurityActionMenuPlacement;
}
