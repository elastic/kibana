/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiBadge, useEuiTheme } from '@elastic/eui';
import { getSeverityColor } from '../../alerts_kpis/severity_level_panel/helpers';

export interface KibanaAlertSeverityCellRendererProps {
  /**
   *
   */
  value: string | string[];
}

/**
 *
 */
export const KibanaAlertSeverityCellRenderer = memo(
  ({ value }: KibanaAlertSeverityCellRendererProps) => {
    const { euiTheme } = useEuiTheme();
    const displayValue: string = useMemo(() => (Array.isArray(value) ? value[0] : value), [value]);
    const color = useMemo(() => getSeverityColor(displayValue, euiTheme), [displayValue, euiTheme]);

    return <>{value && <EuiBadge color={color}>{displayValue}</EuiBadge>}</>;
  }
);

KibanaAlertSeverityCellRenderer.displayName = 'KibanaAlertSeverityCellRenderer';
