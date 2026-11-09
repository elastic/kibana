/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationStart, HttpStart } from '@kbn/core/public';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { i18n } from '@kbn/i18n';
import type {
  DiscoverSharedPublicSetup,
  HuntSessionFeature,
  HuntSessionInfo,
} from '@kbn/discover-shared-plugin/public';
import { API_VERSIONS } from '@kbn/alertzero-common';
import { HUNT_LIBRARY_URL } from '../../common/constants';
import type { HuntPreserveResponse, HuntSessionVerification } from '../../common/hunt_library';

const AGENT_BUILDER_APP_ID = 'agent_builder';

const PRESERVE_FAILED = i18n.translate('xpack.alertzero.huntLibrary.preserveFailed', {
  defaultMessage: 'The evidence could not be preserved. Try again.',
});

const toHuntSessionInfo = (verification: HuntSessionVerification): HuntSessionInfo => ({
  sessionId: verification.session_id,
  sessionExecutionId: verification.session_execution_id,
  ...(verification.investigation_id ? { investigationId: verification.investigation_id } : {}),
  expiresAt: verification.expires_at,
  definition: verification.definition,
});

/**
 * Lets Discover enter Hunt mode for sessions AlertZero launched. The server checks the session and
 * its owner, so one that is unknown, expired or someone else's resolves to `undefined` and Discover
 * stays in its normal mode.
 */
export const registerHuntSessionFeature = ({
  discoverShared,
  getHttp,
  getApplication,
}: {
  discoverShared: DiscoverSharedPublicSetup;
  getHttp: () => Promise<HttpStart>;
  getApplication: () => Promise<ApplicationStart>;
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
    preserveEvidence: async (request) => {
      const http = await getHttp();
      try {
        const result = await http.post<HuntPreserveResponse>(
          `${HUNT_LIBRARY_URL}/session/preserve`,
          {
            version: API_VERSIONS.internal.v1,
            body: JSON.stringify({
              token: request.token,
              preservation_id: request.preservationId,
              query: request.query,
              filters: request.filters,
              time_range: request.timeRange,
              columns: request.columns,
              data_view_id: request.dataViewId,
              ...(request.note ? { note: request.note } : {}),
              rows: request.rows,
            }),
          }
        );
        const application = await getApplication();
        return {
          investigationId: result.investigation_id,
          investigationUrl: application.getUrlForApp(AGENT_BUILDER_APP_ID, {
            path: `/agents/${agentBuilderDefaultAgentId}/conversations/${encodeURIComponent(
              result.investigation_id
            )}`,
            absolute: true,
          }),
          evidenceCount: result.evidence_count,
          addedCount: result.added_count,
          profileToken: result.profile_token,
        };
      } catch (error) {
        // The server's message is written for analysts; anything else gets a generic one.
        const message = (error as { body?: { message?: unknown } })?.body?.message;
        throw new Error(typeof message === 'string' ? message : PRESERVE_FAILED);
      }
    },
  };

  discoverShared.features.registry.register(feature);
};
