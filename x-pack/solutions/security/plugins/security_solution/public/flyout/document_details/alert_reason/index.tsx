/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { FlyoutPanelProps, PanelPath } from '@kbn/expandable-flyout';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { DocumentDetailsAlertReasonPanelKey } from '../shared/constants/panel_keys';
import { AlertReason } from './alert_reason';

export interface AlertReasonPanelProps extends FlyoutPanelProps {
  key: typeof DocumentDetailsAlertReasonPanelKey;
  path?: PanelPath;
  params?: {
    id: string;
    indexName: string;
    scopeId: string;
    ruleId?: string;
  };
}

/**
 * Preview panel to be displayed on top of the document details expandable flyout right section
 */
export const AlertReasonPanel: React.FC = memo(() => {
  return (
    <EuiFlexGroup
      justifyContent="spaceBetween"
      direction="column"
      gutterSize="none"
      style={{ height: '100%' }}
    >
      <EuiFlexItem style={{ marginTop: '-15px' }}>
        <AlertReason />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

AlertReasonPanel.displayName = 'AlertReasonPanel';
