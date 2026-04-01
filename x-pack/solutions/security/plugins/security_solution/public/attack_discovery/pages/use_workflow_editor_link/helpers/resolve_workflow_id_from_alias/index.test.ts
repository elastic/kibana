/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';

import {
  clearResolvedWorkflowIdCache,
  resolveWorkflowIdFromAlias,
  WORKFLOW_ID_ALIASES_TO_TAGS,
} from '.';

const mockHttpFetch = jest.fn();
const mockHttp = { fetch: mockHttpFetch } as unknown as HttpSetup;

describe('resolveWorkflowIdFromAlias', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearResolvedWorkflowIdCache();
  });

  describe('when the alias is a known key in WORKFLOW_ID_ALIASES_TO_TAGS', () => {
    const alias = 'attack-discovery-generation';
    const expectedTag = WORKFLOW_ID_ALIASES_TO_TAGS[alias];

    it('calls http.fetch with the correct tag', async () => {
      mockHttpFetch.mockResolvedValue({ results: [{ id: 'workflow-abc' }] });

      await resolveWorkflowIdFromAlias({ alias, http: mockHttp });

      expect(mockHttpFetch).toHaveBeenCalledWith('/api/workflows', {
        method: 'GET',
        query: {
          page: 1,
          size: 1,
          tags: expectedTag,
        },
        version: '2023-10-31',
      });
    });

    it('returns the resolved workflow id from the API response', async () => {
      mockHttpFetch.mockResolvedValue({ results: [{ id: 'workflow-abc' }] });

      const result = await resolveWorkflowIdFromAlias({ alias, http: mockHttp });

      expect(result).toBe('workflow-abc');
    });

    it('returns null when the API response has no results', async () => {
      mockHttpFetch.mockResolvedValue({ results: [] });

      const result = await resolveWorkflowIdFromAlias({ alias, http: mockHttp });

      expect(result).toBeNull();
    });

    it('returns null when the API response omits the results field', async () => {
      mockHttpFetch.mockResolvedValue({});

      const result = await resolveWorkflowIdFromAlias({ alias, http: mockHttp });

      expect(result).toBeNull();
    });
  });

  describe('when the alias is NOT in WORKFLOW_ID_ALIASES_TO_TAGS', () => {
    const alias = 'unknown-alias';

    it('returns null without calling http.fetch', async () => {
      const result = await resolveWorkflowIdFromAlias({ alias, http: mockHttp });

      expect(result).toBeNull();
      expect(mockHttpFetch).not.toHaveBeenCalled();
    });
  });

  describe('caching', () => {
    const alias = 'attack-discovery-generation';

    it('returns the cached value on a second call without fetching again', async () => {
      mockHttpFetch.mockResolvedValue({ results: [{ id: 'workflow-abc' }] });

      const first = await resolveWorkflowIdFromAlias({ alias, http: mockHttp });
      const second = await resolveWorkflowIdFromAlias({ alias, http: mockHttp });

      expect(first).toBe('workflow-abc');
      expect(second).toBe('workflow-abc');
      expect(mockHttpFetch).toHaveBeenCalledTimes(1);
    });

    it('caches null for an unknown alias and does not re-evaluate', async () => {
      const unknownAlias = 'no-such-alias';

      const first = await resolveWorkflowIdFromAlias({ alias: unknownAlias, http: mockHttp });
      const second = await resolveWorkflowIdFromAlias({ alias: unknownAlias, http: mockHttp });

      expect(first).toBeNull();
      expect(second).toBeNull();
      expect(mockHttpFetch).not.toHaveBeenCalled();
    });

    it('fetches again after the cache is cleared', async () => {
      mockHttpFetch.mockResolvedValue({ results: [{ id: 'workflow-abc' }] });

      await resolveWorkflowIdFromAlias({ alias, http: mockHttp });
      clearResolvedWorkflowIdCache();
      await resolveWorkflowIdFromAlias({ alias, http: mockHttp });

      expect(mockHttpFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('when http.fetch throws', () => {
    const alias = 'attack-discovery-generation';

    it('returns null', async () => {
      mockHttpFetch.mockRejectedValue(new Error('Forbidden'));

      const result = await resolveWorkflowIdFromAlias({ alias, http: mockHttp });

      expect(result).toBeNull();
    });

    it('caches null so that subsequent calls do not re-fetch', async () => {
      mockHttpFetch.mockRejectedValue(new Error('Forbidden'));

      await resolveWorkflowIdFromAlias({ alias, http: mockHttp });
      const second = await resolveWorkflowIdFromAlias({ alias, http: mockHttp });

      expect(second).toBeNull();
      expect(mockHttpFetch).toHaveBeenCalledTimes(1);
    });
  });
});

describe('WORKFLOW_ID_ALIASES_TO_TAGS', () => {
  it('contains expected alias keys', () => {
    expect(Object.keys(WORKFLOW_ID_ALIASES_TO_TAGS).sort()).toEqual([
      'attack-discovery-custom-validation-example',
      'attack-discovery-esql-example',
      'attack-discovery-generation',
      'attack-discovery-run-example',
      'attack-discovery-validate',
      'default-attack-discovery-alert-retrieval',
    ]);
  });
});
