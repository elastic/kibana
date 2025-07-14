/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignalsEnrichment } from '../../types';
import type { BuildThreatEnrichmentOptions } from './types';
import { getSignalIdToMatchedQueriesMap } from './get_signal_id_to_matched_queries_map';

import { threatEnrichmentFactory } from './threat_enrichment_factory';

// we do want to make extra requests to the threat index to get enrichments from all threats
// previously we were enriched alerts only from `currentThreatList` but not all threats
export const buildThreatEnrichment = ({
  sharedParams,
  services,
  threatFilters,
  threatIndicatorPath,
  pitId,
  threatIndexFields,
  allowedFieldsForTermsQuery,
}: BuildThreatEnrichmentOptions): SignalsEnrichment => {
  return async (signals) => {
    const { signalIdToMatchedQueriesMap, threatList } = await getSignalIdToMatchedQueriesMap({
      services,
      sharedParams,
      signals,
      allowedFieldsForTermsQuery,
      pitId,
      threatFilters,
      threatIndexFields,
      threatIndicatorPath,
    });

    const enrichment = threatEnrichmentFactory({
      signalIdToMatchedQueriesMap,
      threatIndicatorPath,
      matchedThreats: threatList,
    });

    return enrichment(signals);
  };
};
