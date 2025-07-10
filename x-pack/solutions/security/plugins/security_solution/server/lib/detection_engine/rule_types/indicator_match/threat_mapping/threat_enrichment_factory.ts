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
import { type SignalIdToMatchedQueriesMap } from './get_signals_map_from_threat_index';

interface ThreatEnrichmentFactoryOptions {
  threatIndicatorPath: ThreatIndicatorPath;
  signalsQueryMap: SignalIdToMatchedQueriesMap;
  matchedThreats: ThreatListItem[];
}

export const threatEnrichmentFactory = ({
  signalsQueryMap,
  threatIndicatorPath,
  matchedThreats,
}: ThreatEnrichmentFactoryOptions) => {
  return (signals: SignalSourceHit[]) =>
    enrichSignalThreatMatchesFromSignalsMap(
      signals,
      matchedThreats,
      threatIndicatorPath,
      signalsQueryMap
    );
};
