/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { SecurityPageName } from '@kbn/deeplinks-security';
import { PageScope } from '../../../../data_view_manager/constants';
import type { RunTimeMappings } from '../../../../../common/api/search_strategy';
import { useDataView } from '../../../../data_view_manager/hooks/use_data_view';
import type { CtiEnrichment, EventFields } from '../../../../../common/search_strategy';
import { useBasicDataFromDetailsData } from '../../shared/hooks/use_basic_data_from_details_data';
import {
  filterDuplicateEnrichments,
  getEnrichmentFields,
  parseExistingEnrichments,
  timelineDataToEnrichment,
} from '../../shared/utils/threat_intelligence';
import { useInvestigationTimeEnrichment } from '../../shared/hooks/use_investigation_enrichment';
import { useTimelineEventsDetails } from '../../../../timelines/containers/details';
import { useRouteSpy } from '../../../../common/utils/route/use_route_spy';
import { useDocumentDetailsContext } from '../../shared/context';

export interface ThreatIntelligenceDetailsResult {
  /**
   * Enrichments extracted from the event data
   */
  enrichments: CtiEnrichment[];
  /**
   * Fields extracted from the event data
   */
  eventFields: EventFields;
  /**
   * Whether enrichments are loading
   */
  isEnrichmentsLoading: boolean;
  /**
   * Whether event data is loading
   */
  isEventDataLoading: boolean;
  /**
   * Whether event or enrichment data is loading
   */
  isLoading: boolean;
  /**
   * Range on the range picker to fetch enrichments
   */
  range: { from: string; to: string };
  /**
   * Set the range on the range picker to fetch enrichments
   */
  setRange: (range: { from: string; to: string }) => void;
}

/**
 * A hook that returns data necessary strictly to render Threat Intel Insights.
 * Reusing a bunch of hooks scattered across kibana, it makes it easier to mock the data layer
 * for component testing.
 */
export const useThreatIntelligenceDetails = (): ThreatIntelligenceDetailsResult => {
  const { indexName, eventId } = useDocumentDetailsContext();
  const [{ pageName }] = useRouteSpy();
  const pageScope = pageName === SecurityPageName.detections ? PageScope.alerts : PageScope.default;
  const { dataView } = useDataView(pageScope);
  const runtimeMappings = useMemo(
    () => dataView.getRuntimeMappings() as RunTimeMappings,
    [dataView]
  );

  const [isEventDataLoading, eventData] = useTimelineEventsDetails({
    indexName,
    eventId,
    runtimeMappings,
    skip: !eventId,
  });

  const { isAlert } = useBasicDataFromDetailsData(eventData);

  const data = useMemo(() => eventData || [], [eventData]);
  const eventFields = useMemo(() => getEnrichmentFields(data || []), [data]);

  const {
    result: enrichmentsResponse,
    loading: isEnrichmentsLoading,
    setRange,
    range,
  } = useInvestigationTimeEnrichment({ eventFields });

  const existingEnrichments = useMemo(
    () =>
      isAlert
        ? parseExistingEnrichments(data).map((enrichmentData) =>
            timelineDataToEnrichment(enrichmentData)
          )
        : [],
    [data, isAlert]
  );

  const allEnrichments = useMemo(() => {
    if (isEnrichmentsLoading || !enrichmentsResponse?.enrichments) {
      return existingEnrichments;
    }
    return filterDuplicateEnrichments([...existingEnrichments, ...enrichmentsResponse.enrichments]);
  }, [isEnrichmentsLoading, enrichmentsResponse, existingEnrichments]);

  const isLoading = isEnrichmentsLoading || isEventDataLoading;

  return {
    enrichments: allEnrichments,
    eventFields,
    isEnrichmentsLoading,
    isEventDataLoading,
    isLoading,
    range,
    setRange,
  };
};
