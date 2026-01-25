/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useEffect, useState, useCallback, useId } from 'react';
import { ALERT_BUILDING_BLOCK_TYPE } from '@kbn/rule-data-utils';
import { useQueryAlerts } from '../../../../detections/containers/detection_engine/alerts/use_query';
import { ALERTS_QUERY_NAMES } from '../../../../detections/containers/detection_engine/alerts/constants';
import { useGlobalTime } from '../../../../common/containers/use_global_time';

interface UseHasMixedBuildingBlockAlertsParams {
  ruleId: string;
  signalIndexName: string | null;
  skip?: boolean;
}

interface UseHasMixedBuildingBlockAlertsResult {
  loading: boolean;
  hasMixedAlerts: boolean | undefined; // undefined while loading
}

interface BuildingBlockAggregation {
  buildingBlockExists: {
    doc_count: number;
  };
}

/**
 * Hook to detect if a rule has mixed alert types (some with building_block_type, some without).
 * This is used to determine if the building block filter should be shown on the rule details page.
 *
 * Returns hasMixedAlerts = true if:
 * - There are some alerts WITH building_block_type AND some WITHOUT
 *
 * Returns hasMixedAlerts = false if:
 * - All alerts have building_block_type (building block rule)
 * - No alerts have building_block_type (regular rule)
 * - No alerts exist for the rule
 */
export const useHasMixedBuildingBlockAlerts = ({
  ruleId,
  signalIndexName,
  skip = false,
}: UseHasMixedBuildingBlockAlertsParams): UseHasMixedBuildingBlockAlertsResult => {
  // Use global time to register our refetch with the global input system
  const { setQuery: registerQuery, deleteQuery } = useGlobalTime();

  // Generate a unique ID for this hook instance to avoid conflicts
  // when multiple components use this hook
  const queryId = useId();

  // Refresh key to force re-query when refetch is called
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  const query = useMemo(
    () => ({
      size: 0,
      track_total_hits: true,
      query: {
        bool: {
          filter: [
            {
              term: {
                'kibana.alert.rule.uuid': ruleId,
              },
            },
          ],
        },
      },
      aggs: {
        buildingBlockExists: {
          filter: {
            exists: {
              field: ALERT_BUILDING_BLOCK_TYPE,
            },
          },
        },
      },
    }),
    // Include refreshKey to re-query when refetch is called
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ruleId, refreshKey]
  );

  const { loading, data, setQuery } = useQueryAlerts<{}, BuildingBlockAggregation>({
    query,
    indexName: signalIndexName,
    skip: skip || !ruleId || !signalIndexName,
    queryName: ALERTS_QUERY_NAMES.COUNT,
  });

  useEffect(() => {
    setQuery(query);
  }, [setQuery, query]);

  // Register our refetch function with the global input system
  // This makes the refresh button trigger our query re-run
  useEffect(() => {
    if (!skip && ruleId && signalIndexName) {
      registerQuery({
        id: queryId,
        loading,
        refetch,
        inspect: null,
      });
    }

    return () => {
      deleteQuery({ id: queryId });
    };
  }, [skip, ruleId, signalIndexName, loading, refetch, registerQuery, deleteQuery, queryId]);

  const hasMixedAlerts = useMemo(() => {
    // Return undefined while loading to avoid premature decisions
    if (loading || !data) {
      return undefined;
    }

    const totalAlerts = (data.hits?.total as { value: number })?.value ?? 0;
    const buildingBlockAlerts = data.aggregations?.buildingBlockExists?.doc_count ?? 0;

    // Mixed if there are some building block alerts but not all
    return buildingBlockAlerts > 0 && buildingBlockAlerts < totalAlerts;
  }, [loading, data]);

  return { loading, hasMixedAlerts };
};
