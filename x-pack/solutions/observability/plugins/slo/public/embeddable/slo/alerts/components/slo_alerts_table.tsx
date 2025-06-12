/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useMemo, useRef } from 'react';
import {
  ALERT_DURATION,
  ALERT_REASON,
  ALERT_RULE_NAME,
  ALERT_STATUS,
  SLO_BURN_RATE_RULE_TYPE_ID,
  AlertConsumers,
} from '@kbn/rule-data-utils';
import type { TimeRange } from '@kbn/es-query';
import { ALL_VALUE } from '@kbn/slo-schema';
import type {
  AlertsTableProps,
  AlertsTableImperativeApi,
} from '@kbn/response-ops-alerts-table/types';
import { ObservabilityAlertsTable } from '@kbn/observability-plugin/public';
import { EuiDataGridColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SloItem } from '../types';
import { SloEmbeddableDeps } from '../types';

const ALERTS_PER_PAGE = 10;
const ALERTS_TABLE_ID = 'xpack.observability.sloAlertsEmbeddable.alert.table';
/**
 * columns implements a subset of `EuiDataGrid`'s `EuiDataGridColumn` interface,
 * plus additional TGrid column properties
 */
const columns: Array<Pick<EuiDataGridColumn, 'display' | 'displayAsText' | 'id' | 'initialWidth'>> =
  [
    {
      displayAsText: i18n.translate(
        'xpack.slo.sloAlertsEmbeddable.alertsTGrid.statusColumnDescription',
        {
          defaultMessage: 'Status',
        }
      ),
      id: ALERT_STATUS,
      initialWidth: 110,
    },
    {
      displayAsText: i18n.translate(
        'xpack.slo.sloAlertsEmbeddable.alertsTGrid.durationColumnDescription',
        {
          defaultMessage: 'Duration',
        }
      ),
      id: ALERT_DURATION,
      initialWidth: 116,
    },
    {
      displayAsText: i18n.translate(
        'xpack.slo.sloAlertsEmbeddable.alertsTGrid.sloColumnDescription',
        {
          defaultMessage: 'Rule name',
        }
      ),
      id: ALERT_RULE_NAME,
      initialWidth: 110,
    },
    {
      displayAsText: i18n.translate(
        'xpack.slo.sloAlertsEmbeddable.alertsTGrid.reasonColumnDescription',
        {
          defaultMessage: 'Reason',
        }
      ),
      id: ALERT_REASON,
    },
  ];

interface Props {
  deps: SloEmbeddableDeps;
  slos: SloItem[];
  timeRange: TimeRange;
  onLoaded?: () => void;
  lastReloadRequestTime: number | undefined;
  showAllGroupByInstances?: boolean;
}

export const getSloInstanceFilter = (
  sloId: string,
  sloInstanceId: string,
  showAllGroupByInstances = false
) => {
  return {
    bool: {
      must: [
        {
          term: {
            'slo.id': sloId,
          },
        },
        ...(sloInstanceId !== ALL_VALUE && !showAllGroupByInstances
          ? [
              {
                term: {
                  'slo.instanceId': sloInstanceId,
                },
              },
            ]
          : []),
      ],
    },
  };
};

export const useSloAlertsQuery = (
  slos: SloItem[],
  timeRange: TimeRange,
  showAllGroupByInstances?: boolean
) => {
  return useMemo(() => {
    const query: AlertsTableProps['query'] = {
      bool: {
        filter: [
          {
            range: {
              '@timestamp': {
                gte: timeRange.from,
              },
            },
          },
          {
            term: {
              'kibana.alert.rule.rule_type_id': 'slo.rules.burnRate',
            },
          },
          {
            bool: {
              should: slos.map((slo) =>
                getSloInstanceFilter(slo.id, slo.instanceId, showAllGroupByInstances)
              ),
            },
          },
        ],
      },
    };

    return query;
  }, [showAllGroupByInstances, slos, timeRange.from]);
};

export function SloAlertsTable({
  slos,
  timeRange,
  onLoaded,
  lastReloadRequestTime,
  showAllGroupByInstances,
}: Props) {
  const ref = useRef<AlertsTableImperativeApi>(null);

  useEffect(() => {
    ref.current?.refresh();
  }, [lastReloadRequestTime]);

  return (
    <ObservabilityAlertsTable
      ref={ref}
      id={ALERTS_TABLE_ID}
      ruleTypeIds={[SLO_BURN_RATE_RULE_TYPE_ID]}
      consumers={[AlertConsumers.SLO, AlertConsumers.ALERTS, AlertConsumers.OBSERVABILITY]}
      query={useSloAlertsQuery(slos, timeRange, showAllGroupByInstances)}
      columns={columns}
      hideLazyLoader
      initialPageSize={ALERTS_PER_PAGE}
      onLoaded={() => {
        if (onLoaded) {
          onLoaded();
        }
      }}
    />
  );
}
