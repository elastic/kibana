/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import { waitFor, renderHook } from '@testing-library/react';
import {
  INTERNAL_TAGS_URL,
  SECURITY_TAG_DESCRIPTION,
  SECURITY_TAG_NAME,
} from '../../../common/constants';
import { useKibana } from '../../common/lib/kibana';
import { useFetchSecurityTags } from './use_fetch_security_tags';
import { DEFAULT_TAGS_RESPONSE } from '../../common/containers/tags/__mocks__/api';
import type { ITagsClient } from '@kbn/saved-objects-tagging-oss-plugin/common';
import type { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';

jest.mock('../../common/lib/kibana');
jest.mock('../../../common/utils/get_ramdom_color', () => ({
  getRandomColor: jest.fn().mockReturnValue('#FFFFFF'),
}));

const mockGet = jest.fn();
const mockAbortSignal = {} as unknown as AbortSignal;
const mockCreateTag = jest.fn();
const renderUseCreateSecurityDashboardLink = () => renderHook(() => useFetchSecurityTags(), {});

describe('useFetchSecurityTags', () => {
  beforeAll(() => {
    useKibana().services.http = { get: mockGet } as unknown as HttpStart;
    useKibana().services.savedObjectsTagging = {
      client: { create: mockCreateTag } as unknown as ITagsClient,
    } as unknown as SavedObjectsTaggingApi;
    global.AbortController = jest.fn().mockReturnValue({
      abort: jest.fn(),
      signal: mockAbortSignal,
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should fetch Security Solution tags', async () => {
    mockGet.mockResolvedValue([]);

    renderUseCreateSecurityDashboardLink();

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        INTERNAL_TAGS_URL,
        expect.objectContaining({
          query: { name: SECURITY_TAG_NAME },
          signal: mockAbortSignal,
        })
      );
    });
  });

  test('should create a Security Solution tag if no Security Solution tags were found', async () => {
    mockGet.mockResolvedValue([]);

    renderUseCreateSecurityDashboardLink();

    await waitFor(() => {
      expect(mockCreateTag).toHaveBeenCalledWith({
        name: SECURITY_TAG_NAME,
        description: SECURITY_TAG_DESCRIPTION,
        color: '#FFFFFF',
      });
    });
  });

  test('should return Security Solution tags', async () => {
    mockGet.mockResolvedValue(DEFAULT_TAGS_RESPONSE);

    const expected = DEFAULT_TAGS_RESPONSE.map((tag) => ({
      id: tag.id,
      type: 'tag',
      ...tag.attributes,
    }));
    const { result } = renderUseCreateSecurityDashboardLink();

    await waitFor(() => {
      expect(mockCreateTag).not.toHaveBeenCalled();
      expect(result.current.tags).toEqual(expect.objectContaining(expected));
    });
  });
});
