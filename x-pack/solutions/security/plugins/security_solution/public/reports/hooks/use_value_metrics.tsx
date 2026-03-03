/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useAssistantContext } from '@kbn/elastic-assistant';
import { getExcludeAlertsFilters } from '../components/ai_value/utils';
import { useAlertCountQuery } from './use_alert_count_query';
import { getValueMetrics, type ValueMetrics } from '../components/ai_value/metrics';
import { useKibana } from '../../common/lib/kibana';
import { useFindAttackDiscoveries } from '../../attack_discovery/pages/use_find_attack_discoveries';
import { ALERTS_QUERY_NAMES } from '../../detections/containers/detection_engine/alerts/constants';
import {
  ACKNOWLEDGED,
  CLOSED,
  OPEN,
} from '../../attack_discovery/pages/results/history/search_and_filter/translations';
import { getPreviousTimeRange } from '../../common/utils/get_time_range';
import { useSignalIndex } from '../../detections/containers/detection_engine/alerts/use_signal_index';
interface Props {
  analystHourlyRate: number;
  from: string;
  to: string;
  minutesPerAlert: number;
}
interface UseValueMetrics {
  attackAlertIds: string[];
  isLoading: boolean;
  valueMetrics: ValueMetrics;
  valueMetricsCompare: ValueMetrics;
}

export const useValueMetrics = ({
  analystHourlyRate,
  from,
  to,
  minutesPerAlert,
}: Props): UseValueMetrics => {
  const { http } = useKibana().services;
  const { assistantAvailability } = useAssistantContext();
  const { signalIndexName } = useSignalIndex();
  const { data, isLoading: isLoadingAttackDiscoveries } = useFindAttackDiscoveries({
    end: to,
    http,
    includeUniqueAlertIds: true,
    isAssistantEnabled: assistantAvailability.isAssistantEnabled,
    start: from,
    status: [OPEN, ACKNOWLEDGED, CLOSED].map((s) => s.toLowerCase()),
  });
  const compareTimeRange = useMemo(() => getPreviousTimeRange({ from, to }), [from, to]);
  const { data: compareAdData, isLoading: isLoadingAttackDiscoveriesCompare } =
    useFindAttackDiscoveries({
      end: compareTimeRange.to,
      http,
      includeUniqueAlertIds: true,
      isAssistantEnabled: assistantAvailability.isAssistantEnabled,
      start: compareTimeRange.from,
      status: [OPEN, ACKNOWLEDGED, CLOSED].map((s) => s.toLowerCase()),
    });

  const filters = useMemo(
    () => getExcludeAlertsFilters(data?.unique_alert_ids ?? []),
    [data?.unique_alert_ids]
  );

  const filtersCompare = useMemo(
    () => getExcludeAlertsFilters(compareAdData?.unique_alert_ids ?? []),
    [compareAdData?.unique_alert_ids]
  );

  const { alertCount: filteredAlertsCount } = useAlertCountQuery({
    to,
    from,
    signalIndexName,
    filters,
    queryName: ALERTS_QUERY_NAMES.COUNT_AI_VALUE,
  });

  const { alertCount: filteredAlertsCountCompare } = useAlertCountQuery({
    to: compareTimeRange.to,
    from: compareTimeRange.from,
    signalIndexName,
    filters: filtersCompare,
    queryName: ALERTS_QUERY_NAMES.COUNT_AI_VALUE_COMPARE,
  });

  const { alertCount, isLoading: isLoadingAlerts } = useAlertCountQuery({
    to,
    from,
    signalIndexName,
    queryName: ALERTS_QUERY_NAMES.COUNT_AI_VALUE_TOTAL,
  });
  const { alertCount: alertCountCompare, isLoading: isLoadingAlertsCompare } = useAlertCountQuery({
    to: compareTimeRange.to,
    from: compareTimeRange.from,
    signalIndexName,
    queryName: ALERTS_QUERY_NAMES.COUNT_AI_VALUE_TOTAL_COMPARE,
  });
  const isLoading = useMemo(
    () =>
      isLoadingAlerts ||
      isLoadingAlertsCompare ||
      isLoadingAttackDiscoveriesCompare ||
      isLoadingAttackDiscoveries,
    [
      isLoadingAlerts,
      isLoadingAlertsCompare,
      isLoadingAttackDiscoveries,
      isLoadingAttackDiscoveriesCompare,
    ]
  );

  const valueMetrics = useMemo(
    () =>
      getValueMetrics({
        analystHourlyRate,
        attackDiscoveryCount: data?.total ?? 0,
        totalAlerts: alertCount,
        // @ts-expect-error upgrade typescript v5.9.3
        escalatedAlertsCount: alertCount - filteredAlertsCount ?? 0,
        minutesPerAlert,
      }),
    [analystHourlyRate, data?.total, alertCount, filteredAlertsCount, minutesPerAlert]
  );
  const valueMetricsCompare = useMemo(
    () =>
      getValueMetrics({
        analystHourlyRate,
        attackDiscoveryCount: compareAdData?.total ?? 0,
        totalAlerts: alertCountCompare,
        // @ts-expect-error upgrade typescript v5.9.3
        escalatedAlertsCount: alertCountCompare - filteredAlertsCountCompare ?? 0,
        minutesPerAlert,
      }),
    [
      alertCountCompare,
      analystHourlyRate,
      compareAdData?.total,
      filteredAlertsCountCompare,
      minutesPerAlert,
    ]
  );

  return {
    attackAlertIds: data?.unique_alert_ids ?? [],
    isLoading,
    valueMetrics,
    valueMetricsCompare,
  };
};
