/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiTitle, EuiPanel, EuiText, EuiIconTip, EuiSpacer } from '@elastic/eui';
import {
  ALERT_START,
  ALERT_INSTANCE_ID,
  ALERT_RULE_UUID,
  ALERT_GROUP,
  ALERT_STATUS,
} from '@kbn/rule-data-utils';
import moment from 'moment';
import { useSearchAlertsQuery } from '@kbn/alerts-ui-shared/src/common/hooks/use_search_alerts_query';
import { Group } from '@kbn/alerting-rule-utils';
import {
  OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES,
  observabilityAlertFeatureIds,
} from '../../../../common/constants';
import { useKibana } from '../../../utils/kibana_react';
import { AlertInsightProps, NUM_OF_ALERTS, NUM_OF_BUCKETS } from '../types';
import { getAlertInsights } from '../helpers/get_alert_insights';

export function AlertsTriggeredAroundSameTime({ alert }: AlertInsightProps) {
  const { data } = useKibana().services;

  const alertStartedAt = moment(alert.fields[ALERT_START]);
  const groups = alert.fields[ALERT_GROUP] as Group[];

  const groupsFilter =
    groups?.map(({ field }) => ({
      bool: {
        must: [{ term: { 'kibana.alert.group.field': field } }],
      },
    })) ?? [];

  const query = {
    bool: {
      filter: [
        {
          range: {
            [ALERT_START]: {
              gte: alertStartedAt.clone().subtract(2, 'm').toISOString(),
              lte: alertStartedAt.clone().add(2, 'm').toISOString(),
            },
          },
        },
        ...groupsFilter,
      ],
      should: [{ term: { [ALERT_STATUS]: 'active' } }, { term: { [ALERT_STATUS]: 'recovered' } }],
      minimum_should_match: 1,
    },
  };

  const aggs = {
    groups: {
      terms: {
        field: ALERT_INSTANCE_ID,
        size: NUM_OF_BUCKETS,
      },
    },
    rules: {
      terms: {
        field: ALERT_RULE_UUID,
        size: NUM_OF_BUCKETS,
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
    aggs,
  });

  const rawResponse = alertsData?.querySnapshot?.response[0] ?? 'null';
  const aggregationsResponse = JSON.parse(rawResponse)?.aggregations;
  const groupBuckets = aggregationsResponse?.groups?.buckets as any[];
  const ruleBuckets = aggregationsResponse?.rules?.buckets as any[];

  const alertInsights = getAlertInsights(alert, groupBuckets, ruleBuckets, alertsData);

  function AlertInsightTooltip({ content }: { content: string }) {
    return (
      <EuiIconTip
        content={content}
        position="top"
        type="iInCircle"
        iconProps={{
          className: 'eui-alignTop',
        }}
      />
    );
  }

  return (
    <EuiPanel hasShadow={false} hasBorder={true} color="accent">
      <EuiTitle size="xs">
        <h5>
          {i18n.translate(
            'xpack.observability.alertsTriggeredAroundSameTime.h5.triggeredAroundSameTimeLabel',
            { defaultMessage: 'Triggered around same time' }
          )}
        </h5>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="xs" direction="column" wrap>
        {alertInsights.map((alertInsight) => (
          <EuiText size="m">
            <p>
              {alertInsight.title}: <strong>{alertInsight.alertsCount}</strong>
              <AlertInsightTooltip content={alertInsight.tooltip} />
            </p>
          </EuiText>
        ))}
      </EuiFlexGroup>
    </EuiPanel>
  );
}

// eslint-disable-next-line import/no-default-export
export default AlertsTriggeredAroundSameTime;
