/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { renderHook } from '@testing-library/react';
import { useInvestigationTimeEnrichment } from './use_investigation_enrichment';
import {
  DEFAULT_EVENT_ENRICHMENT_FROM,
  DEFAULT_EVENT_ENRICHMENT_TO,
} from '../../../../../../common/cti/constants';
import { useEventEnrichmentComplete } from '../../../main/services/threat_intelligence';

vi.mock('../../../main/services/threat_intelligence');
vi.mock('react-redux-v7', () => {
  const original = require('react-redux-v7');
  return {
    ...original,
    useDispatch: () => vi.fn(),
  };
});
vi.mock('../../../../../common/hooks/use_app_toasts', () => {
  const mocked = {
    useAppToasts: vi.fn().mockReturnValue({
      addError: vi.fn(),
    }),
  };
  return { ...mocked, default: mocked };
});

const mockStorageGet = vi.fn();
vi.mock('../../../../../common/lib/kibana', async () => {
  const originalModule = await vi.importActual('../../../../../common/lib/kibana');
  return {
    ...originalModule,
    useKibana: vi.fn().mockReturnValue({
      services: {
        data: {
          search: {
            search: () => ({
              subscribe: () => ({
                unsubscribe: vi.fn(),
              }),
            }),
          },
        },
        storage: { get: () => mockStorageGet() },
        uiSettings: {
          get: vi.fn().mockReturnValue(''),
        },
      },
    }),
  };
});

describe('useInvestigationTimeEnrichment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return default range', () => {
    (useEventEnrichmentComplete as Mock).mockReturnValue({});

    const { result } = renderHook(() =>
      useInvestigationTimeEnrichment({
        eventFields: {},
      })
    );

    expect(result.current.range).toEqual({
      from: DEFAULT_EVENT_ENRICHMENT_FROM,
      to: DEFAULT_EVENT_ENRICHMENT_TO,
    });
    expect(typeof result.current.setRange).toBe('function');
  });

  it('should return range saved in local storage', () => {
    mockStorageGet.mockReturnValue({ start: 'now-7d', end: 'now-3d' });
    (useEventEnrichmentComplete as Mock).mockReturnValue({});

    const { result } = renderHook(() =>
      useInvestigationTimeEnrichment({
        eventFields: {},
      })
    );

    expect(result.current.range).toEqual({
      from: 'now-7d',
      to: 'now-3d',
    });
  });

  it('should return loading', () => {
    (useEventEnrichmentComplete as Mock).mockReturnValue({
      error: null,
      result: undefined,
      loading: true,
    });

    const { result } = renderHook(() =>
      useInvestigationTimeEnrichment({
        eventFields: {},
      })
    );

    expect(result.current.loading).toEqual(true);
  });

  it('should return no enrichments', () => {
    (useEventEnrichmentComplete as Mock).mockReturnValue({});

    const { result } = renderHook(() =>
      useInvestigationTimeEnrichment({
        eventFields: {},
      })
    );

    expect(result.current.result).toEqual({ enrichments: [] });
  });

  it('should return enrichments and loading false', () => {
    (useEventEnrichmentComplete as Mock).mockReturnValue({
      error: null,
      result: {
        enrichments: [{}],
        inspect: { dsl: [] },
        totalCount: 0,
      },
      loading: false,
      start: vi.fn(),
    });

    const { result } = renderHook(() =>
      useInvestigationTimeEnrichment({
        eventFields: { test: 'test' },
      })
    );

    expect(result.current.result).toEqual({
      enrichments: [{}],
      inspect: { dsl: [] },
      totalCount: 0,
    });
    expect(result.current.loading).toEqual(false);
  });
});
