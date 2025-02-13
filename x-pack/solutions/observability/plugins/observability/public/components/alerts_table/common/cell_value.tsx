/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiLink } from '@elastic/eui';
import React from 'react';
import {
  ALERT_DURATION,
  ALERT_SEVERITY,
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_STATUS_RECOVERED,
  ALERT_REASON,
  TIMESTAMP,
  ALERT_UUID,
  ALERT_EVALUATION_VALUE,
  ALERT_EVALUATION_VALUES,
  ALERT_RULE_NAME,
  ALERT_RULE_CATEGORY,
  ALERT_START,
  ALERT_RULE_EXECUTION_TIMESTAMP,
} from '@kbn/rule-data-utils';
import { isEmpty } from 'lodash';
import type { Alert } from '@kbn/alerting-types';
import { asDuration } from '../../../../common/utils/formatters';
import { AlertSeverityBadge } from '../../alert_severity_badge';
import { AlertStatusIndicator } from '../../alert_status_indicator';
import { parseAlert } from '../../../pages/alerts/helpers/parse_alert';
import { CellTooltip } from './cell_tooltip';
import { TimestampTooltip } from './timestamp_tooltip';
import type { GetObservabilityAlertsTableProp } from '../types';

const getAlertFieldValue = (alert: Alert, fieldName: string) => {
  // can be updated when working on https://github.com/elastic/kibana/issues/140819
  const rawValue = alert[fieldName];
  const value = Array.isArray(rawValue) ? rawValue.join() : rawValue;

  if (!isEmpty(value)) {
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch (e) {
        return 'Error: Unable to parse JSON value.';
      }
    }
    return value;
  }

  return '--';
};

/**
 * This implementation of `EuiDataGrid`'s `renderCellValue`
 * accepts `EuiDataGridCellValueElementProps`, plus `data`
 * from the TGrid
 */
// eslint-disable-next-line react/function-component-definition
export const AlertsTableCellValue: GetObservabilityAlertsTableProp<'renderCellValue'> = ({
  columnId,
  alert,
  openAlertInFlyout,
  observabilityRuleTypeRegistry,
}) => {
  const value = getAlertFieldValue(alert, columnId);

  switch (columnId) {
    case ALERT_STATUS:
      if (value !== ALERT_STATUS_ACTIVE && value !== ALERT_STATUS_RECOVERED) {
        // NOTE: This should only be needed to narrow down the type.
        // Status should be either "active" or "recovered".
        return null;
      }
      return <AlertStatusIndicator alertStatus={value} />;
    case TIMESTAMP:
    case ALERT_START:
    case ALERT_RULE_EXECUTION_TIMESTAMP:
      return <TimestampTooltip time={new Date(value ?? '').getTime()} timeUnit="milliseconds" />;
    case ALERT_DURATION:
      return <>{asDuration(Number(value))}</>;
    case ALERT_SEVERITY:
      return <AlertSeverityBadge severityLevel={value ?? undefined} />;
    case ALERT_EVALUATION_VALUE:
      const multipleValues = getAlertFieldValue(alert, ALERT_EVALUATION_VALUES);
      return <>{multipleValues ?? value}</>;
    case ALERT_REASON:
      if (!observabilityRuleTypeRegistry) return <>{value}</>;
      const parsedAlert = parseAlert(observabilityRuleTypeRegistry)(alert);
      return (
        <EuiLink
          data-test-subj="o11yGetRenderCellValueLink"
          css={{ ':hover': { textDecoration: 'none' } }}
          onClick={() => openAlertInFlyout?.(parsedAlert.fields[ALERT_UUID])}
        >
          {parsedAlert.reason}
        </EuiLink>
      );
    case ALERT_RULE_NAME:
      const ruleCategory = getAlertFieldValue(alert, ALERT_RULE_CATEGORY);
      return <CellTooltip value={value} tooltipContent={ruleCategory} />;
    default:
      return <>{value}</>;
  }
};
