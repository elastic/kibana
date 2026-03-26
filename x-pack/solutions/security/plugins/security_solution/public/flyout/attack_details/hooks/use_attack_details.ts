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
import type { SearchHit } from '../../../../common/search_strategy';

import { PageScope } from '../../../data_view_manager/constants';
import { useBrowserFields } from '../../../data_view_manager/hooks/use_browser_fields';
import { useDataView } from '../../../data_view_manager/hooks/use_data_view';
import { useTimelineEventsDetails } from '../../../timelines/containers/details';
import type { GetFieldsData } from '../../document_details/shared/hooks/use_get_fields_data';
import { useGetFieldsData } from '../../document_details/shared/hooks/use_get_fields_data';

export interface UseAttackEventDetailsParams {
  /**
   * ID of the attack document
   */
  attackId: string | undefined;
  /**
   * Name of the index used in the parent's page
   */
  indexName: string | undefined;
}

export interface UseAttackEventDetailsResult {
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

export const useAttackDetails = ({
  attackId,
  indexName,
}: UseAttackEventDetailsParams): UseAttackEventDetailsResult => {
  // Now we are retrieving all the browserFields from the data view associated with the attacks page
  // TODO following the useCreateEaseAlertsDataView pattern, we should create a specific data view for the attack details
  // https://github.com/elastic/kibana/issues/244205
  const pageScope = PageScope.attacks;
  const { dataView } = useDataView(pageScope);
  const browserFields = useBrowserFields(pageScope);

  const runtimeMappings = dataView?.getRuntimeMappings() as RunTimeMappings;

  const [loading, dataFormattedForFieldBrowser, searchHit, , refetch] = useTimelineEventsDetails({
    indexName: indexName || '',
    eventId: attackId || '',
    runtimeMappings,
    skip: !attackId,
  });

  // build AttackDiscoveryAlert from raw _source using shared document-API-internal transform
  // returns null when source/attackId missing or transform throws
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
