/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  PERSIST_REPORT_FIELDS_API_PATH,
  PERSIST_REPORT_FIELDS_MAX_BODY_BYTES,
  persistReportFieldsBodySchema,
  persistReportFieldsResponseSchema,
} from '../../../common/threat_intel';
import { isReportVisibleInSpace, persistReportFields } from '../services';
import { resolveCurrentSpaceId } from '../lib/space_filter';
import { THREAT_INTEL_WRITE_AUTHZ } from './lib/authz';
import { rejectUntilBootstrapped } from './lib/bootstrap_ready';
import type { RouteRegistrationDeps } from '.';

/**
 * Partial-document merge onto a threat report, called by `enrich_threat_report.yaml`'s four
 * independently-gated `persist_*` steps. Internal route so the write runs as the internal user:
 * `.kibana-threat-reports` is plugin-owned and hidden, and Kibana feature privileges grant no
 * Elasticsearch privileges on it, so `asCurrentUser` fails for every non-superuser (same rule
 * `create_threat_report` follows for the same index). `index` is validated server-side against
 * `THREAT_REPORTS_INDEX` (see `persistReportFieldsBodySchema`) rather than trusted from the
 * caller, since an internal-user write with an open index parameter would otherwise let anyone
 * holding this route's privilege write to any index, not only this one.
 *
 * Two bounds, because an internal-user write has neither by default. *What* may be written is held
 * to the enrichment sections by `persistReportFieldsBodySchema`, so a report's `space_id` and every
 * space's `evidence` are out of reach. *Which* report may be written is held to the request's space
 * (plus the global catalog, which is every space's to enrich) by the visibility check below.
 *
 * The second bound needs the caller's cooperation and is worth understanding before changing either
 * side: enrichment selects pending reports space-blind, from every space at once, but addresses each
 * `persist_*` write through that report's own space (`/s/{space}/...`). So the request's space is the
 * report's space for the real caller, while a hand-crafted call from some other space resolves to
 * that space and gets a 404 here. Dropping the `/s/{space}/` prefix from
 * `enrich_threat_report.yaml` would therefore not loosen this check, it would break enrichment for
 * every report outside the default space.
 */
export const registerPersistReportFieldsRoute = ({
  router,
  logger,
  getSpacesService,
  getBootstrapReady,
}: RouteRegistrationDeps): void => {
  router.versioned
    .post({
      path: PERSIST_REPORT_FIELDS_API_PATH,
      access: 'internal',
      security: { authz: THREAT_INTEL_WRITE_AUTHZ },
      options: {
        body: {
          accepts: ['application/json'],
          maxBytes: PERSIST_REPORT_FIELDS_MAX_BODY_BYTES,
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: { body: persistReportFieldsBodySchema },
          response: { 200: { body: () => persistReportFieldsResponseSchema } },
        },
      },
      async (context, request, response) => {
        const notReady = await rejectUntilBootstrapped(getBootstrapReady, response);
        if (notReady) return notReady;

        const core = await context.core;
        const esClient = core.elasticsearch.client.asInternalUser;
        const spaceId = resolveCurrentSpaceId(getSpacesService(), request);
        try {
          const visible = await isReportVisibleInSpace(esClient, {
            spaceId,
            reportId: request.body.id,
          });
          if (!visible) {
            return response.notFound({ body: { message: `Report ${request.body.id} not found` } });
          }

          await persistReportFields(esClient, {
            index: request.body.index,
            id: request.body.id,
            doc: request.body.doc,
          });
          return response.ok({ body: { acknowledged: true } });
        } catch (err) {
          logger.warn(`persist_report_fields failed: ${(err as Error).message}`);
          return response.customError({
            statusCode: 500,
            body: { message: `Failed to persist report fields: ${(err as Error).message}` },
          });
        }
      }
    );
};
