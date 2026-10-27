/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WriteHuntEvidenceResponse } from '@kbn/alertzero-common';
import {
  API_VERSIONS,
  INTERNAL_API_ACCESS,
  WriteHuntEvidenceRequestBody,
} from '@kbn/alertzero-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { ALERTZERO_API_PRIVILEGE_WRITE, WRITE_HUNT_EVIDENCE_URL } from '../../../common/constants';
import {
  isReportVisibleToSpace,
  writeHuntEvidence,
} from '../../services/watches/hunt/common/write_hunt_evidence';
import type { RouteDependencies } from '../register_routes';
import { withAlertZeroEnabled } from '../with_alertzero_enabled';

export { WRITE_HUNT_EVIDENCE_URL };

/**
 * Stamps the hunt-once gate on a report, called by `hunt.yaml` only after `run_hunt_coordinator`
 * reports `completed_successfully`. Deliberately its own route rather than folded into the
 * coordinator's own response path: the engine can fail the `run_hunt_coordinator` step (timeout,
 * response-size cap) after the coordinator's handler has already run, and a plain in-process write
 * there is not cancelled by that failure -- it would stamp a report the workflow itself goes on to
 * report as a failed hunt. Keeping the write behind its own step means it only runs when the
 * engine has already confirmed the coordinator step succeeded, the same ordering guarantee the
 * YAML `elasticsearch.update` step this replaces had by construction.
 */
export const registerWriteHuntEvidenceRoute = ({
  router,
  logger,
  getSpaceId,
}: RouteDependencies): void => {
  router.versioned
    .post({
      path: WRITE_HUNT_EVIDENCE_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: {
          requiredPrivileges: [ALERTZERO_API_PRIVILEGE_WRITE],
        },
      },
      summary: 'Write the hunt-once evidence stamp for a report',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(WriteHuntEvidenceRequestBody),
          },
        },
      },
      withAlertZeroEnabled(async (context, request, response) => {
        try {
          const core = await context.core;
          const spaceId = getSpaceId(request);
          const reportsEsClient = core.elasticsearch.client.asInternalUser;

          const { reportId, runId, hasConfirmedHit, completeness, totalHits } = request.body;

          const visible = await isReportVisibleToSpace(reportsEsClient, { spaceId, reportId });
          if (!visible) {
            return response.notFound({ body: { message: `Report ${reportId} not found` } });
          }

          await writeHuntEvidence(reportsEsClient, {
            spaceId,
            reportId,
            runId,
            hasConfirmedHit,
            completeness,
            totalHits,
          });

          const body: WriteHuntEvidenceResponse = { acknowledged: true };
          return response.ok({ body });
        } catch (err) {
          logger.warn(`write_hunt_evidence route failed: ${(err as Error).message}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to write hunt evidence' },
          });
        }
      })
    );
};
