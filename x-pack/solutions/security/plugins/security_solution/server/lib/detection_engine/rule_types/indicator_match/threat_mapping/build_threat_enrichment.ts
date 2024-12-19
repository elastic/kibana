/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignalsEnrichment } from '../../types';
import type { BuildThreatEnrichmentOptions } from './types';
import { buildThreatMappingFilter } from './build_threat_mapping_filter';
import { getSignalsQueryMapFromThreatIndex } from './get_signals_map_from_threat_index';

import { threatEnrichmentFactory } from './threat_enrichment_factory';

// we do want to make extra requests to the threat index to get enrichments from all threats
// previously we were enriched alerts only from `currentThreatList` but not all threats
export const buildThreatEnrichment = ({
  ruleExecutionLogger,
  services,
  threatFilters,
  threatIndex,
  threatIndicatorPath,
  threatLanguage,
  threatQuery,
  pitId,
  reassignPitId,
  listClient,
  exceptionFilter,
  threatMapping,
  runtimeMappings,
  threatIndexFields,
}: BuildThreatEnrichmentOptions): SignalsEnrichment => {
  return async (signals) => {
    const threatFiltersFromEvents = buildThreatMappingFilter({
      threatMapping,
      threatList: signals,
      entryKey: 'field',
      allowedFieldsForTermsQuery: {
        source: {},
        threat: {},
      },
    });

    const threatSearchParams = {
      esClient: services.scopedClusterClient.asCurrentUser,
      threatFilters: [...threatFilters, threatFiltersFromEvents],
      query: threatQuery,
      language: threatLanguage,
      index: threatIndex,
      ruleExecutionLogger,
      threatListConfig: {
        _source: [`${threatIndicatorPath}.*`, 'threat.feed.*'],
        fields: undefined,
      },
      pitId,
      reassignPitId,
      runtimeMappings,
      listClient,
      exceptionFilter,
      indexFields: threatIndexFields,
    };

    const signalsQueryMap = await getSignalsQueryMapFromThreatIndex({
      threatSearchParams,
      eventsCount: signals.length,
      termsQueryAllowed: false,
    });

    const enrichment = threatEnrichmentFactory({
      signalsQueryMap,
      threatIndicatorPath,
      threatFilters,
      threatSearchParams,
    });

    return enrichment(signals);
  };
};
