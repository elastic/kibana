/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BrowserFields, TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import { getTimelineFieldsDataFromHit } from '@kbn/timelines-plugin/common';
import type { EventHit, RunTimeMappings } from '@kbn/timelines-plugin/common/search_strategy';
import type { SearchHit as EsSearchHit } from '@elastic/elasticsearch/lib/api/types';
import {
  ALERT_ATTACK_DISCOVERY_ALERT_IDS,
  type AttackDiscoveryAlert,
  transformAttackDiscoveryAlertDocumentToApi,
  transformAttackDiscoveryAlertFromApi,
  type AttackDiscoveryAlertDocument,
} from '@kbn/elastic-assistant-common';
import { useCallback, useEffect, useMemo } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { SearchHit } from '../../../../../common/search_strategy';

import { PageScope } from '../../../../data_view_manager/constants';
import { useBrowserFields } from '../../../../data_view_manager/hooks/use_browser_fields';
import { useDataView } from '../../../../data_view_manager/hooks/use_data_view';
import { useTimelineEventsDetails } from '../../../../timelines/containers/details';
import type { GetFieldsData } from '../../../../flyout/document_details/shared/hooks/use_get_fields_data';
import { useGetFieldsData } from '../../../../flyout/document_details/shared/hooks/use_get_fields_data';
import { useAttackDetailsSubscription } from './attack_details_cache';

export interface UseAttackDetailsResult {
  /**
   * The attack discovery alert object constructed from the search hit
   */
  attack: AttackDiscoveryAlert | null;
  /**
   * An object containing fields by type
   */
  browserFields: BrowserFields;
  /**
   * An array of field objects with category and value
   */
  dataFormattedForFieldBrowser: TimelineEventsDetailsItem[] | null;
  /**
   * The actual raw document object
   */
  searchHit: SearchHit | undefined;
  /**
   * Retrieves searchHit values for the provided field
   */
  getFieldsData: GetFieldsData;
  /**
   * Whether the data is loading
   */
  loading: boolean;
  /**
   * Refetch the attack document from the server
   */
  refetch: () => Promise<void>;
}

export interface UseAttackDetailsOptions {
  /**
   * Optional caller-provided refresh hand. Invoked by the returned `refetch`
   * when the hook's own `useTimelineEventsDetails` fetch is skipped because
   * `hit.raw._source` is already populated. Lets callers (e.g. the V1 thin
   * wrappers and the Discover lazy wrappers) trigger their own upstream
   * refresh so mutations on Status / Assignees / take-action items keep
   * updating the displayed data.
   */
  refresh?: () => Promise<void> | void;
}

/**
 * Fetches the attack-discovery document for the given hit and exposes the
 * derived data the v2 attack-details flyout consumes (browserFields,
 * dataFormattedForFieldBrowser, searchHit, refetch, …).
 *
 * `attackId` is derived from `hit.raw._id` (the actual Elasticsearch `_id`)
 * and `indexName` from `hit.raw._index`, mirroring how
 * `flyout_v2/document/main/` derives identifiers from the hit Discover
 * provides. `hit.id` cannot be used here because `buildDataTableRecord`
 * builds it as the composite `${_index}::${_id}::${_routing}` key, which
 * does not match anything when sent as `terms: { _id: [...] }` to the
 * timeline-details search strategy.
 *
 * Multiple components mounted with the same `(indexName, attackId)` are
 * deduplicated through {@link useAttackDetailsSubscription}: only the
 * primary subscriber's `useTimelineEventsDetails` actually runs the search;
 * the rest read the published snapshot from the cache. When the primary
 * unmounts, the next-in-order is promoted and re-renders to start its own
 * search.
 *
 * When `hit.raw._source` is already populated (V1 path: `useAttackHit`
 * built the hit from an upstream timeline-details fetch and passed it
 * through), the hook resolves synchronously without firing a second
 * identical fetch. `dataFormattedForFieldBrowser` is always derived
 * locally from the resolved `searchHit` via `getTimelineFieldsDataFromHit`
 * — the server-side `timelineEventsDetails.parse` step does no more than
 * that.
 */
export const useAttackDetails = (
  hit: DataTableRecord,
  { refresh }: UseAttackDetailsOptions = {}
): UseAttackDetailsResult => {
  const attackId = hit.raw._id ?? '';
  const indexName = hit.raw._index ?? '';

  // `hit.raw._source` is "ready" — usable without firing our own
  // timeline-details fetch — only when it carries the flat, dotted
  // attack-discovery keys (e.g. `kibana.alert.attack_discovery.alert_ids`
  // as a top-level array property) that
  // `transformAttackDiscoveryAlertDocumentToApi` reads. That's the shape
  // ES `_source` has on the V1 path (after `useAttackHit`'s
  // timeline-details fetch) and on the Discover lazy-wrapper path (the
  // rendered hit already carries the full document).
  //
  // A simple presence check (`_source != null`) is not enough: callers
  // can supply a `_source` that is populated but in the wrong shape, and
  // the transform reads top-level dotted properties only — it would
  // silently yield a null `attack` for a wrong-shape source. The canonical
  // example, exercised by the tests, is timeline's
  // `eventData.raw._source = ecs`: a nested ECS object such as
  // `{ kibana: { alert: { attack_discovery: { alert_ids: [...] } } } }`
  // where `alert_ids` lives at a nested path rather than as the top-level
  // dotted `kibana.alert.attack_discovery.alert_ids` key. Probing for that
  // top-level dotted key with `Array.isArray` distinguishes the two
  // shapes, so wrong-shape sources fall through to the fetch and the
  // transform sees the keys it expects.
  const hasSource =
    hit.raw._source != null &&
    typeof hit.raw._source === 'object' &&
    Array.isArray((hit.raw._source as Record<string, unknown>)[ALERT_ATTACK_DISCOVERY_ALERT_IDS]);

  const { isPrimary, cachedSnapshot, publishSnapshot } = useAttackDetailsSubscription(
    indexName,
    attackId
  );

  const pageScope = PageScope.attacks;
  const { dataView } = useDataView(pageScope);
  const browserFields = useBrowserFields(pageScope);
  const runtimeMappings = dataView?.getRuntimeMappings() as RunTimeMappings;

  const [primaryLoading, , primarySearchHit, , primaryRefetch] = useTimelineEventsDetails({
    indexName,
    eventId: attackId,
    runtimeMappings,
    skip: !attackId || !isPrimary || hasSource,
  });

  const searchHit: SearchHit | undefined = hasSource
    ? (hit.raw as unknown as SearchHit)
    : isPrimary
    ? primarySearchHit
    : cachedSnapshot?.searchHit;

  const loading = hasSource ? false : isPrimary ? primaryLoading : cachedSnapshot?.loading ?? true;

  const refetch = useCallback(async () => {
    if (hasSource) {
      if (refresh) {
        await refresh();
      }
      return;
    }
    if (isPrimary) {
      await primaryRefetch();
      return;
    }
    if (cachedSnapshot?.refetch) {
      await cachedSnapshot.refetch();
    }
  }, [cachedSnapshot, hasSource, isPrimary, primaryRefetch, refresh]);

  // The primary publishes its resolved values so secondaries (whose own
  // `hit.raw._source` may be empty) read a coherent snapshot regardless of
  // whether the primary skipped its fetch.
  useEffect(() => {
    if (!isPrimary) {
      return;
    }
    publishSnapshot({
      loading,
      searchHit,
      refetch,
    });
  }, [isPrimary, loading, searchHit, refetch, publishSnapshot]);

  const dataFormattedForFieldBrowser = useMemo(
    () =>
      searchHit
        ? getTimelineFieldsDataFromHit(searchHit as unknown as EsSearchHit<EventHit>)
        : null,
    [searchHit]
  );

  const attack = useMemo(() => {
    const source = searchHit?._source;
    if (!source || !attackId) {
      return null;
    }
    try {
      const apiAlert = transformAttackDiscoveryAlertDocumentToApi({
        attackDiscoveryAlertDocument: source as AttackDiscoveryAlertDocument,
        enableFieldRendering: true,
        id: searchHit._id ?? attackId,
        index: searchHit._index,
        withReplacements: true,
      });
      return transformAttackDiscoveryAlertFromApi(apiAlert);
    } catch {
      return null;
    }
  }, [attackId, searchHit]);

  const { getFieldsData } = useGetFieldsData({ fieldsData: searchHit?.fields });

  return {
    attack,
    browserFields,
    dataFormattedForFieldBrowser,
    searchHit,
    getFieldsData,
    loading,
    refetch,
  };
};
