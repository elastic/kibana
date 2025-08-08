/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNamedQueryMock } from './enrich_signal_threat_matches.mock';
import type { SignalSourceHit } from '../../types';
import { threatEnrichmentFactory } from './threat_enrichment_factory';
import { enrichSignalThreatMatchesFromSignalsMap } from './enrich_signal_threat_matches';
import type { ThreatListItem } from './types';

jest.mock('./get_threat_list', () => ({ getThreatList: jest.fn() }));
jest.mock('./enrich_signal_threat_matches', () => ({
  enrichSignalThreatMatchesFromSignalsMap: jest.fn(),
}));

const signals = [
  {
    _id: 'source-id-1',
  },
  {
    _id: 'source-id-2',
  },
];

const signalIdToMatchedQueriesMapMock = new Map([
  ['source-id-1', [getNamedQueryMock({ id: 'threat-1' }), getNamedQueryMock({ id: 'threat-2' })]],
  // this signal's threats not present in signalsMap, so will be ignored in threatFilter
  ['source-id-3', [getNamedQueryMock({ id: 'threat-x' }), getNamedQueryMock({ id: 'threat-y' })]],
]);
const matchedThreatsMock: ThreatListItem[] = [];

describe('threatEnrichmentFactory', () => {
  it('enrichment should call enrichSignalThreatMatchesFromSignalsMap with correct params', async () => {
    const enrichment = threatEnrichmentFactory({
      signalIdToMatchedQueriesMap: signalIdToMatchedQueriesMapMock,
      threatIndicatorPath: 'indicator.mock',
      matchedThreats: matchedThreatsMock,
    });

    await enrichment(signals as SignalSourceHit[]);

    expect(enrichSignalThreatMatchesFromSignalsMap).toHaveBeenCalledWith(
      signals,
      [],
      'indicator.mock',
      signalIdToMatchedQueriesMapMock
    );
  });
});
