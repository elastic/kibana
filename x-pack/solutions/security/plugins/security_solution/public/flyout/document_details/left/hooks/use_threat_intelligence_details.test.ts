/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useThreatIntelligenceDetails } from './use_threat_intelligence_details';
import { renderHook } from '@testing-library/react';
import { SecurityPageName } from '@kbn/deeplinks-security';
import { useTimelineEventsDetails } from '../../../../timelines/containers/details';
import { useRouteSpy } from '../../../../common/utils/route/use_route_spy';
import { useDocumentDetailsContext } from '../../shared/context';
import { useInvestigationTimeEnrichment } from '../../shared/hooks/use_investigation_enrichment';
import type { RouteSpyState } from '../../../../common/utils/route/types';
import {
  useBasicDataFromDetailsData,
  type UseBasicDataFromDetailsDataResult,
} from '../../shared/hooks/use_basic_data_from_details_data';
import { mockContextValue } from '../../shared/mocks/mock_context';

jest.mock('../../../../timelines/containers/details');
jest.mock('../../../../common/utils/route/use_route_spy');
jest.mock('../../shared/context');
jest.mock('../../shared/hooks/use_investigation_enrichment');
jest.mock('../../shared/hooks/use_basic_data_from_details_data');

describe('useThreatIntelligenceDetails', () => {
  beforeEach(() => {
    jest.mocked(useInvestigationTimeEnrichment).mockReturnValue({
      result: { enrichments: [] },
      loading: false,
      setRange: jest.fn(),
      range: { from: '2023-04-27T00:00:00Z', to: '2023-04-27T23:59:59Z' },
    });

    jest
      .mocked(useTimelineEventsDetails)
      .mockReturnValue([false, [], undefined, null, async () => {}]);

    jest
      .mocked(useBasicDataFromDetailsData)
      .mockReturnValue({ isAlert: true } as unknown as UseBasicDataFromDetailsDataResult);

    jest
      .mocked(useRouteSpy)
      .mockReturnValue([
        { pageName: SecurityPageName.detections } as unknown as RouteSpyState,
        () => {},
      ]);

    jest.mocked(useDocumentDetailsContext).mockReturnValue(mockContextValue);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns the expected values', () => {
    const { result } = renderHook(() => useThreatIntelligenceDetails());

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
