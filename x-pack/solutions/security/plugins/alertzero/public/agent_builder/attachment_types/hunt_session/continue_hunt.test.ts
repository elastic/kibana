/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { HUNT_LIBRARY_URL } from '../../../../common/constants';
import type { HuntContinueResponse } from '../../../../common/hunt_library';
import { continueHunt, restoreFilters } from './continue_hunt';

const response: HuntContinueResponse = {
  session_id: 's',
  execution_id: 'e',
  investigation_id: 'inv-1',
  definition_id: 'hunt',
  profile_token: 'signed-token',
  resume: {
    query: 'FROM logs-x',
    filters: [{ json: '{"meta":{"key":"a"}}' }, { key: 'too-large', negate: false }],
    time_range: { from: 'now-2d', to: 'now' },
    columns: ['@timestamp'],
    data_view_id: '',
  },
};

describe('restoreFilters', () => {
  it('restores filters stored as JSON and skips summaries and malformed entries', () => {
    expect(
      restoreFilters([
        { json: '{"meta":{"key":"a"}}' },
        { key: 'summary-only' },
        { json: 'not json' },
        { json: '42' },
        { json: 'null' },
      ])
    ).toEqual([{ meta: { key: 'a' } }]);
  });
});

describe('continueHunt', () => {
  const setup = (post: jest.Mock = jest.fn().mockResolvedValue(response)) => {
    const navigate = jest.fn().mockResolvedValue(undefined);
    const http = httpServiceMock.createStartContract();
    http.post.mockImplementation(post);
    const share = {
      url: {
        locators: {
          get: (id: string) => (id === 'DISCOVER_APP_LOCATOR' ? { navigate } : undefined),
        },
      },
    } as unknown as SharePluginStart;
    return { http, share, navigate };
  };

  it('asks the server, then opens Discover at the saved state with the signed Hunt state', async () => {
    const { http, share, navigate } = setup();

    await continueHunt({ http, share, investigationId: 'inv-1' });

    expect(http.post).toHaveBeenCalledWith(`${HUNT_LIBRARY_URL}/session/continue`, {
      version: '1',
      body: JSON.stringify({ investigation_id: 'inv-1' }),
    });
    expect(navigate).toHaveBeenCalledWith({
      query: { esql: 'FROM logs-x' },
      timeRange: { from: 'now-2d', to: 'now' },
      columns: ['@timestamp'],
      filters: [{ meta: { key: 'a' } }],
      profileState: { huntSession: { token: 'signed-token' } },
    });
  });

  it('rejects, and starts no request, when Discover is not available', async () => {
    const { http } = setup();

    await expect(
      continueHunt({ http, share: undefined, investigationId: 'inv-1' })
    ).rejects.toThrow('Discover is not available');
    expect(http.post).not.toHaveBeenCalled();
  });

  it('rejects, and does not navigate, when the server refuses', async () => {
    const { http, share, navigate } = setup(jest.fn().mockRejectedValue(new Error('403')));

    await expect(continueHunt({ http, share, investigationId: 'inv-1' })).rejects.toThrow('403');
    expect(navigate).not.toHaveBeenCalled();
  });
});
