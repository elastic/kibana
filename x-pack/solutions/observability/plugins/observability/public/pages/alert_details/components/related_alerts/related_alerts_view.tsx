/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiCallOut,
  EuiFlexGroup,
  EuiSpacer,
  EuiTableSelectionType,
  EuiText,
} from '@elastic/eui';
import numeral from '@elastic/numeral';
import type { Alert } from '@kbn/alerting-types';
import { useSearchAlertsQuery } from '@kbn/alerts-ui-shared/src/common/hooks/use_search_alerts_query';
import { i18n } from '@kbn/i18n';
import {
  ALERT_INSTANCE_ID,
  ALERT_REASON,
  ALERT_RULE_CATEGORY,
  ALERT_RULE_NAME,
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_STATUS_RECOVERED,
} from '@kbn/rule-data-utils';
import { isEmpty, map, max, min } from 'lodash';
import React, { useState } from 'react';
import {
  OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES,
  observabilityAlertFeatureIds,
} from '../../../../../common/constants';
import type { ObservabilityFields } from '../../../../../common/utils/alerting/types';
import type { TopAlert } from '../../../../typings/alerts';
import { useKibana } from '../../../../utils/kibana_react';
import { useBuildRelatedAlertsQuery } from '../../hooks/related_alerts/use_build_related_alerts_query';

interface Props {
  alert: TopAlert<ObservabilityFields>;
}

export function RelatedAlertsView({ alert }: Props) {
  const { services } = useKibana();

  const esQuery = useBuildRelatedAlertsQuery({ alert });

  const { data, isLoading, isError } = useSearchAlertsQuery({
    data: services.data,
    ruleTypeIds: OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES,
    consumers: observabilityAlertFeatureIds,
    query: esQuery,
    useDefaultContext: true,
    pageSize: 100,
    sort: [{ _score: { order: 'desc' } }],
  });

  const scores = map(data?.alerts, '_score');
  const [minScore, maxScore] = [min(scores), max(scores)];
  const normalizeScore = (currScore: number) => {
    if (minScore === undefined || maxScore === undefined) return currScore;
    return ((currScore - minScore) / (maxScore - minScore)) * 100;
  };

  const columns: Array<EuiBasicTableColumn<Alert>> = [
    {
      field: '_score',
      name: 'Relevance score',
      render: (score: Alert['_score']) => {
        return <EuiBadge color="accent">{numeral(normalizeScore(score)).format('0[.0]')}</EuiBadge>;
      },
      width: '150',
    },
    {
      field: ALERT_STATUS,
      name: 'Status',
      render: (_, item: Alert) => {
        const value = getAlertFieldValue(item, ALERT_STATUS);
        if (value !== ALERT_STATUS_ACTIVE && value !== ALERT_STATUS_RECOVERED) {
          // NOTE: This should only be needed to narrow down the type.
          // Status should be either "active" or "recovered".
          return null;
        }
        return <EuiBadge color={value === 'active' ? 'danger' : 'success'}>{value}</EuiBadge>;
      },
      width: '150',
    },
    {
      field: ALERT_RULE_NAME,
      name: 'Rule',
      truncateText: true,
      render: (_, item: Alert) => {
        const ruleCategory = getAlertFieldValue(item, ALERT_RULE_CATEGORY);
        return <EuiText size="s">{ruleCategory}</EuiText>;
      },
    },
    {
      field: ALERT_INSTANCE_ID,
      name: 'Group',
      truncateText: true,
      render: (_, item: Alert) => {
        const instanceId = getAlertFieldValue(item, ALERT_INSTANCE_ID);
        return <EuiText size="s">{instanceId}</EuiText>;
      },
    },
  ];

  const [selectedAlerts, setSelectedAlerts] = useState<Alert[]>([]);
  const onSelectionChange = (selected: Alert[]) => {
    setSelectedAlerts(selected);
  };
  const selection: EuiTableSelectionType<Alert> = {
    onSelectionChange,

    selectable: () => true,
  };

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiSpacer size="xs" />
      <EuiCallOut
        size="s"
        title={i18n.translate(
          'xpack.observability.relatedAlertsView.euiCallOut.relatedAlertsHeuristicsLabel',
          { defaultMessage: 'Related alerts heuristics' }
        )}
        iconType="search"
      >
        <p>
          {i18n.translate('xpack.observability.relatedAlertsView.p.weAreFetchingAlertsLabel', {
            defaultMessage:
              "We are fetching relevant alerts to the current alert based on some heuristics. Soon you'll be able to tweaks the weights applied to these heuristics",
          })}
        </p>
      </EuiCallOut>

      <EuiBasicTable
        tableCaption="Most relevant alerts to the current one"
        items={data?.alerts ?? []}
        rowHeader={ALERT_REASON}
        columns={columns}
        loading={isLoading}
        compressed
        error={isError ? 'Error fetching relevant alerts' : undefined}
        selection={selection}
        tableLayout={'auto'}
      />
    </EuiFlexGroup>
  );
}

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
