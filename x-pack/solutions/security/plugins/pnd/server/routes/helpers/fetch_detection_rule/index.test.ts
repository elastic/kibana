/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpServiceStart, KibanaRequest } from '@kbn/core/server';

import { scopedSelfGet } from '../../get/conversations/helpers/scoped_self_get';
import {
  DETECTION_ENGINE_RULES_API_VERSION,
  DETECTION_ENGINE_RULES_PATH,
  fetchDetectionRule,
} from '.';

jest.mock('../../get/conversations/helpers/scoped_self_get');

const scopedSelfGetMock = scopedSelfGet as jest.Mock;

const http = { id: 'http' } as unknown as HttpServiceStart;
const request = {} as KibanaRequest;

const rule = {
  id: '4aa5ddf7-6ed3-4528-a1eb-43e363f46cf8',
  name: 'Endpoint Security [Insights]',
  rule_id: '61e90241-c8f2-47bc-8e47-238420a34fb6',
  type: 'query',
};

describe('fetchDetectionRule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    scopedSelfGetMock.mockResolvedValue({ body: rule, status: 200 });
  });

  it('reads the rule as the calling user via the public rules API (S3)', async () => {
    await fetchDetectionRule({ http, id: rule.id, request, spaceId: 'agent-3' });

    expect(scopedSelfGetMock).toHaveBeenCalledWith(
      expect.objectContaining({ http, path: DETECTION_ENGINE_RULES_PATH, request })
    );
  });

  it('addresses the rule by its saved-object id, which is what `_apply` patches', async () => {
    await fetchDetectionRule({ http, id: rule.id, request, spaceId: 'agent-3' });

    expect(scopedSelfGetMock).toHaveBeenCalledWith(
      expect.objectContaining({ query: { id: rule.id } })
    );
  });

  // S9: the space comes from the request, so a caller cannot redirect the read into another space.
  it('forwards the space resolved from the request', async () => {
    await fetchDetectionRule({ http, id: rule.id, request, spaceId: 'agent-3' });

    expect(scopedSelfGetMock).toHaveBeenCalledWith(expect.objectContaining({ spaceId: 'agent-3' }));
  });

  it('negotiates the public rules API version', async () => {
    await fetchDetectionRule({ http, id: rule.id, request, spaceId: 'agent-3' });

    expect(scopedSelfGetMock).toHaveBeenCalledWith(
      expect.objectContaining({ version: DETECTION_ENGINE_RULES_API_VERSION })
    );
  });

  it('returns the rule document the rules API answered with', async () => {
    const result = await fetchDetectionRule({ http, id: rule.id, request, spaceId: 'agent-3' });

    expect(result.rule).toEqual(rule);
  });

  it('returns the status the rules API answered with', async () => {
    const result = await fetchDetectionRule({ http, id: rule.id, request, spaceId: 'agent-3' });

    expect(result.status).toBe(200);
  });

  it('returns no rule when the caller cannot read it, so the candidate is simply absent', async () => {
    scopedSelfGetMock.mockResolvedValue({ body: undefined, status: 403 });

    const result = await fetchDetectionRule({ http, id: rule.id, request, spaceId: 'agent-3' });

    expect(result).toEqual({ rule: undefined, status: 403 });
  });

  it('returns no rule when the rule does not exist', async () => {
    scopedSelfGetMock.mockResolvedValue({ body: undefined, status: 404 });

    const result = await fetchDetectionRule({ http, id: rule.id, request, spaceId: 'agent-3' });

    expect(result).toEqual({ rule: undefined, status: 404 });
  });

  it('rejects when the self call fails at the transport level, so the route can 500', async () => {
    scopedSelfGetMock.mockRejectedValue(new Error('socket hang up'));

    await expect(
      fetchDetectionRule({ http, id: rule.id, request, spaceId: 'agent-3' })
    ).rejects.toThrow('socket hang up');
  });
});
