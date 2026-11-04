/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import type {
  DiscoverSharedPublicSetup,
  HuntSessionFeature,
  HuntSessionInfo,
} from '@kbn/discover-shared-plugin/public';
import { API_VERSIONS } from '@kbn/alertzero-common';
import { HUNT_LIBRARY_URL } from '../../common/constants';
import type { HuntSessionVerification } from '../../common/hunt_library';

const toHuntSessionInfo = (verification: HuntSessionVerification): HuntSessionInfo => ({
  sessionId: verification.session_id,
  sessionExecutionId: verification.session_execution_id,
  ...(verification.investigation_id ? { investigationId: verification.investigation_id } : {}),
  expiresAt: verification.expires_at,
  definition: verification.definition,
});

/**
 * Lets Discover enter Hunt mode for sessions AlertZero launched. The server checks the signed state,
 * so a forged or expired token resolves to `undefined` and Discover stays in its normal mode.
 */
export const registerHuntSessionFeature = ({
  discoverShared,
  getHttp,
}: {
  discoverShared: DiscoverSharedPublicSetup;
  getHttp: () => Promise<HttpStart>;
}): void => {
  const feature: HuntSessionFeature = {
    id: 'hunt-session',
    verifySession: async (token) => {
      try {
        const http = await getHttp();
        const verification = await http.post<HuntSessionVerification>(
          `${HUNT_LIBRARY_URL}/profile_state/verify`,
          { version: API_VERSIONS.internal.v1, body: JSON.stringify({ token }) }
        );
        return toHuntSessionInfo(verification);
      } catch {
        return undefined;
      }
    },
  };

  discoverShared.features.registry.register(feature);
};
