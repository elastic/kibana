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
import { DEFAULT_ALERTS_INDEX, DEFAULT_PREVIEW_INDEX } from '../../../../../common/constants';
import type { RunTimeMappings } from '../../../../../common/api/search_strategy';
import { useSpaceId } from '../../../../common/hooks/use_space_id';
import { useRouteSpy } from '../../../../common/utils/route/use_route_spy';
import { useTimelineEventsDetails } from '../../../../timelines/containers/details';
import type { SearchHit } from '../../../../../common/search_strategy';
import type { GetFieldsData } from './use_get_fields_data';
import { useGetFieldsData } from './use_get_fields_data';
import { useDataView } from '../../../../data_view_manager/hooks/use_data_view';
import { useBrowserFields } from '../../../../data_view_manager/hooks/use_browser_fields';

/**
 * The referenced alert _index in the flyout uses the `.internal.` such as `.internal.alerts-security.alerts-spaceId` in the alert page flyout and .internal.preview.alerts-security.alerts-spaceId` in the rule creation preview flyout,
 * but we always want to use their respective aliase indices rather than accessing their backing .internal. indices.
 */
export const getAlertIndexAlias = (
  index: string,
  spaceId: string = 'default'
): string | undefined => {
  if (index.startsWith(`.internal${DEFAULT_ALERTS_INDEX}`)) {
    return `${DEFAULT_ALERTS_INDEX}-${spaceId}`;
  } else if (index.startsWith(`.internal${DEFAULT_PREVIEW_INDEX}`)) {
    return `${DEFAULT_PREVIEW_INDEX}-${spaceId}`;
  }
};

export interface UseEventDetailsParams {
  /**
   * Id of the document
   */
  eventId: string | undefined;
  /**
   * Name of the index used in the parent's page
   */
  indexName: string | undefined;
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
}: UseEventDetailsParams): UseEventDetailsResult => {
  const currentSpaceId = useSpaceId();
  // TODO Replace getAlertIndexAlias way to retrieving the eventIndex with the GET /_alias
  //  https://github.com/elastic/kibana/issues/113063
  const eventIndex = indexName ? getAlertIndexAlias(indexName, currentSpaceId) ?? indexName : '';
  const [{ pageName }] = useRouteSpy();
  const sourcererScope =
    pageName === SecurityPageName.detections ? PageScope.alerts : PageScope.default;

  const { dataView } = useDataView(sourcererScope);
  const browserFields = useBrowserFields(sourcererScope);
  const runtimeMappings = dataView?.getRuntimeMappings() as RunTimeMappings;

  const [loading, dataFormattedForFieldBrowser, searchHit, dataAsNestedObject, refetchFlyoutData] =
    useTimelineEventsDetails({
      indexName: eventIndex,
      eventId: eventId ?? '',
      runtimeMappings,
      skip: !eventId,
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
