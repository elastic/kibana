/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, isEqual, isObject } from 'lodash';
import { ENRICHMENT_TYPES, FEED_NAME_PATH } from '../../../../../../common/cti/constants';

import type { SignalSourceHit } from '../../types';
import type { ThreatEnrichment } from './types';
import type {
  MatchedHitAndQuery,
  SignalIdToMatchedQueriesMap,
} from './get_signal_id_to_matched_queries_map';
import type {
  ThreatMapping,
  ThreatMappingEntry,
} from '../../../../../../common/api/detection_engine';

export const MAX_NUMBER_OF_SIGNAL_MATCHES = 200;

export const buildEnrichments = ({
  hitsAndQueries,
  indicatorPath,
  threatMappings,
}: {
  hitsAndQueries: MatchedHitAndQuery[];
  indicatorPath: string;
  threatMappings: ThreatMapping;
}): ThreatEnrichment[] =>
  hitsAndQueries.flatMap((hitAndQuery) => {
    const { threatHit, query } = hitAndQuery;
    const indicatorValue = get(threatHit?._source, indicatorPath) as unknown;
    const feedName = (get(threatHit?._source, FEED_NAME_PATH) ?? '') as string;
    const indicator = ([indicatorValue].flat()[0] ?? {}) as Record<string, unknown>;
    if (!isObject(indicator)) {
      throw new Error(`Expected indicator field to be an object, but found: ${indicator}`);
    }
    const feed: { name?: string } = {};
    if (feedName) {
      feed.name = feedName;
    }

    const filteredEntries = threatMappings[query.threatMappingIndex].entries.filter(
      (entry) => entry.negate !== true
    );

    const dedupedThreatMappingEntries = filteredEntries.reduce<ThreatMappingEntry[]>(
      (accum, entry) => {
        if (!accum.some((addedEntry) => isEqual(addedEntry, entry))) {
          accum.push(entry);
        }
        return accum;
      },
      []
    );
    return dedupedThreatMappingEntries.map((entry) => ({
      indicator,
      feed,
      matched: {
        atomic: undefined,
        field: entry.field,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        id: threatHit._id!,
        index: threatHit._index,
        type: ENRICHMENT_TYPES.IndicatorMatchRule,
      },
    }));
  });

const enrichSignalWithThreatMatches = (
  signalHit: SignalSourceHit,
  enrichmentsWithoutAtomic: ThreatEnrichment[]
) => {
  const threat = get(signalHit._source, 'threat') ?? {};
  if (!isObject(threat)) {
    throw new Error(`Expected threat field to be an object, but found: ${threat}`);
  }
  // We are not using ENRICHMENT_DESTINATION_PATH here because the code above
  // and below make assumptions about its current value, 'threat.enrichments',
  // and making this code dynamic on an arbitrary path would introduce several
  // new issues.
  const existingEnrichmentValue = get(signalHit._source, 'threat.enrichments') ?? [];
  const existingEnrichments = [existingEnrichmentValue].flat(); // ensure enrichments is an array
  const newEnrichments = enrichmentsWithoutAtomic.map((enrichment) => ({
    ...enrichment,
    matched: {
      ...enrichment.matched,
      atomic: get(signalHit._source, enrichment.matched.field),
    },
  }));

  return {
    ...signalHit,
    _source: {
      ...signalHit._source,
      threat: {
        ...threat,
        enrichments: [...existingEnrichments, ...newEnrichments],
      },
    },
  };
};

/**
 * enrich signals threat matches using signalsMap(Map<string, ThreatMatchNamedQuery[]>) that has match named query results
 */
export const enrichSignalThreatMatchesFromSignalsMap = async (
  signals: SignalSourceHit[],
  indicatorPath: string,
  signalIdToMatchedQueriesMap: SignalIdToMatchedQueriesMap,
  threatMappings: ThreatMapping
): Promise<SignalSourceHit[]> => {
  if (signals.length === 0) {
    return [];
  }

  const enrichedSignals: SignalSourceHit[] = signals.map((signal) => {
    const enrichmentsForSignal = buildEnrichments({
      indicatorPath,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      hitsAndQueries: signalIdToMatchedQueriesMap.get(signal._id!) ?? [],
      threatMappings,
    });
    return enrichSignalWithThreatMatches(signal, enrichmentsForSignal);
  });

  return enrichedSignals;
};
