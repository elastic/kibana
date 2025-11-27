/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiLoadingChart } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { ALL_VALUE } from '@kbn/slo-schema';
import React, { useEffect, useRef, useState } from 'react';
import { useFetchHistoricalSummary } from '../../../hooks/use_fetch_historical_summary';
import { useFetchSloDetails } from '../../../hooks/use_fetch_slo_details';
import { useFetchSloList } from '../../../hooks/use_fetch_slo_list';
import { ErrorBudgetChart } from '../../../pages/slo_details/components/error_budget_chart';
import { ErrorBudgetHeader } from '../../../pages/slo_details/components/error_budget_header';
import { SLOGroupings } from '../../../pages/slos/components/common/slo_groupings';
import { formatHistoricalData } from '../../../utils/slo/chart_data_formatter';
import { SloOverviewDetails } from '../common/slo_overview_details';
import type { EmbeddableSloProps } from './types';

export function SloErrorBudget({
  sloId,
  sloInstanceId,
  onRenderComplete,
  reloadSubject,
}: EmbeddableSloProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedSlo, setSelectedSlo] = useState<SLOWithSummaryResponse | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<number | undefined>(undefined);

  useEffect(() => {
    reloadSubject?.subscribe(() => {
      setLastRefreshTime(Date.now());
    });
    return () => {
      reloadSubject?.unsubscribe();
    };
  }, [reloadSubject]);

  const kqlQuery = `slo.id:"${sloId}" and slo.instanceId:"${sloInstanceId}"`;

  const { data: sloList } = useFetchSloList({
    kqlQuery,
  });

  const { isLoading: historicalSummaryLoading, data: historicalSummaries = [] } =
    useFetchHistoricalSummary({
      sloList: sloList?.results ?? [],
      shouldRefetch: false,
    });

  const sloHistoricalSummary = historicalSummaries.find(
    (historicalSummary) =>
      historicalSummary.sloId === sloId &&
      historicalSummary.instanceId === (sloInstanceId ?? ALL_VALUE)
  );

  const errorBudgetBurnDownData = formatHistoricalData(
    sloHistoricalSummary?.data,
    'error_budget_remaining'
  );

  const {
    isLoading,
    data: slo,
    refetch,
    isRefetching,
  } = useFetchSloDetails({
    sloId,
    instanceId: sloInstanceId,
  });

  useEffect(() => {
    refetch();
  }, [lastRefreshTime, refetch]);
  useEffect(() => {
    if (!onRenderComplete) return;

    if (!isLoading) {
      onRenderComplete();
    }
  }, [isLoading, onRenderComplete]);

  if (isRefetching || isLoading) {
    return (
      <EuiFlexGroup direction="row" gutterSize="s" alignItems="center" justifyContent="center">
        <EuiFlexItem grow={false}>
          <EuiLoadingChart />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  const isSloNotFound = slo === undefined;
  if (isSloNotFound) {
    return (
      <EuiFlexGroup direction="row" gutterSize="s" alignItems="center" justifyContent="center">
        <EuiFlexItem grow={false}>
          {i18n.translate('xpack.slo.sloEmbeddable.overview.sloNotFoundText', {
            defaultMessage:
              'The SLO has been deleted. You can safely delete the widget from the dashboard.',
          })}
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  const hasGroupBy = slo.instanceId !== ALL_VALUE;

  return (
    <div data-shared-item="" ref={containerRef} style={{ width: '100%', padding: 10 }}>
      <EuiFlexGroup direction="column" gutterSize="xs">
        <EuiFlexItem>
          <EuiLink
            css={{ fontSize: '16px' }}
            data-test-subj="o11ySloErrorBudgetLink"
            onClick={() => {
              setSelectedSlo(slo);
            }}
          >
            <h4>{slo.name}</h4>
          </EuiLink>
        </EuiFlexItem>

        {hasGroupBy && (
          <EuiFlexItem grow={false}>
            <SLOGroupings slo={slo} />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      <EuiFlexGroup direction="column" gutterSize="l">
        <ErrorBudgetHeader hideTitle={true} slo={slo} />
        <ErrorBudgetChart
          data={errorBudgetBurnDownData}
          isLoading={historicalSummaryLoading}
          slo={slo!}
        />
      </EuiFlexGroup>

      <SloOverviewDetails slo={selectedSlo} setSelectedSlo={setSelectedSlo} />
    </div>
  );
}
