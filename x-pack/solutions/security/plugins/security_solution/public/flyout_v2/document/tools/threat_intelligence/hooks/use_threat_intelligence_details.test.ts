/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useThreatIntelligenceDetails } from './use_threat_intelligence_details';
import { renderHook } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { useInvestigationTimeEnrichment } from './use_investigation_enrichment';

jest.mock('./use_investigation_enrichment');

const mockHit: DataTableRecord = {
  id: '1',
  raw: {},
  flattened: {
    'kibana.alert.rule.uuid': ['ruleId'],
  },
  isAnchor: false,
};

describe('useThreatIntelligenceDetails', () => {
  beforeEach(() => {
    jest.mocked(useInvestigationTimeEnrichment).mockReturnValue({
      result: { enrichments: [] },
      loading: false,
      setRange: jest.fn(),
      range: { from: '2023-04-27T00:00:00Z', to: '2023-04-27T23:59:59Z' },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns the expected values', () => {
    const { result } = renderHook(() => useThreatIntelligenceDetails({ hit: mockHit }));

    expect(result.current.enrichments).toEqual([]);
    expect(result.current.eventFields).toEqual({});
    expect(result.current.isEnrichmentsLoading).toBe(false);
    expect(result.current.isEventDataLoading).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.range).toEqual({
      from: '2023-04-27T00:00:00Z',
      to: '2023-04-27T23:59:59Z',
    });
    expect(typeof result.current.setRange).toBe('function');
  });
});
