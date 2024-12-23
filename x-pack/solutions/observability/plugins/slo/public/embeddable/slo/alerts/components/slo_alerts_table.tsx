/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { AlertConsumers, SLO_BURN_RATE_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import type { TimeRange } from '@kbn/es-query';
import { ALL_VALUE } from '@kbn/slo-schema';
import { AlertsTableStateProps } from '@kbn/triggers-actions-ui-plugin/public/application/sections/alerts_table/alerts_table_state';
import { SloEmbeddableDeps } from '../types';
import type { SloItem } from '../types';
import { SLO_ALERTS_TABLE_CONFIG_ID } from '../../constants';

const ALERTS_PER_PAGE = 10;
const ALERTS_TABLE_ID = 'xpack.observability.sloAlertsEmbeddable.alert.table';

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
    const query: AlertsTableStateProps['query'] = {
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
  deps,
  timeRange,
  onLoaded,
  lastReloadRequestTime,
  showAllGroupByInstances,
}: Props) {
  const {
    triggersActionsUi: { alertsTableConfigurationRegistry, getAlertsStateTable: AlertsStateTable },
    observability: { observabilityRuleTypeRegistry },
  } = deps;
  return (
    <AlertsStateTable
      query={useSloAlertsQuery(slos, timeRange, showAllGroupByInstances)}
      alertsTableConfigurationRegistry={alertsTableConfigurationRegistry}
      configurationId={SLO_ALERTS_TABLE_CONFIG_ID}
      ruleTypeIds={[SLO_BURN_RATE_RULE_TYPE_ID]}
      consumers={[AlertConsumers.SLO, AlertConsumers.ALERTS, AlertConsumers.OBSERVABILITY]}
      hideLazyLoader
      id={ALERTS_TABLE_ID}
      initialPageSize={ALERTS_PER_PAGE}
      showAlertStatusWithFlapping
      onLoaded={() => {
        if (onLoaded) {
          onLoaded();
        }
      }}
      lastReloadRequestTime={lastReloadRequestTime}
      cellContext={{ observabilityRuleTypeRegistry }}
    />
  );
}
