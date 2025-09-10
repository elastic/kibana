/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import type { DataView } from '@kbn/data-views-plugin/common';
import {
  type GetFieldsData,
  useGetFieldsData,
} from '../../document_details/shared/hooks/use_get_fields_data';
import type { RunTimeMappings } from '../../../../common/api/search_strategy';
import { useTimelineEventsDetails } from '../../../timelines/containers/details';

export interface UseDocumentDetailsParams {
  /**
   * DataView created for the alert summary page
   */
  dataView: DataView | undefined;
  /**
   * Id of the document
   */
  documentId: string | undefined;
}

export interface UseDocumentDetailsResult {
  /**
   * An object with top level fields from the ECS object
   */
  dataAsNestedObject: Ecs | null;
  /**
   * An array of field objects with category and value
   */
  dataFormattedForFieldBrowser: TimelineEventsDetailsItem[] | null;
  /**
   * Retrieves searchHit values for the provided field
   */
  getFieldsData: GetFieldsData;
  /**
   * Whether the data is loading
   */
  loading: boolean;
}

/**
 * Hook to retrieve event details for EASE alert details flyout context
 */
export const useDocumentDetails = ({
  dataView,
  documentId,
}: UseDocumentDetailsParams): UseDocumentDetailsResult => {
  const indexName = useMemo(() => (dataView ? dataView.getIndexPattern() : ''), [dataView]);
  const runtimeMappings = dataView?.getRuntimeMappings() as RunTimeMappings;

  const [loading, dataFormattedForFieldBrowser, searchHit, dataAsNestedObject] =
    useTimelineEventsDetails({
      indexName,
      eventId: documentId || '',
      runtimeMappings,
      skip: !documentId || !dataView,
    });

  const { getFieldsData } = useGetFieldsData({ fieldsData: searchHit?.fields });

  return {
    dataAsNestedObject,
    dataFormattedForFieldBrowser,
    getFieldsData,
    loading,
  };
};
