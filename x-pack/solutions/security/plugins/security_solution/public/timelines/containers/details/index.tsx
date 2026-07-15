/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import { useCallback, useEffect, useRef, useState } from 'react';
import deepEqual from 'fast-deep-equal';
import { Subscription } from 'rxjs';

import { isRunningResponse } from '@kbn/data-plugin/common';
import type { TimelineEventsDetailsRequestOptionsInput } from '@kbn/timelines-plugin/common';
import { EntityType } from '@kbn/timelines-plugin/common';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { useKibana } from '../../../common/lib/kibana';
import type {
  SearchHit,
  TimelineEventsDetailsItem,
  TimelineEventsDetailsStrategyResponse,
} from '../../../../common/search_strategy';
import { TimelineEventsQueries } from '../../../../common/search_strategy';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import * as i18n from './translations';

/**
 * Broadens an index name so a document still resolves after its backing index has been relocated to
 * a searchable-snapshot tier and renamed with a `restored-` (cold) or `partial-` (frozen) prefix. A
 * wildcard is inserted immediately before the index name — after the cross-cluster `cluster:` alias
 * when present, so cross-cluster routing is preserved — which makes the pattern match both the
 * original and the prefixed variant, e.g. `sysapp:.ds-logs-windows-2026.05.17` ->
 * `sysapp:*.ds-logs-windows-2026.05.17`, matching `sysapp:restored-.ds-logs-windows-2026.05.17`.
 * Comma-separated lists are handled per entry.
 * See SDH https://github.com/elastic/sdh-security-team/issues/1666.
 */
export const buildFallbackIndexName = (indexName: string): string =>
  indexName
    .split(',')
    .map((entry) => {
      const trimmed = entry.trim();
      if (!trimmed) {
        return trimmed;
      }
      // `cluster:index` is the cross-cluster-search separator; the cluster alias cannot contain `:`.
      const separatorIndex = trimmed.indexOf(':');
      if (separatorIndex === -1) {
        return `*${trimmed}`;
      }
      const clusterAlias = trimmed.slice(0, separatorIndex + 1);
      const index = trimmed.slice(separatorIndex + 1);
      return `${clusterAlias}*${index}`;
    })
    .join(',');

export interface EventsArgs {
  detailsData: TimelineEventsDetailsItem[] | null;
  ecs: Ecs | null;
}

export interface UseTimelineEventsDetailsProps {
  entityType?: EntityType;
  indexName: string;
  eventId: string;
  runtimeMappings: TimelineEventsDetailsRequestOptionsInput['runtimeMappings'];
  skip: boolean;
}

export const useTimelineEventsDetails = ({
  entityType = EntityType.EVENTS,
  indexName,
  eventId,
  runtimeMappings,
  skip,
}: UseTimelineEventsDetailsProps): [
  boolean,
  EventsArgs['detailsData'],
  SearchHit | undefined,
  EventsArgs['ecs'],
  () => Promise<void>
] => {
  const asyncNoop = () => Promise.resolve();
  const { data } = useKibana().services;
  const refetch = useRef<() => Promise<void>>(asyncNoop);
  const abortCtrl = useRef(new AbortController());
  const searchSubscription$ = useRef(new Subscription());
  // Guards the single broadened-index retry so a document that genuinely cannot be found does not
  // loop between the primary and fallback indices. Reset whenever the lookup inputs change.
  const attemptedFallbackRef = useRef(false);

  // loading = false initial state causes flashes of empty tables
  const [loading, setLoading] = useState(true);
  const [timelineDetailsRequest, setTimelineDetailsRequest] =
    useState<TimelineEventsDetailsRequestOptionsInput | null>(null);
  const { addError } = useAppToasts();

  const [timelineDetailsResponse, setTimelineDetailsResponse] =
    useState<EventsArgs['detailsData']>(null);
  const [ecsData, setEcsData] = useState<EventsArgs['ecs']>(null);

  const [rawEventData, setRawEventData] = useState<SearchHit | undefined>(undefined);
  const timelineDetailsSearch = useCallback(
    (request: TimelineEventsDetailsRequestOptionsInput | null) => {
      if (request == null || skip || isEmpty(request.eventId)) {
        return;
      }

      // When the primary lookup finds no document, its index name may have gone stale because the
      // backing index was relocated to a searchable-snapshot tier and renamed with a `restored-`/
      // `partial-` prefix. Retry once against a broadened index pattern that also matches the
      // prefixed variant. Such a stale index currently surfaces as a server error rather than an
      // empty response, so we trigger the retry from both the empty-hit and error paths. See
      // SDH #1666.
      const fallbackIndex = request.indexName
        ? buildFallbackIndexName(request.indexName)
        : undefined;
      const canRetryWithFallback =
        !!fallbackIndex && !attemptedFallbackRef.current && fallbackIndex !== request.indexName;

      const retryWithFallback = () => {
        attemptedFallbackRef.current = true;
        searchSubscription$.current.unsubscribe();
        timelineDetailsSearch({ ...request, indexName: fallbackIndex as string });
      };

      const asyncSearch = async () => {
        abortCtrl.current = new AbortController();
        setLoading(true);

        searchSubscription$.current = data.search
          .search<TimelineEventsDetailsRequestOptionsInput, TimelineEventsDetailsStrategyResponse>(
            request,
            {
              strategy: 'timelineSearchStrategy',
              abortSignal: abortCtrl.current.signal,
            }
          )
          .subscribe({
            next: (response) => {
              if (!isRunningResponse(response)) {
                if (!response.rawResponse.hits.hits[0] && canRetryWithFallback) {
                  retryWithFallback();
                  return;
                }
                Promise.resolve().then(() => {
                  setLoading(false);
                  setTimelineDetailsResponse(response.data || []);
                  setRawEventData(response.rawResponse.hits.hits[0]);
                  setEcsData(response.ecs || null);
                  searchSubscription$.current.unsubscribe();
                });
              }
            },
            error: (msg) => {
              if (canRetryWithFallback) {
                retryWithFallback();
                return;
              }
              setLoading(false);
              addError(msg, { title: i18n.FAIL_TIMELINE_SEARCH_DETAILS });
              searchSubscription$.current.unsubscribe();
            },
          });
      };
      searchSubscription$.current.unsubscribe();
      abortCtrl.current.abort();
      asyncSearch();
      refetch.current = asyncSearch;
    },
    [data.search, addError, skip]
  );

  useEffect(() => {
    // A new document (or index) is being requested: allow the fallback retry to run again.
    attemptedFallbackRef.current = false;
    setTimelineDetailsRequest((prevRequest) => {
      const myRequest = {
        ...(prevRequest ?? {}),
        entityType,
        indexName,
        eventId,
        factoryQueryType: TimelineEventsQueries.details,
        runtimeMappings,
      } as const;
      if (!deepEqual(prevRequest, myRequest)) {
        return myRequest;
      }
      return prevRequest;
    });
  }, [entityType, eventId, indexName, runtimeMappings]);

  useEffect(() => {
    timelineDetailsSearch(timelineDetailsRequest);
    return () => {
      searchSubscription$.current.unsubscribe();
      abortCtrl.current.abort();
    };
  }, [timelineDetailsRequest, timelineDetailsSearch]);

  useEffect(() => {
    if (skip) {
      setLoading(false);
    }
  }, [skip]);

  return [loading, timelineDetailsResponse, rawEventData, ecsData, refetch.current];
};
