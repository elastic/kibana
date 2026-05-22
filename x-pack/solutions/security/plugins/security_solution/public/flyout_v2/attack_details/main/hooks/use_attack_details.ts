/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BrowserFields, TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import type { RunTimeMappings } from '@kbn/timelines-plugin/common/search_strategy';
import {
  type AttackDiscoveryAlert,
  transformAttackDiscoveryAlertDocumentToApi,
  transformAttackDiscoveryAlertFromApi,
  type AttackDiscoveryAlertDocument,
} from '@kbn/elastic-assistant-common';
import { useMemo } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { SearchHit } from '../../../../../common/search_strategy';

import { PageScope } from '../../../../data_view_manager/constants';
import { useBrowserFields } from '../../../../data_view_manager/hooks/use_browser_fields';
import { useDataView } from '../../../../data_view_manager/hooks/use_data_view';
import { useTimelineEventsDetails } from '../../../../timelines/containers/details';
import type { GetFieldsData } from '../../../../flyout/document_details/shared/hooks/use_get_fields_data';
import { useGetFieldsData } from '../../../../flyout/document_details/shared/hooks/use_get_fields_data';

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
 */
export const useAttackDetails = (hit: DataTableRecord): UseAttackDetailsResult => {
  const attackId = hit.raw._id ?? '';
  const indexName = hit.raw._index ?? '';
  const pageScope = PageScope.attacks;
  const { dataView } = useDataView(pageScope);
  const browserFields = useBrowserFields(pageScope);

  const runtimeMappings = dataView?.getRuntimeMappings() as RunTimeMappings;

  const [loading, dataFormattedForFieldBrowser, searchHit, , refetch] = useTimelineEventsDetails({
    indexName,
    eventId: attackId,
    runtimeMappings,
    skip: !attackId,
  });

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
