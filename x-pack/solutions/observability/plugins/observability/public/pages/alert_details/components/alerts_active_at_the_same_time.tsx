/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiLink, EuiPanel, useEuiTheme } from '@elastic/eui';
import { ALERT_START, ALERT_STATUS } from '@kbn/rule-data-utils';
import { useSearchAlertsQuery } from '@kbn/alerts-ui-shared/src/common/hooks/use_search_alerts_query';
import { Chart, Metric, Settings } from '@elastic/charts';
import {
  OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES,
  observabilityAlertFeatureIds,
} from '../../../../common/constants';
import { useKibana } from '../../../utils/kibana_react';
import { AlertInsightProps, NUM_OF_ALERTS } from '../types';

export function AlertsActiveAtSameTime({ alert, onViewRelatedAlertsClick }: AlertInsightProps) {
  const { data, charts } = useKibana().services;
  const { euiTheme } = useEuiTheme();

  const query = {
    bool: {
      must: [{ term: { [ALERT_STATUS]: 'active' } }],
    },
  };

  const histogramAgg = {
    active_alerts: {
      date_histogram: {
        field: ALERT_START,
        fixed_interval: '1h',
        min_doc_count: 1,
      },
    },
  };

  const { data: alertsData } = useSearchAlertsQuery({
    data,
    ruleTypeIds: OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES,
    consumers: observabilityAlertFeatureIds,
    pageIndex: 0,
    pageSize: NUM_OF_ALERTS,
    query,
    aggs: histogramAgg,
    useDefaultContext: true,
  });

  const rawResponse = alertsData?.querySnapshot?.response[0] ?? 'null';
  const aggregationsResponse = JSON.parse(rawResponse)?.aggregations;
  const activeAlertBuckets = aggregationsResponse?.active_alerts?.buckets;

  const metricChartData = activeAlertBuckets
    ? activeAlertBuckets.map((bucket: { key: number; doc_count: number }) => ({
        x: bucket.key,
        y: bucket.doc_count,
      }))
    : [];

  return (
    <EuiPanel paddingSize="none" onFocus={(e: any) => e.target.blur()}>
      <Chart size={[, 200]}>
        <Settings baseTheme={charts.theme.useChartsBaseTheme()} />
        <Metric
          id="active_at_the_same_time"
          data={[
            [
              {
                color: euiTheme.colors.backgroundBaseDanger,
                title: 'Active at the same time',
                subtitle: '',
                extra: (
                  <EuiLink
                    data-test-subj="o11yAlertsActiveAtSameTimeViewInRelatedAlertsLink"
                    onClick={onViewRelatedAlertsClick}
                  >
                    {i18n.translate(
                      'xpack.observability.alertsActiveAtSameTime.viewInRelatedAlertsLinkLabel',
                      { defaultMessage: 'View in related alerts' }
                    )}
                  </EuiLink>
                ),
                value: String(alertsData?.alerts.length),
                trend: metricChartData,
                trendShape: 'area',
              },
            ],
          ]}
        />
      </Chart>
    </EuiPanel>
  );
}

// eslint-disable-next-line import/no-default-export
export default AlertsActiveAtSameTime;
