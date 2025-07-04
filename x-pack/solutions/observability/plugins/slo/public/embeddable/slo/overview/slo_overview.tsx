/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingChart } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import React, { useEffect, useState } from 'react';
import { Subject } from 'rxjs';
import { useFetchActiveAlerts } from '../../../hooks/use_fetch_active_alerts';
import { useFetchHistoricalSummary } from '../../../hooks/use_fetch_historical_summary';
import { useFetchRulesForSlo } from '../../../hooks/use_fetch_rules_for_slo';
import { useFetchSloDetails } from '../../../hooks/use_fetch_slo_details';
import { SloCardChart } from '../../../pages/slos/components/card_view/slo_card_item';
import { SloCardItemBadges } from '../../../pages/slos/components/card_view/slo_card_item_badges';
import { formatHistoricalData } from '../../../utils/slo/chart_data_formatter';
import { SloOverviewDetails } from '../common/slo_overview_details';

import { SingleSloCustomInput } from './types';

interface Props extends SingleSloCustomInput {
  reloadSubject?: Subject<boolean>;
}

export function SloOverview({ sloId, sloInstanceId, remoteName, reloadSubject }: Props) {
  const [lastRefreshTime, setLastRefreshTime] = useState<number | undefined>(undefined);

  useEffect(() => {
    reloadSubject?.subscribe(() => {
      setLastRefreshTime(Date.now());
    });
    return () => {
      reloadSubject?.unsubscribe();
    };
  }, [reloadSubject]);

  const {
    isLoading,
    data: slo,
    refetch,
    isRefetching,
  } = useFetchSloDetails({
    sloId,
    remoteName,
    instanceId: sloInstanceId,
  });

  const { data: rulesBySlo } = useFetchRulesForSlo({
    sloIds: sloId ? [sloId] : [],
  });

  const { data: activeAlertsBySlo } = useFetchActiveAlerts({
    sloIdsAndInstanceIds: slo ? [[slo.id, slo.instanceId] as [string, string]] : [],
  });

  const { data: historicalSummaries = [] } = useFetchHistoricalSummary({
    sloList: slo ? [slo] : [],
  });

  const [selectedSlo, setSelectedSlo] = useState<SLOWithSummaryResponse | null>(null);

  useEffect(() => {
    refetch();
  }, [lastRefreshTime, refetch]);

  const isSloNotFound = !isLoading && slo === undefined;

  if (isRefetching || isLoading || !slo) {
    return (
      <LoadingContainer>
        <LoadingContent>
          <EuiLoadingChart />
        </LoadingContent>
      </LoadingContainer>
    );
  }

  if (isSloNotFound) {
    return (
      <LoadingContainer>
        <LoadingContent>
          {i18n.translate('xpack.slo.sloEmbeddable.overview.sloNotFoundText', {
            defaultMessage:
              'The SLO has been deleted. You can safely delete the widget from the dashboard.',
          })}
        </LoadingContent>
      </LoadingContainer>
    );
  }

  const rules = rulesBySlo?.[slo?.id];
  const activeAlerts = activeAlertsBySlo.get(slo);

  const historicalSummary = historicalSummaries.find(
    (histSummary) => histSummary.sloId === slo.id && histSummary.instanceId === slo.instanceId
  )?.data;

  const historicalSliData = formatHistoricalData(historicalSummary, 'sli_value');

  return (
    <div data-test-subj="sloSingleOverviewPanel" data-shared-item="" style={{ width: '100%' }}>
      <SloCardChart
        slo={slo}
        historicalSliData={historicalSliData ?? []}
        onClick={() => {
          setSelectedSlo(slo);
        }}
        badges={<SloCardItemBadges slo={slo} rules={rules} activeAlerts={activeAlerts} />}
      />
      <SloOverviewDetails slo={selectedSlo} setSelectedSlo={setSelectedSlo} />
    </div>
  );
}

export const LoadingContainer = euiStyled.div`
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 100%;
  height: 100%;
`;

export const LoadingContent = euiStyled.div`
  flex: 0 0 auto;
  align-self: center;
  text-align: center;
`;
