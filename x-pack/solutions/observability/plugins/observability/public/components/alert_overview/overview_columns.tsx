/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBasicTableColumn, EuiCallOut, EuiLink, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import { AlertLifecycleStatusBadge } from '@kbn/alerts-ui-shared/src/alert_lifecycle_status_badge';
import { Cases } from '@kbn/cases-plugin/common';
import { i18n } from '@kbn/i18n';
import { AlertStatus } from '@kbn/rule-data-utils';
import moment from 'moment';
import React from 'react';
import { Tooltip as CaseTooltip } from '@kbn/cases-components';
import { COMPARATORS } from '@kbn/alerting-comparators';
import { LEGACY_COMPARATORS } from '../../../common/utils/convert_legacy_outside_comparator';
import { NavigateToCaseView } from '../../hooks/use_case_view_navigation';
import { formatCase } from './helpers/format_cases';
import { FlyoutThresholdData } from './helpers/map_rules_params_with_flyout';
import { Groups } from '../alert_sources/groups';
import type { Group } from '../../../common/typings';

interface AlertOverviewField {
  id: string;
  key: string;
  value?: string | string[] | number | number[] | Record<string, any>;
  meta?: Record<string, any>;
}
export const ColumnIDs = {
  STATUS: 'status',
  SOURCE: 'source',
  TRIGGERED: 'triggered',
  DURATION: 'duration',
  OBSERVED_VALUE: 'observed_value',
  THRESHOLD: 'threshold',
  RULE_NAME: 'rule_name',
  RULE_TYPE: 'rule_type',
  CASES: 'cases',
} as const;

export const overviewColumns: Array<EuiBasicTableColumn<AlertOverviewField>> = [
  {
    field: 'key',
    name: '',
    width: '30%',
  },
  {
    field: 'value',
    name: '',
    render: (value: AlertOverviewField['value'], { id, meta }: AlertOverviewField) => {
      if (!value && value !== 0 && !meta) return <>{'-'}</>;
      const ruleCriteria = meta?.ruleCriteria as FlyoutThresholdData[];
      switch (id) {
        case ColumnIDs.STATUS:
          const alertStatus = value as string;
          const flapping = meta?.flapping;
          return (
            <AlertLifecycleStatusBadge
              alertStatus={alertStatus as AlertStatus}
              flapping={flapping}
            />
          );

        case ColumnIDs.SOURCE:
          const groups = meta?.groups as Group[];
          if (!groups.length) return <>{'-'}</>;
          const alertEnd = meta?.alertEnd;
          const timeRange = meta?.timeRange;
          return (
            <div>
              <Groups
                groups={groups}
                timeRange={alertEnd ? timeRange : { ...timeRange, to: 'now' }}
              />
            </div>
          );
        case ColumnIDs.TRIGGERED:
          const triggeredDate = value as string;
          return <EuiText size="s">{moment(triggeredDate).format(meta?.dateFormat)}</EuiText>;
        case ColumnIDs.DURATION:
          const duration = value as number;
          return (
            <EuiText size="s">
              {/* duration is in μs so divide by 1000 */}
              <h4>{moment.duration(duration / 1000).humanize()}</h4>
            </EuiText>
          );
        case ColumnIDs.RULE_NAME:
          const ruleName = value as string;
          const ruleLink = meta?.ruleLink as string;
          return (
            <EuiLink data-test-subj="alertFlyoutOverview" href={ruleLink ? ruleLink : '#'}>
              {ruleName}
            </EuiLink>
          );
        case ColumnIDs.OBSERVED_VALUE:
          if (!ruleCriteria) return <>{'-'}</>;
          return (
            <div>
              {ruleCriteria.map((criteria, criteriaIndex) => {
                const observedValue = criteria.observedValue;
                const pctAboveThreshold = criteria.pctAboveThreshold;
                return (
                  <EuiText size="s" key={`${observedValue}-${criteriaIndex}`}>
                    <h4 style={{ display: 'inline' }}>{observedValue}</h4>
                    <span>{pctAboveThreshold}</span>
                  </EuiText>
                );
              })}
              {ruleCriteria.length > 1 && (
                <EuiCallOut
                  size="s"
                  title={i18n.translate(
                    'xpack.observability.columns.euiCallOut.multipleConditionsLabel',
                    { defaultMessage: 'Multiple conditions' }
                  )}
                  iconType="alert"
                />
              )}
            </div>
          );

        case ColumnIDs.THRESHOLD:
          if (!ruleCriteria) return <>{'-'}</>;
          return (
            <div>
              {ruleCriteria.map((criteria, criticalIndex) => {
                const { threshold, comparator } = criteria;
                let formattedComparator = comparator.toUpperCase();
                if (
                  comparator === COMPARATORS.NOT_BETWEEN ||
                  comparator === LEGACY_COMPARATORS.OUTSIDE_RANGE
                ) {
                  // No need for i18n as we are using the enum value, we only need a space.
                  formattedComparator = 'NOT BETWEEN';
                }
                return (
                  <EuiText size="s" key={`${threshold}-${criticalIndex}`}>
                    <h4>{`${formattedComparator} ${threshold}`}</h4>
                  </EuiText>
                );
              })}
            </div>
          );

        case ColumnIDs.RULE_TYPE:
          const ruleType = value as string;
          return <EuiText size="s">{ruleType}</EuiText>;

        case ColumnIDs.CASES:
          const cases = meta?.cases as Cases;
          const isLoading = meta?.isLoading;
          if (isLoading) return <EuiLoadingSpinner size="m" />;
          if (!cases || !cases.length) return <>{'-'}</>;
          const navigateToCaseView = meta?.navigateToCaseView as NavigateToCaseView;
          return cases.map((caseInfo, index) => {
            return [
              index > 0 && index < cases.length && ', ',
              <CaseTooltip loading={false} content={formatCase(caseInfo)} key={caseInfo.id}>
                <EuiLink
                  key={caseInfo.id}
                  onClick={() => navigateToCaseView({ caseId: caseInfo.id })}
                  data-test-subj="o11yAlertFlyoutOverviewTabCasesLink"
                >
                  {caseInfo.title}
                </EuiLink>
              </CaseTooltip>,
            ];
          });
        default:
          return <>{'-'}</>;
      }
    },
  },
];
