/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { getFieldValue } from '@kbn/discover-utils';
import { ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import type { CtiEnrichment, EventFields } from '../../../../common/search_strategy';
import {
  filterDuplicateEnrichments,
  getEnrichmentFields,
  parseExistingEnrichments,
} from '../utils/threat_intelligence_helpers';
import { useInvestigationTimeEnrichment } from './use_investigation_enrichment';

export interface ThreatIntelligenceDetailsProps {
  /**
   * The document hit to extract threat intelligence from
   */
  hit: DataTableRecord;
}

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
export const useThreatIntelligenceDetails = ({
  hit,
}: ThreatIntelligenceDetailsProps): ThreatIntelligenceDetailsResult => {
  const alertRuleUuid = getFieldValue(hit, ALERT_RULE_UUID);
  const isAlert = Array.isArray(alertRuleUuid)
    ? alertRuleUuid.some((value) => value != null)
    : alertRuleUuid != null;
  const eventFields = useMemo(() => getEnrichmentFields(hit), [hit]);

  const {
    result: enrichmentsResponse,
    loading: isEnrichmentsLoading,
    setRange,
    range,
  } = useInvestigationTimeEnrichment({ eventFields });

  const existingEnrichments = useMemo(
    () => (isAlert ? parseExistingEnrichments(hit) : []),
    [hit, isAlert]
  );

  const allEnrichments = useMemo(() => {
    if (isEnrichmentsLoading || !enrichmentsResponse?.enrichments) {
      return existingEnrichments;
    }
    return filterDuplicateEnrichments([...existingEnrichments, ...enrichmentsResponse.enrichments]);
  }, [isEnrichmentsLoading, enrichmentsResponse, existingEnrichments]);

  const isEventDataLoading = false;
  const isLoading = isEnrichmentsLoading;

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
