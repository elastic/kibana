/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { DataTableRecord, EsHitRecord } from '@kbn/discover-utils';
import { buildDataTableRecord } from '@kbn/discover-utils';
import type { RunTimeMappings } from '@kbn/timelines-plugin/common/search_strategy';
import { PageScope } from '../../../data_view_manager/constants';
import { useDataView } from '../../../data_view_manager/hooks/use_data_view';
import { useTimelineEventsDetails } from '../../../timelines/containers/details';

export interface UseAttackHitResult {
  /**
   * The fetched attack-discovery document as a {@link DataTableRecord} ready
   * to be threaded to the v2 attack-details surface, or `null` while the
   * request is in flight or the document cannot be found.
   */
  hit: DataTableRecord | null;
  /**
   * Whether the fetch is in flight.
   */
  loading: boolean;
  /**
   * Refetches the attack document; forwarded to v2 components that mutate
   * the document so the next render reflects the new state.
   */
  refetch: () => Promise<void>;
}

/**
 * Tiny helper shared by the three legacy expandable-flyout entry points
 * (`flyout/attack_details/{index,preview/index,left/index}.tsx`). Receives
 * the panel-key `attackId` / `indexName` params, fetches the underlying
 * search hit via {@link useTimelineEventsDetails}, and exposes the result
 * as a {@link DataTableRecord} suitable for the v2 surface.
 *
 * The v2 `flyout_v2/attack_details/main/hooks/use_attack_details` hook does
 * an identical fetch when handed the resulting hit. We accept that duplicate
 * fetch in the legacy → v2 boundary; both surfaces share React-Query's
 * default request dedupe so back-to-back identical requests collapse.
 */
export const useAttackHit = (attackId: string, indexName: string): UseAttackHitResult => {
  const { dataView } = useDataView(PageScope.attacks);
  const runtimeMappings = dataView?.getRuntimeMappings() as RunTimeMappings;

  const [loading, , searchHit, , refetch] = useTimelineEventsDetails({
    indexName,
    eventId: attackId,
    runtimeMappings,
    skip: !attackId,
  });

  const hit = useMemo(
    () => (searchHit ? buildDataTableRecord(searchHit as unknown as EsHitRecord) : null),
    [searchHit]
  );

  return { hit, loading, refetch };
};
