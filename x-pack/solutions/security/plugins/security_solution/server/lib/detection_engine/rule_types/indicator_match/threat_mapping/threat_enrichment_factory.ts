/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ThreatIndicatorPath } from '../../../../../../common/api/detection_engine';
import type { ThreatListItem } from './types';
import type { SignalSourceHit } from '../../types';
import { enrichSignalThreatMatchesFromSignalsMap } from './enrich_signal_threat_matches';
import { type SignalIdToMatchedQueriesMap } from './get_signal_id_to_matched_queries_map';

interface ThreatEnrichmentFactoryOptions {
  threatIndicatorPath: ThreatIndicatorPath;
  signalIdToMatchedQueriesMap: SignalIdToMatchedQueriesMap;
  matchedThreats: ThreatListItem[];
}

export const threatEnrichmentFactory = ({
  signalIdToMatchedQueriesMap,
  threatIndicatorPath,
  matchedThreats,
}: ThreatEnrichmentFactoryOptions) => {
  return (signals: SignalSourceHit[]) =>
    enrichSignalThreatMatchesFromSignalsMap(
      signals,
      matchedThreats,
      threatIndicatorPath,
      signalIdToMatchedQueriesMap
    );
};
