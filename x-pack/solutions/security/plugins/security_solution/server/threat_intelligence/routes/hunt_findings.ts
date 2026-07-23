/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  HUNT_FINDINGS_API_PATH,
  SEVERITY_LEVELS,
  THREAT_INTELLIGENCE_API_PRIVILEGES,
  type SeverityLevel,
} from '../../../common/threat_intelligence/hub';
import { resolveCurrentSpaceId } from '../lib/space_filter';
import {
  HUNT_FINDINGS_SORT_OPTIONS,
  HUNT_FINDINGS_STATUS_OPTIONS,
  listHuntFindings,
  type HuntFindingsSortBy,
  type HuntFindingsSortOrder,
  type HuntFindingsStatus,
} from '../services/list_hunt_findings';
import type { RouteRegistrationDeps } from '.';

const enumLiterals = <T extends string>(values: readonly T[]): string => values.join(', ');

// Query strings serialize single-element arrays as a bare value (e.g.
// `?statuses=new`), so accept either a string or an array and normalize.
const stringOrArraySchema = schema.maybe(
  schema.oneOf([schema.string(), schema.arrayOf(schema.string())])
);

const toArray = (value: string | string[] | undefined): string[] => {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
};

const huntFindingsQuerySchema = schema.object({
  from: schema.maybe(schema.string()),
  to: schema.maybe(schema.string()),
  min_confidence: schema.maybe(schema.number({ min: 0, max: 1 })),
  size: schema.maybe(schema.number({ min: 1, max: 100 })),
  offset: schema.maybe(schema.number({ min: 0, max: 10_000 })),
  sort_by: schema.maybe(
    schema.string({
      validate: (value) =>
        (HUNT_FINDINGS_SORT_OPTIONS as readonly string[]).includes(value)
          ? undefined
          : `must be one of: ${enumLiterals(HUNT_FINDINGS_SORT_OPTIONS)}`,
    })
  ),
  sort_order: schema.maybe(schema.oneOf([schema.literal('asc'), schema.literal('desc')])),
  statuses: stringOrArraySchema,
  severities: stringOrArraySchema,
  q: schema.maybe(schema.string({ maxLength: 500 })),
});

/**
 * GET /api/threat_intelligence/hunt_findings — durable hunt findings for Hub.
 */
export const registerHuntFindingsRoute = ({
  router,
  logger,
  getSpacesService,
}: RouteRegistrationDeps): void => {
  router.versioned
    .get({
      path: HUNT_FINDINGS_API_PATH,
      access: 'public',
      security: {
        authz: {
          requiredPrivileges: [THREAT_INTELLIGENCE_API_PRIVILEGES.read],
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: { request: { query: huntFindingsQuerySchema } },
      },
      async (context, request, response) => {
        const core = await context.core;
        const esClient = core.elasticsearch.client.asCurrentUser;
        const spaceId = resolveCurrentSpaceId(getSpacesService(), request);

        const statuses = toArray(request.query.statuses).filter(
          (value): value is HuntFindingsStatus =>
            (HUNT_FINDINGS_STATUS_OPTIONS as readonly string[]).includes(value)
        );
        const severities = toArray(request.query.severities).filter(
          (value): value is SeverityLevel => (SEVERITY_LEVELS as readonly string[]).includes(value)
        );

        try {
          const result = await listHuntFindings(esClient, {
            spaceId,
            from: request.query.from,
            to: request.query.to,
            min_confidence: request.query.min_confidence,
            size: request.query.size,
            offset: request.query.offset,
            sort_by: request.query.sort_by as HuntFindingsSortBy | undefined,
            sort_order: request.query.sort_order as HuntFindingsSortOrder | undefined,
            ...(statuses.length ? { statuses } : {}),
            ...(severities.length ? { severities } : {}),
            q: request.query.q,
          });
          return response.ok({ body: result });
        } catch (err) {
          logger.warn(`hunt_findings failed: ${(err as Error).message}`);
          return response.customError({
            statusCode: 500,
            body: {
              message: `Failed to load hunt findings: ${(err as Error).message}`,
            },
          });
        }
      }
    );
};
