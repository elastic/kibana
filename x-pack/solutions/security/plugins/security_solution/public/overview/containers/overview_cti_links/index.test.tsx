/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import type { HttpStart } from '@kbn/core/public';
import { renderHook, waitFor } from '@testing-library/react';
import type { ITagsClient } from '@kbn/saved-objects-tagging-oss-plugin/common';
import type { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import { INTERNAL_DASHBOARDS_URL } from '../../../../common/constants';
import { useKibana } from '../../../common/lib/kibana';
import { CTI_TAG_NAME, useCtiDashboardLinks } from '.';

vi.mock('../../../common/lib/kibana');
vi.mock('../../../common/lib/apm/use_track_http_request', () => {
  const mocked = {
    useTrackHttpRequest: vi.fn(() => ({
      startTracking: vi.fn(() => ({ endTracking: vi.fn() })),
    })),
  };
  return { ...mocked, default: mocked };
});
vi.mock('../../../common/components/link_to', () => {
  const mocked = {
    useGetSecuritySolutionUrl: vi.fn(() =>
      vi.fn(({ path }: { path: string }) => `/security/dashboards/${path}`)
    ),
  };
  return { ...mocked, default: mocked };
});

const mockHttpPost = vi.fn();
const mockAbortSignal = {} as unknown as AbortSignal;
const mockFindByName = vi.fn();

const renderUseCtiDashboardLinks = (tiDataSources = [{ dataset: 'a', name: 'TI', count: 1 }]) =>
  renderHook(() => useCtiDashboardLinks({ tiDataSources }), {});

describe('useCtiDashboardLinks', () => {
  beforeAll(() => {
    useKibana().services.http = {
      post: mockHttpPost,
    } as unknown as HttpStart;
    useKibana().services.savedObjectsTagging = {
      client: { findByName: mockFindByName } as unknown as ITagsClient,
    } as unknown as SavedObjectsTaggingApi;
    global.AbortController = vi.fn().mockReturnValue({
      abort: vi.fn(),
      signal: mockAbortSignal,
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should resolve CTI tag via savedObjectsTagging.client findByName', async () => {
    mockFindByName.mockResolvedValue(null);
    mockHttpPost.mockResolvedValue([]);

    renderUseCtiDashboardLinks();

    await waitFor(() => {
      expect(mockFindByName).toHaveBeenCalledWith(CTI_TAG_NAME, { exact: true });
    });
  });

  test('should fetch dashboards by tag ids after tags resolve', async () => {
    mockFindByName.mockResolvedValue({ id: 'cti-tag-id', managed: false, attributes: {} });
    mockHttpPost.mockResolvedValue([]);

    renderUseCtiDashboardLinks();

    await waitFor(() => {
      expect(mockHttpPost).toHaveBeenCalledWith(INTERNAL_DASHBOARDS_URL, {
        version: '1',
        body: JSON.stringify({ tagIds: ['cti-tag-id'] }),
        signal: mockAbortSignal,
      });
    });
  });
});
