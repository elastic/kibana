/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BrowserFields, TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { SecurityPageName } from '@kbn/security-solution-navigation';
import { PageScope } from '../../../../data_view_manager/constants';
import type { RunTimeMappings } from '../../../../../common/api/search_strategy';
import { useSpaceId } from '../../../../common/hooks/use_space_id';
import { useRouteSpy } from '../../../../common/utils/route/use_route_spy';
import { useTimelineEventsDetails } from '../../../../timelines/containers/details';
import type { SearchHit } from '../../../../../common/search_strategy';
import type { GetFieldsData } from './use_get_fields_data';
import { useGetFieldsData } from './use_get_fields_data';
import { useDataView } from '../../../../data_view_manager/hooks/use_data_view';
import { useBrowserFields } from '../../../../data_view_manager/hooks/use_browser_fields';
import { getAlertIndexAlias } from '../../../../flyout_v2/shared/utils/alert_index_alias';

export interface UseEventDetailsParams {
  /**
   * Id of the document
   */
  eventId: string | undefined;
  /**
   * Name of the index used in the parent's page
   */
  indexName: string | undefined;
  /**
   * Whether to skip the event details retrieval
   */
  skip?: boolean;
}

export interface UseEventDetailsResult {
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

/**
 * Hook to retrieve event details for alert details flyout contexts
 */
export const useEventDetails = ({
  eventId,
  indexName,
  skip = false,
}: UseEventDetailsParams): UseEventDetailsResult => {
  const currentSpaceId = useSpaceId();
  // TODO Replace getAlertIndexAlias way to retrieving the eventIndex with the GET /_alias
  //  https://github.com/elastic/kibana/issues/113063
  const eventIndex = indexName ? getAlertIndexAlias(indexName, currentSpaceId) ?? indexName : '';
  const [{ pageName }] = useRouteSpy();
  const sourcererScope =
    pageName === SecurityPageName.detections ? PageScope.alerts : PageScope.default;

  const { dataView } = useDataView(sourcererScope);
  const browserFields = useBrowserFields(dataView);
  const runtimeMappings = dataView?.getRuntimeMappings() as RunTimeMappings;

  const [loading, dataFormattedForFieldBrowser, searchHit, dataAsNestedObject, refetchFlyoutData] =
    useTimelineEventsDetails({
      indexName: eventIndex,
      eventId: eventId ?? '',
      runtimeMappings,
      skip: !eventId || skip,
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
