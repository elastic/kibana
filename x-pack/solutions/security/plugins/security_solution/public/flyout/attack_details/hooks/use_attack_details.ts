/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BrowserFields, TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import type { RunTimeMappings } from '@kbn/timelines-plugin/common/search_strategy';
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
   * An object containing fields by type
   */
  browserFields: BrowserFields;
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
  /**
   * Promise to trigger a data refresh
   */
  refetchFlyoutData: () => Promise<void>;
  /**
   * The actual raw document object
   */
  searchHit: SearchHit | undefined;
}

export const useAttackDetails = ({
  attackId,
  indexName,
}: UseAttackEventDetailsParams): UseAttackEventDetailsResult => {
  const sourcererScope = PageScope.attacks;

  const { dataView } = useDataView(sourcererScope);
  const browserFields = useBrowserFields(sourcererScope);

  const runtimeMappings = dataView?.getRuntimeMappings() as RunTimeMappings;

  const [loading, dataFormattedForFieldBrowser, searchHit, dataAsNestedObject, refetchFlyoutData] =
    useTimelineEventsDetails({
      indexName: indexName || '',
      eventId: attackId || '',
      runtimeMappings,
      skip: !attackId,
    });

  const { getFieldsData } = useGetFieldsData({ fieldsData: searchHit?.fields });

  return {
    browserFields,
    dataAsNestedObject,
    dataFormattedForFieldBrowser,
    getFieldsData,
    loading,
    refetchFlyoutData,
    searchHit,
  };
};
