/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
import { useFetchActiveAlerts } from '../../../../hooks/use_fetch_active_alerts';
import { useFetchHistoricalSummary } from '../../../../hooks/use_fetch_historical_summary';
import { useFetchRulesForSlo } from '../../../../hooks/use_fetch_rules_for_slo';
import { SloListEmpty } from '../slo_list_empty';
import { SloListError } from '../slo_list_error';
import { SloListItem } from './slo_list_item';

export interface Props {
  sloList: SLOWithSummaryResponse[];
  loading: boolean;
  error: boolean;
}

export function SloListView({ sloList, loading, error }: Props) {
  const sloIdsAndInstanceIds = sloList.map((slo) => [slo.id, slo.instanceId] as [string, string]);
  const { data: activeAlertsBySlo } = useFetchActiveAlerts({ sloIdsAndInstanceIds });
  const { data: rulesBySlo, refetchRules } = useFetchRulesForSlo({
    sloIds: sloIdsAndInstanceIds.map((item) => item[0]),
  });
  const { isLoading: historicalSummaryLoading, data: historicalSummaries = [] } =
    useFetchHistoricalSummary({
      sloList,
    });

  if (!loading && !error && sloList.length === 0) {
    return <SloListEmpty />;
  }

  if (!loading && error) {
    return <SloListError />;
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      {sloList.map((slo) => (
        <EuiFlexItem key={`${slo.id}-${slo.instanceId}`}>
          <SloListItem
            activeAlerts={activeAlertsBySlo.get(slo)}
            rules={rulesBySlo?.[slo.id]}
            historicalSummary={
              historicalSummaries.find(
                (historicalSummary) =>
                  historicalSummary.sloId === slo.id &&
                  historicalSummary.instanceId === slo.instanceId
              )?.data
            }
            historicalSummaryLoading={historicalSummaryLoading}
            slo={slo}
            refetchRules={refetchRules}
          />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}
