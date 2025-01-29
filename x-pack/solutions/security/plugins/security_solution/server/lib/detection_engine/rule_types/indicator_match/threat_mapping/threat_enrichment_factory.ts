/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateEventSignalOptions, GetThreatListOptions } from './types';
import type { SignalSourceHit } from '../../types';
import { getThreatList } from './get_threat_list';
import { enrichSignalThreatMatchesFromSignalsMap } from './enrich_signal_threat_matches';
import { type SignalsQueryMap } from './get_signals_map_from_threat_index';

interface ThreatEnrichmentFactoryOptions {
  threatIndicatorPath: CreateEventSignalOptions['threatIndicatorPath'];
  signalsQueryMap: SignalsQueryMap;
  threatFilters: CreateEventSignalOptions['threatFilters'];
  threatSearchParams: Omit<GetThreatListOptions, 'searchAfter'>;
}

/**
 * returns threatEnrichment method used events-first search
 */
export const threatEnrichmentFactory = ({
  signalsQueryMap,
  threatIndicatorPath,
  threatFilters,
  threatSearchParams,
}: ThreatEnrichmentFactoryOptions) => {
  const threatEnrichment = (signals: SignalSourceHit[]): Promise<SignalSourceHit[]> => {
    const getThreats = async () => {
      const threatIds = signals
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        .map((s) => s._id!)
        .reduce<string[]>((acc, id) => {
          return [
            ...new Set([
              ...acc,
              ...(signalsQueryMap.get(id) ?? []).map((threatQueryMatched) => threatQueryMatched.id),
            ]),
          ];
        }, [])
        .flat();

      const matchedThreatsFilter = {
        query: {
          bool: {
            filter: {
              ids: { values: threatIds },
            },
          },
        },
      };

      const threatResponse = await getThreatList({
        ...threatSearchParams,
        threatListConfig: {
          _source: [`${threatIndicatorPath}.*`, 'threat.feed.*'],
          fields: undefined,
        },
        threatFilters: [...threatFilters, matchedThreatsFilter],
        searchAfter: undefined,
      });

      return threatResponse.hits.hits;
    };

    return enrichSignalThreatMatchesFromSignalsMap(
      signals,
      getThreats,
      threatIndicatorPath,
      signalsQueryMap
    );
  };

  return threatEnrichment;
};
