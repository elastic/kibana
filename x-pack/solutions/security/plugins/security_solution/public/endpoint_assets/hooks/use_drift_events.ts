/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type {
  DriftEvent,
  DriftEventsResponse,
  DriftSummaryResponse,
  DriftCategory,
  DriftSeverity,
} from '../../../common/endpoint_assets';
import { ENDPOINT_ASSETS_ROUTES } from '../../../common/endpoint_assets';

/**
 * Time window in milliseconds for grouping add/remove pairs
 * Events within this window with same host+item+category will be merged
 */
const MERGE_TIME_WINDOW_MS = 5000;

/**
 * Merges paired "added" and "removed" events into single "modified" events.
 *
 * When osquery's differential mode detects a change in any column (e.g., service status),
 * it reports the old row as "removed" and new row as "added". This function detects
 * these pairs and merges them into a cleaner "modified" event.
 *
 * Grouping criteria:
 * - Same host_id
 * - Same item_name
 * - Same category
 * - Within MERGE_TIME_WINDOW_MS of each other
 */
const mergeAddRemovePairs = (events: DriftEvent[]): DriftEvent[] => {
  if (events.length === 0) return events;

  // Group events by key (host_id + item_name + category)
  const groups = new Map<string, DriftEvent[]>();

  for (const event of events) {
    const key = `${event.host.id}|${event.drift.item.name}|${event.drift.category}`;
    const existing = groups.get(key) ?? [];
    existing.push(event);
    groups.set(key, existing);
  }

  const result: DriftEvent[] = [];

  for (const groupEvents of groups.values()) {
    if (groupEvents.length === 1) {
      // Single event, no merging needed
      result.push(groupEvents[0]);
      continue;
    }

    // Sort by timestamp
    groupEvents.sort(
      (a, b) => new Date(a['@timestamp']).getTime() - new Date(b['@timestamp']).getTime()
    );

    // Try to find add/remove pairs within time window
    const processed = new Set<number>();

    for (let i = 0; i < groupEvents.length; i++) {
      if (processed.has(i)) continue;

      const event = groupEvents[i];
      const eventTime = new Date(event['@timestamp']).getTime();

      // Look for a matching pair
      let foundPair = false;

      for (let j = i + 1; j < groupEvents.length; j++) {
        if (processed.has(j)) continue;

        const otherEvent = groupEvents[j];
        const otherTime = new Date(otherEvent['@timestamp']).getTime();

        // Check if within time window
        if (Math.abs(otherTime - eventTime) > MERGE_TIME_WINDOW_MS) {
          break; // Events are sorted, so no more matches possible
        }

        // Check if this is an add/remove pair
        const actions = [event.drift.action, otherEvent.drift.action].sort();
        if (actions[0] === 'added' && actions[1] === 'removed') {
          // Found a pair - merge into "modified"
          const mergedEvent: DriftEvent = {
            ...event,
            '@timestamp': event['@timestamp'], // Use earlier timestamp
            drift: {
              ...event.drift,
              action: 'modified',
            },
          };
          result.push(mergedEvent);
          processed.add(i);
          processed.add(j);
          foundPair = true;
          break;
        }
      }

      if (!foundPair) {
        result.push(event);
        processed.add(i);
      }
    }
  }

  // Sort final result by timestamp descending (most recent first)
  result.sort(
    (a, b) => new Date(b['@timestamp']).getTime() - new Date(a['@timestamp']).getTime()
  );

  return result;
};

const QUERY_KEY = 'endpoint-assets-drift-events';

interface UseDriftEventsOptions {
  timeRange?: string;
  categories?: DriftCategory[];
  severities?: DriftSeverity[];
  hostId?: string;
  page?: number;
  pageSize?: number;
}

interface UseDriftEventsResult {
  data: DriftEventsResponse | null;
  loading: boolean;
  error: Error | null;
  refresh: () => void;
}

export const useDriftEvents = (
  options: UseDriftEventsOptions = {}
): UseDriftEventsResult => {
  const {
    timeRange = '24h',
    categories = [],
    severities = [],
    hostId = '',
    page = 1,
    pageSize = 10,
  } = options;
  const { services } = useKibana();
  const queryClient = useQueryClient();

  const fetchDriftEvents = useCallback(async (): Promise<DriftEventsResponse> => {
    const { http } = services;
    if (!http) {
      throw new Error('HTTP service not available');
    }

    const response = await http.get<DriftSummaryResponse>(ENDPOINT_ASSETS_ROUTES.DRIFT_SUMMARY, {
      query: {
        time_range: timeRange,
        categories: categories.length > 0 ? categories.join(',') : undefined,
        severities: severities.length > 0 ? severities.join(',') : undefined,
        host_id: hostId || undefined,
        page,
        page_size: pageSize,
      },
    });

    // Transform DriftSummaryResponse to DriftEventsResponse
    const rawEvents: DriftEvent[] = response.recent_changes.map((change) => ({
      '@timestamp': change.timestamp,
      host: {
        id: change.host_id,
        name: change.host_name,
        os: { platform: 'unknown' },
      },
      agent: {
        id: change.host_id,
      },
      drift: {
        category: change.category as 'privileges' | 'persistence' | 'network' | 'software' | 'posture',
        action: change.action as 'added' | 'removed' | 'modified',
        severity: change.severity as 'critical' | 'high' | 'medium' | 'low',
        item: {
          type: change.category,
          name: change.item_name,
        },
      },
    }));

    // Merge add/remove pairs into "modified" events
    const mergedEvents = mergeAddRemovePairs(rawEvents);

    return {
      events: mergedEvents,
      total: response.total_recent_changes ?? response.recent_changes.length,
      page: response.page ?? page,
      page_size: response.page_size ?? pageSize,
    };
  }, [services, timeRange, categories, severities, hostId, page, pageSize]);

  const { data, isLoading, error } = useQuery({
    queryKey: [QUERY_KEY, timeRange, categories, severities, hostId, page, pageSize],
    queryFn: fetchDriftEvents,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: [QUERY_KEY, timeRange, categories, severities, hostId, page, pageSize],
    });
  }, [queryClient, timeRange, categories, severities, hostId, page, pageSize]);

  return {
    data: data ?? null,
    loading: isLoading,
    error: error as Error | null,
    refresh,
  };
};
