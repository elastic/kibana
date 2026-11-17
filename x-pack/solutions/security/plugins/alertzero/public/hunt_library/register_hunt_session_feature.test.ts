/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import type {
  DiscoverSharedPublicSetup,
  HuntSessionFeature,
} from '@kbn/discover-shared-plugin/public';
import { HUNT_LIBRARY_URL } from '../../common/constants';
import type { HuntSessionVerification } from '../../common/hunt_library';
import { registerHuntSessionFeature } from './register_hunt_session_feature';

const verification: HuntSessionVerification = {
  session_id: 'session-1',
  session_execution_id: 'execution-1',
  investigation_id: 'investigation-1',
  expires_at: '2026-11-05T00:00:00.000Z',
  definition: {
    id: 'rare_lsass_process_access',
    version: 1,
    name: 'Rare LSASS access',
    hypothesis: 'Credential dumping',
    resultKind: 'raw_event',
    references: ['https://example.com'],
    guidance: { analystNotes: ['n'], expectedFalsePositives: ['f'], suggestedPivots: ['p'] },
  },
};

const setup = () => {
  const register = jest.fn();
  const http = httpServiceMock.createStartContract();
  const getUrlForApp = jest.fn(
    (_app: string, { path }: { path?: string } = {}) =>
      `http://kibana/app/agent_builder${path ?? ''}`
  );
  registerHuntSessionFeature({
    discoverShared: {
      features: { registry: { register } },
    } as unknown as DiscoverSharedPublicSetup,
    getHttp: async () => http,
    getApplication: async () => ({ getUrlForApp } as never),
  });
  return { http, getUrlForApp, feature: register.mock.calls[0][0] as HuntSessionFeature, register };
};

describe('registerHuntSessionFeature', () => {
  it('registers one hunt-session feature', () => {
    const { register, feature } = setup();

    expect(register).toHaveBeenCalledTimes(1);
    expect(feature.id).toBe('hunt-session');
  });

  it('posts the token to the verify route and maps the response', async () => {
    const { http, feature } = setup();
    http.post.mockResolvedValue(verification);

    const info = await feature.verifySession('signed');

    expect(http.post).toHaveBeenCalledWith(`${HUNT_LIBRARY_URL}/profile_state/verify`, {
      version: '1',
      body: JSON.stringify({ token: 'signed' }),
    });
    expect(info).toEqual({
      sessionId: 'session-1',
      sessionExecutionId: 'execution-1',
      investigationId: 'investigation-1',
      expiresAt: '2026-11-05T00:00:00.000Z',
      definition: verification.definition,
    });
  });

  it('omits the investigation id when the session has none', async () => {
    const { http, feature } = setup();
    const { investigation_id: _omitted, ...withoutInvestigation } = verification;
    http.post.mockResolvedValue(withoutInvestigation);

    expect(await feature.verifySession('signed')).not.toHaveProperty('investigationId');
  });

  it('resolves to undefined when the server rejects the token', async () => {
    const { http, feature } = setup();
    http.post.mockRejectedValue(new Error('400'));

    expect(await feature.verifySession('forged')).toBeUndefined();
  });

  describe('preserveEvidence', () => {
    const request = {
      token: 'signed',
      preservationId: '11111111-1111-4111-8111-111111111111',
      query: 'FROM logs-x',
      filters: [{ json: '{}' }],
      timeRange: { from: 'now-7d', to: 'now' },
      columns: ['@timestamp'],
      dataViewId: 'dv-1',
      note: 'Same rare port on both hosts',
      rows: [{ kind: 'raw_event' as const, index: 'logs-x', id: 'e1' }],
    };

    it('posts the selection and maps the response, including the refreshed token', async () => {
      const { http, feature } = setup();
      http.post.mockResolvedValue({
        investigation_id: 'inv-1',
        evidence_count: 3,
        added_count: 2,
        created: true,
        profile_token: 'new-token',
      });

      const result = await feature.preserveEvidence(request);

      expect(http.post).toHaveBeenCalledWith(`${HUNT_LIBRARY_URL}/session/preserve`, {
        version: '1',
        body: JSON.stringify({
          token: 'signed',
          preservation_id: request.preservationId,
          query: 'FROM logs-x',
          filters: [{ json: '{}' }],
          time_range: { from: 'now-7d', to: 'now' },
          columns: ['@timestamp'],
          data_view_id: 'dv-1',
          note: 'Same rare port on both hosts',
          rows: request.rows,
        }),
      });
      expect(result).toEqual({
        investigationId: 'inv-1',
        investigationUrl:
          'http://kibana/app/agent_builder/agents/elastic-ai-agent/conversations/inv-1',
        evidenceCount: 3,
        addedCount: 2,
        profileToken: 'new-token',
      });
    });

    it("rejects with the server's message when it explains the failure", async () => {
      const { http, feature } = setup();
      http.post.mockRejectedValue({ body: { message: 'A selected document is missing.' } });

      await expect(feature.preserveEvidence(request)).rejects.toThrow(
        'A selected document is missing.'
      );
    });

    it('rejects with a generic message when the failure has none', async () => {
      const { http, feature } = setup();
      http.post.mockRejectedValue(new Error('network'));

      await expect(feature.preserveEvidence(request)).rejects.toThrow(
        'The evidence could not be preserved. Try again.'
      );
    });
  });
});
