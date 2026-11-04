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
    references: ['https://example.com'],
    guidance: { analystNotes: ['n'], expectedFalsePositives: ['f'], suggestedPivots: ['p'] },
  },
};

const setup = () => {
  const register = jest.fn();
  const http = httpServiceMock.createStartContract();
  registerHuntSessionFeature({
    discoverShared: {
      features: { registry: { register } },
    } as unknown as DiscoverSharedPublicSetup,
    getHttp: async () => http,
  });
  return { http, feature: register.mock.calls[0][0] as HuntSessionFeature, register };
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
});
