/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiProgress,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import type { AggregateQuery, TimeRange } from '@kbn/es-query';
import { EsqlInspectButton } from './esql_inspect_button';
import { useTopAlertsByData } from './use_top_alerts_by_data';

const TITLE = i18n.translate('xpack.securitySolution.alertsV2.topAlertsBy.title', {
  defaultMessage: 'Top alerts by',
});

/** Mirrors the v1 progress-bar panel's group-by options. */
const GROUP_BY_OPTIONS = [
  { value: 'host.name', text: 'host.name' },
  { value: 'user.name', text: 'user.name' },
  { value: 'source.ip', text: 'source.ip' },
  { value: 'destination.ip', text: 'destination.ip' },
];
const FIELD_STORAGE_KEY = 'securitySolution.alertsV2.topAlertsByField';
const DEFAULT_FIELD = 'host.name';

export interface TopAlertsByPanelProps {
  /** The page's ES|QL query — the chart aggregates on top of it. */
  query: AggregateQuery;
  timeRange: TimeRange;
}

/**
 * "Top alerts by <field>" KPI for the Alerts v2 Summary tab — the v2 analogue of
 * the v1 progress-bar panel. The entity field is a flat, dotted key inside the
 * episode's flattened `data`, extracted in ES|QL via `JSON_EXTRACT`.
 */
export const TopAlertsByPanel = ({ query, timeRange }: TopAlertsByPanelProps) => {
  const [storedField, setStoredField] = useLocalStorage<string>(FIELD_STORAGE_KEY, DEFAULT_FIELD);
  const field = storedField ?? DEFAULT_FIELD;

  const { data, isLoading, error, inspect } = useTopAlertsByData(query, timeRange, field);

  const total = useMemo(() => data.reduce((sum, datum) => sum + datum.value, 0), [data]);

  return (
    <EuiPanel hasBorder hasShadow={false} data-test-subj="alertsV2TopAlertsByPanel">
      <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>{TITLE}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSelect
            compressed
            aria-label={i18n.translate('xpack.securitySolution.alertsV2.topAlertsBy.fieldAriaLabel', {
              defaultMessage: 'Group top alerts by field',
            })}
            options={GROUP_BY_OPTIONS}
            value={field}
            onChange={(event) => setStoredField(event.target.value)}
            data-test-subj="alertsV2TopAlertsByField"
          />
        </EuiFlexItem>
        <EuiFlexItem />
        <EuiFlexItem grow={false}>
          <EsqlInspectButton inspect={inspect} title={`${TITLE} ${field}`} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {error ? (
        <EuiCallOut
          announceOnMount
          color="danger"
          iconType="error"
          size="s"
          title={i18n.translate('xpack.securitySolution.alertsV2.topAlertsBy.error', {
            defaultMessage: 'Unable to load top alerts',
          })}
        >
          {error.message}
        </EuiCallOut>
      ) : data.length === 0 ? (
        <EuiText size="s" color="subdued" data-test-subj="alertsV2TopAlertsByEmpty">
          {isLoading
            ? i18n.translate('xpack.securitySolution.alertsV2.topAlertsBy.loading', {
                defaultMessage: 'Loading…',
              })
            : i18n.translate('xpack.securitySolution.alertsV2.topAlertsBy.empty', {
                defaultMessage: 'No values for this field.',
              })}
        </EuiText>
      ) : (
        data.map((datum) => (
          <React.Fragment key={datum.label}>
            <EuiProgress
              value={datum.value}
              max={total}
              size="l"
              color="primary"
              label={datum.label}
              valueText={String(datum.value)}
            />
            <EuiSpacer size="s" />
          </React.Fragment>
        ))
      )}
    </EuiPanel>
  );
};
