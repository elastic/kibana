/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiBadge, useEuiTheme } from '@elastic/eui';
import type { Alert } from '@kbn/alerting-types';
import { ALERT_SEVERITY } from '@kbn/rule-data-utils';
import type { JsonValue } from '@kbn/utility-types';
import { getSeverityColor } from '../../alerts_kpis/severity_level_panel/helpers';

export const BADGE_TEST_ID = 'alert-summary-table-severity-cell-renderer';

/**
 * Return the same string with the first letter capitalized
 */
const capitalizeFirstLetter = (value: string): string =>
  String(value).charAt(0).toUpperCase() + String(value).slice(1);

export interface KibanaAlertSeverityCellRendererProps {
  /**
   * Alert data passed from the renderCellValue callback via the AlertWithLegacyFormats interface
   */
  alert: Alert;
}

/**
 * Renders a EuiBadge for the kibana.alert.severity field.
 * Used in AI for SOC alert summary table.
 */
export const KibanaAlertSeverityCellRenderer = memo(
  ({ alert }: KibanaAlertSeverityCellRendererProps) => {
    const { euiTheme } = useEuiTheme();

    const displayValue: string | null = useMemo(() => {
      const values: JsonValue[] | undefined = alert[ALERT_SEVERITY];

      if (Array.isArray(values) && values.length === 1) {
        const value: JsonValue = values[0];
        return value && typeof value === 'string' ? capitalizeFirstLetter(value) : null;
      }

      return null;
    }, [alert]);

    const color: string = useMemo(
      () => getSeverityColor(displayValue || '', euiTheme),
      [displayValue, euiTheme]
    );

    return (
      <>
        {displayValue && (
          <EuiBadge color={color} data-test-subj={BADGE_TEST_ID}>
            {displayValue}
          </EuiBadge>
        )}
      </>
    );
  }
);

KibanaAlertSeverityCellRenderer.displayName = 'KibanaAlertSeverityCellRenderer';
