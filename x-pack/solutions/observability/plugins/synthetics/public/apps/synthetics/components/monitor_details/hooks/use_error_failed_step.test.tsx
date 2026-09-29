/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { renderHook } from '@testing-library/react';
import * as observabilitySharedPublic from '@kbn/observability-shared-plugin/public';
import { useErrorFailedStep } from './use_error_failed_step';
import { SYNTHETICS_INDEX_PATTERN } from '../../../../../../common/constants';

vi.mock('@kbn/observability-shared-plugin/public', () => {
      const mocked = {
      useEsSearch: vi.fn().mockReturnValue({ data: undefined, loading: false }),
    };
      return { ...mocked, default: mocked };
    });

const mockUrlParams = vi.fn();
vi.mock('../../../hooks', () => {
      const mocked = {
      useGetUrlParams: () => mockUrlParams(),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../contexts', () => {
      const mocked = {
      useSyntheticsRefreshContext: () => ({ lastRefresh: 0 }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('react-router-dom', () => {
      const mocked = {
      useParams: () => ({ monitorId: 'monitor-1' }),
    };
      return { ...mocked, default: mocked };
    });

const useEsSearchMock = observabilitySharedPublic.useEsSearch as Mock;

describe('useErrorFailedStep', () => {
  beforeEach(() => {
    mockUrlParams.mockReturnValue({});
    useEsSearchMock.mockReturnValue({ data: undefined, loading: false });
  });

  afterEach(() => vi.clearAllMocks());

  it('queries the local synthetics index pattern when no remoteName is provided', () => {
    renderHook(() => useErrorFailedStep(['check-group-1']));

    expect(useEsSearchMock).toHaveBeenCalledWith(
      expect.objectContaining({ index: SYNTHETICS_INDEX_PATTERN }),
      expect.arrayContaining([undefined]),
      expect.any(Object)
    );
  });

  it('queries the CCS-prefixed index when remoteName is in the URL', () => {
    mockUrlParams.mockReturnValue({ remoteName: 'remote-a' });

    renderHook(() => useErrorFailedStep(['check-group-1']));

    expect(useEsSearchMock).toHaveBeenCalledWith(
      expect.objectContaining({ index: `remote-a:${SYNTHETICS_INDEX_PATTERN}` }),
      expect.arrayContaining(['remote-a']),
      expect.any(Object)
    );
  });

  it('uses an empty index when no checkGroups are provided (skips the query)', () => {
    renderHook(() => useErrorFailedStep([]));

    expect(useEsSearchMock).toHaveBeenCalledWith(
      expect.objectContaining({ index: '' }),
      expect.anything(),
      expect.any(Object)
    );
  });
});
