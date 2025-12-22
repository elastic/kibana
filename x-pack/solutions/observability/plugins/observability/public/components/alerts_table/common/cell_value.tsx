/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink } from '@elastic/eui';
import type { ReactNode } from 'react';
import React from 'react';
import {
  ALERT_DURATION,
  ALERT_SEVERITY,
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_STATUS_RECOVERED,
  ALERT_REASON,
  TIMESTAMP,
  ALERT_EVALUATION_VALUE,
  ALERT_EVALUATION_VALUES,
  ALERT_RULE_NAME,
  ALERT_RULE_CATEGORY,
  ALERT_START,
  ALERT_RULE_EXECUTION_TIMESTAMP,
  ALERT_RULE_UUID,
  ALERT_CASE_IDS,
} from '@kbn/rule-data-utils';
import { isEmpty } from 'lodash';
import type { Alert } from '@kbn/alerting-types';
import type { JsonValue } from '@kbn/utility-types';
import moment from 'moment';
import { i18n } from '@kbn/i18n';
import { AlertSeverityBadge } from '../components/alert_severity_badge';
import { AlertStatusIndicator } from '../components/alert_status_indicator';
import { CellTooltip } from './cell_tooltip';
import { TimestampTooltip } from './timestamp_tooltip';
import type {
  GetObservabilityAlertsTableProp,
  ObservabilityRuleTypeRegistry,
  TopAlert,
} from '../types';

const NOT_AVAILABLE_LABEL = i18n.translate('xpack.observability.alertsTable.notAvailable', {
  defaultMessage: 'N/A',
});

export const getAlertFieldValue = (alert: Alert, fieldName: string) => {
  // can be updated when working on https://github.com/elastic/kibana/issues/140819
  const rawValue = alert[fieldName] as JsonValue[];
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

function isFiniteNumber(value: unknown): value is number {
  return isFinite(value as number);
}

function asDuration(value: number | null | undefined): string {
  if (!isFiniteNumber(value)) {
    return NOT_AVAILABLE_LABEL;
  }
  const duration = moment.duration(value / 1000);
  if (duration.asHours() >= 1) {
    return `${Math.floor(duration.asHours())}h`;
  }
  if (duration.asMinutes() >= 1) {
    return `${Math.floor(duration.asMinutes())}m`;
  }
  if (duration.asSeconds() >= 1) {
    return `${Math.floor(duration.asSeconds())}s`;
  }
  return `${Math.floor(duration.asMilliseconds())}ms`;
}

export type AlertCellRenderers = Record<string, (value: string) => ReactNode>;

const parseAlert =
  (observabilityRuleTypeRegistry?: ObservabilityRuleTypeRegistry) =>
  (alert: Record<string, unknown>): TopAlert => {
    const ruleTypeId = alert['kibana.alert.rule.rule_type_id'] as string;
    const formatter = observabilityRuleTypeRegistry?.getFormatter(ruleTypeId);
    let formattedFields = {};
    try {
      formattedFields =
        formatter?.({
          fields: alert,
          formatters: { asDuration: (v) => asDuration(v as number), asPercent: (v) => `${v}%` },
        }) ?? {};
    } catch (error) {
      // Ignore formatted fields if there is a formatting error
    }
    const formatted = {
      link: undefined,
      reason:
        (alert['kibana.alert.reason'] as string) ??
        (alert['kibana.alert.rule.name'] as string) ??
        '',
      ...formattedFields,
    };

    return {
      ...formatted,
      fields: alert,
      active: alert['kibana.alert.status'] === ALERT_STATUS_ACTIVE,
      start: new Date((alert['kibana.alert.start'] as string) ?? 0).getTime(),
      lastUpdated: new Date((alert['@timestamp'] as string) ?? 0).getTime(),
    };
  };

/**
 * This implementation of `EuiDataGrid`'s `renderCellValue`
 * accepts `EuiDataGridCellValueElementProps`, plus `data`
 * from the TGrid
 */

export const AlertsTableCellValue: GetObservabilityAlertsTableProp<'renderCellValue'> = (props) => {
  const {
    columnId,
    alert,
    rowIndex,
    onExpandedAlertIndexChange,
    observabilityRuleTypeRegistry,
    services: { http },
  } = props;

  const cellRenderers: AlertCellRenderers = {
    [ALERT_STATUS]: (value) => {
      if (value !== ALERT_STATUS_ACTIVE && value !== ALERT_STATUS_RECOVERED) {
        // NOTE: This should only be needed to narrow down the type.
        // Status should be either "active" or "recovered".
        return null;
      }
      return <AlertStatusIndicator alertStatus={value} />;
    },
    [TIMESTAMP]: (value) => (
      <TimestampTooltip time={new Date(value ?? '').getTime()} timeUnit="milliseconds" />
    ),
    [ALERT_START]: (value) => (
      <TimestampTooltip time={new Date(value ?? '').getTime()} timeUnit="milliseconds" />
    ),
    [ALERT_RULE_EXECUTION_TIMESTAMP]: (value) => (
      <TimestampTooltip time={new Date(value ?? '').getTime()} timeUnit="milliseconds" />
    ),
    [ALERT_DURATION]: (value) => <>{asDuration(Number(value))}</>,
    [ALERT_SEVERITY]: (value) => <AlertSeverityBadge severityLevel={value ?? undefined} />,
    [ALERT_EVALUATION_VALUE]: (value) => {
      const multipleValues = getAlertFieldValue(alert, ALERT_EVALUATION_VALUES);
      return <>{multipleValues ?? value}</>;
    },
    [ALERT_REASON]: (value) => {
      if (!observabilityRuleTypeRegistry) return <>{value}</>;
      const parsedAlert = parseAlert(observabilityRuleTypeRegistry)(alert);
      return (
        <EuiLink
          data-test-subj="o11yGetRenderCellValueLink"
          css={{ ':hover': { textDecoration: 'none' } }}
          onClick={() => onExpandedAlertIndexChange(rowIndex)}
        >
          {parsedAlert.reason}
        </EuiLink>
      );
    },
    [ALERT_RULE_NAME]: (value) => {
      const ruleCategory = getAlertFieldValue(alert, ALERT_RULE_CATEGORY);
      const ruleId = getAlertFieldValue(alert, ALERT_RULE_UUID);
      const ruleLink = ruleId
        ? http.basePath.prepend(`/app/observability/alerts/rules/${ruleId}`)
        : '';
      return (
        <CellTooltip
          value={
            <EuiLink data-test-subj="o11yCellRenderersLink" href={ruleLink}>
              {value}
            </EuiLink>
          }
          tooltipContent={ruleCategory}
        />
      );
    },
    [ALERT_CASE_IDS]: (value) => {
      return <>{value}</>;
    },
  };

  const val = getAlertFieldValue(alert, columnId);

  return cellRenderers[columnId] ? cellRenderers[columnId](val) : <>{val}</>;
};

