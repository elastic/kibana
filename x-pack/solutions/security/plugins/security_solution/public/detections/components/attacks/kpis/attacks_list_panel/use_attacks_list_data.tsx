/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useState } from 'react';
import type { Filter, Query } from '@kbn/es-query';
import { ALERTS_QUERY_NAMES } from '../../../../containers/detection_engine/alerts/constants';
import { useAttackTitles } from './use_attack_titles';
import { useAlertsAggregation } from '../common/use_alerts_aggregation';
import type { AttacksListAgg, AttacksListBucket, AttacksListItem } from './types';
import type { SeverityCount } from '../../../../../entity_analytics/components/severity/types';
import { RiskSeverity } from '../../../../../../common/search_strategy';
import { getAttacksListAggregations } from './aggregations';

/** The default page size */
const DEFAULT_PAGE_SIZE = 5;

export interface UseAttacksListDataProps {
  /** Optional array of filters to apply to the query */
  filters?: Filter[];
  /** Optional query object */
  query?: Query;
  /** Optional page size */
  pageSize?: number;
}

const getSeverityKey = (key: string): RiskSeverity => {
  switch (key) {
    case 'critical':
      return RiskSeverity.Critical;
    case 'high':
      return RiskSeverity.High;
    case 'moderate':
      return RiskSeverity.Moderate;
    case 'low':
      return RiskSeverity.Low;
    default:
      return RiskSeverity.Unknown;
  }
};

/**
 * Hook for fetching and parsing attacks list data
 * @param props - The props for the hook
 * @returns The parsed chart data and loading state
 */
export const useAttacksListData = ({
  filters,
  query,
  pageSize: initialPageSize = DEFAULT_PAGE_SIZE,
}: UseAttacksListDataProps) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const aggs = useMemo(
    () => getAttacksListAggregations(pageIndex, pageSize),
    [pageIndex, pageSize]
  );

  // Get the attack IDs
  const {
    data: aggData,
    loading: isAggLoading,
    refetch: refetchAgg,
  } = useAlertsAggregation<AttacksListAgg>({
    filters,
    query,
    aggs,
    queryName: ALERTS_QUERY_NAMES.COUNT_ATTACKS_IDS,
  });

  const {
    attackIds,
    items: pageItems,
    total,
  } = useMemo(() => {
    const buckets = aggData?.aggregations?.attacks?.buckets ?? [];
    const items = buckets.map((b: AttacksListBucket) => ({
      id: b.key,
      alertsCount: b.attackRelatedAlerts?.doc_count ?? 0,
      severityCount: (b.alertsSeverities?.buckets ?? []).reduce<SeverityCount>((acc, curr) => {
        const severityKey = getSeverityKey(curr.key);
        acc[severityKey] = curr.doc_count;
        return acc;
      }, {} as SeverityCount),
    }));
    const ids = items.map((item) => item.id);
    const totalCount = aggData?.aggregations?.total_attacks?.value ?? 0;

    return { attackIds: ids, items, total: totalCount };
  }, [aggData]);

  // Get the attack titles
  const {
    attackTitles,
    isLoading: isAttacksLoading,
    refetch: refetchDetails,
  } = useAttackTitles({
    attackIds,
  });

  // Get the items
  const items = useMemo<AttacksListItem[]>(() => {
    return attackIds.map((attackId, index) => {
      const attackTitle = attackTitles[attackId];
      const item = pageItems[index];
      return {
        ...item,
        name: attackTitle || attackId,
      };
    });
  }, [attackIds, pageItems, attackTitles]);

  // Refetch the attack IDs and titles
  const refetch = () => {
    refetchAgg?.();
    refetchDetails?.();
  };

  return {
    items,
    isLoading: isAggLoading || (attackIds.length > 0 && isAttacksLoading),
    pageIndex,
    setPageIndex,
    pageSize,
    setPageSize,
    total,
    refetch,
  };
};
