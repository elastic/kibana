/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useAssistantContext } from '@kbn/elastic-assistant';
import { getValueMetrics, type ValueMetrics } from './metrics';
import { useKibana } from '../../../common/lib/kibana';
import { useFindAttackDiscoveries } from '../../../attack_discovery/pages/use_find_attack_discoveries';
import {
  ACKNOWLEDGED,
  CLOSED,
  OPEN,
} from '../../../attack_discovery/pages/results/history/search_and_filter/translations';
import { getPreviousTimeRange } from '../../../common/utils/get_time_range';
import { useAlertCountQuery } from '../../pages/use_alert_count_query';
import { useSignalIndex } from '../../../detections/containers/detection_engine/alerts/use_signal_index';
interface Props {
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

export const useValueMetrics = ({ from, to, minutesPerAlert }: Props): UseValueMetrics => {
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
      isAssistantEnabled: assistantAvailability.isAssistantEnabled,
      start: compareTimeRange.from,
      status: [OPEN, ACKNOWLEDGED, CLOSED].map((s) => s.toLowerCase()),
    });

  const { alertCount, isLoading: isLoadingAlerts } = useAlertCountQuery({
    to,
    from,
    signalIndexName,
  });
  const { alertCount: alertCountCompare, isLoading: isLoadingAlertsCompare } = useAlertCountQuery({
    to: compareTimeRange.to,
    from: compareTimeRange.from,
    signalIndexName,
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
        attackDiscoveryCount: data?.total ?? 0,
        totalAlerts: alertCount,
        attackAlertsCount: data?.unique_alert_ids_count ?? 0,
        minutesPerAlert,
      }),
    [alertCount, data?.total, data?.unique_alert_ids_count, minutesPerAlert]
  );
  const valueMetricsCompare = useMemo(
    () =>
      getValueMetrics({
        attackDiscoveryCount: compareAdData?.total ?? 0,
        totalAlerts: alertCountCompare,
        attackAlertsCount: compareAdData?.unique_alert_ids_count ?? 0,
        minutesPerAlert,
      }),
    [
      alertCountCompare,
      compareAdData?.total,
      compareAdData?.unique_alert_ids_count,
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
