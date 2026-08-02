/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  API_VERSIONS,
  GetDiscoveryContextRequestQuery,
  type GetDiscoveryContextResponse,
  INTERNAL_API_ACCESS,
  PND_DISCOVERY_CONTEXT_MAX_ALERT_IDS,
  PND_DISCOVERY_CONTEXT_URL,
} from '@kbn/pnd-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';

import { PND_API_PRIVILEGE_READ } from '../../../../common/constants';
import type { RouteDependencies } from '../../register_routes';
import { findAttackDiscoveryAlerts } from '../conversations/helpers/find_attack_discovery_alerts';
import { resolveReadableAttackDiscoveryAlertIds } from '../conversations/helpers/resolve_readable_attack_discovery_alert_ids';
import { buildDiscoveryAlertIds } from './helpers/build_discovery_alert_ids';
import type { PndDiscoveryContextBucket } from './helpers/build_discovery_contexts';
import { buildDiscoveryContexts } from './helpers/build_discovery_contexts';
import { buildDiscoveryContextQuery } from './helpers/build_discovery_context_query';

/** The shape {@link buildDiscoveryContextQuery}'s `aggs` produces, as far as this route reads it. */
interface DiscoveryContextAggregations {
  by_discovery?: { buckets: Record<string, PndDiscoveryContextBucket> };
}

/** Nothing to enrich: the same body an unreadable or uncorrelated request produces. */
const EMPTY_RESPONSE: GetDiscoveryContextResponse = { contexts: [] };

/**
 * `GET /internal/pnd/discovery-context` — the blast radius and the normalized risk score for a set
 * of Attack Discovery 2.0 alerts.
 *
 * One derivation feeds both surfaces (decision D10), so the Brief stitches them once per page load
 * on a single react-query key instead of asking twice for the same aggregation.
 *
 * Entities come from a `terms` aggregation over the **constituent detection alerts** reached
 * through each discovery's `alert_ids` (D2). That is not a shortcut around a richer source: AD 2.0
 * has no structured entity field at all — only `entity_summary_markdown` prose (G2) — and thread
 * attachments store rendered markdown, so the constituent alerts are the only structured entities
 * that exist. The score is the MAX of those alerts' `kibana.alert.risk_score` (D5), naturally
 * 0-100, rather than the discovery's own `risk_score`, which is an unbounded *sum* of exactly
 * these values and reaches four digits in production.
 *
 * ## What keeps this from being an IDOR
 *
 * The route is handed alert ids by the client, so two things are load-bearing and neither may be
 * relaxed:
 *
 * 1. Every id is filtered through {@link resolveReadableAttackDiscoveryAlertIds} — the shared S3
 *    guard the runs list and the proposals queue use — **before** any alert is read. An id the
 *    caller cannot read contributes no filter clause, so it cannot even be probed for existence.
 * 2. The alerts index is read as `asCurrentUser`, which preserves S3 by construction: the caller's
 *    own index privileges apply, so a readable discovery still cannot surface an alert they may
 *    not see.
 *
 * The readable ids are resolved first and the discoveries are then re-read for their `alert_ids`.
 * That is one extra `_find` per request, deliberately: the alternative is inlining the guard here,
 * and a security check that exists in two copies is a security check that will diverge.
 *
 * The count bound is enforced here rather than by the codec, because `@kbn/openapi-generator`
 * renders a bounded `in: query` array as `ArrayFromString(...).max(n)` and `ArrayFromString`
 * returns a `z.preprocess` pipe with no `.max` — a `maxItems` in the schema would throw on every
 * parse, valid input included.
 *
 * A failed enrichment degrades to `contexts: []` rather than an error: chips and a risk badge are
 * overlays on a queue that renders fine without them, and the queue is a separate read on a
 * separate react-query key. That is the opposite choice from the activity sparkline, which 500s,
 * because a zero-filled series is an affirmative claim that nothing happened — the shared rule is
 * that a derived surface must never take the primary read down with it, not that every derived
 * surface fails the same way.
 */
export const registerGetDiscoveryContextRoute = ({
  getEsClient,
  getSpaceId,
  getStartServices,
  logger,
  router,
}: RouteDependencies) => {
  router.versioned
    .get({
      path: PND_DISCOVERY_CONTEXT_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PND_API_PRIVILEGE_READ] },
      },
      summary: 'Get the blast radius entities and risk score for a set of Attack Discovery alerts',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            query: buildRouteValidationWithZod(GetDiscoveryContextRequestQuery),
          },
        },
      },
      async (context, request, response) => {
        const { correlationIds } = request.query;

        if (correlationIds.length > PND_DISCOVERY_CONTEXT_MAX_ALERT_IDS) {
          return response.badRequest({
            body: {
              message: `correlationIds must contain at most ${PND_DISCOVERY_CONTEXT_MAX_ALERT_IDS} ids`,
            },
          });
        }

        try {
          const spaceId = getSpaceId(request);
          const [{ http }] = await getStartServices();

          // S3: resolve which of the requested discoveries the caller can read, as the calling
          // user, before anything reads an alert.
          const readableAttackDiscoveryAlertIds = await resolveReadableAttackDiscoveryAlertIds({
            correlationIds,
            http,
            request,
            spaceId,
          });

          if (readableAttackDiscoveryAlertIds.size === 0) {
            return response.ok({ body: EMPTY_RESPONSE });
          }

          const alerts = await findAttackDiscoveryAlerts({
            http,
            ids: Array.from(readableAttackDiscoveryAlertIds),
            request,
            spaceId,
          });

          const alertIdsByDiscoveryId = buildDiscoveryAlertIds({
            alerts,
            readableAttackDiscoveryAlertIds,
          });

          if (Object.keys(alertIdsByDiscoveryId).length === 0) {
            return response.ok({ body: EMPTY_RESPONSE });
          }

          logger.debug(
            () =>
              `Deriving PND discovery context for ${
                Object.keys(alertIdsByDiscoveryId).length
              } discoveries in space "${spaceId}"`
          );

          const esClient = await getEsClient(context);
          const { aggregations } = await esClient.asCurrentUser.search<
            unknown,
            DiscoveryContextAggregations
          >(buildDiscoveryContextQuery({ alertIdsByDiscoveryId, spaceId }));

          const body: GetDiscoveryContextResponse = {
            contexts: buildDiscoveryContexts({
              buckets: aggregations?.by_discovery?.buckets ?? {},
            }),
          };

          return response.ok({ body });
        } catch (error) {
          logger.warn(`Failed to derive PND discovery context: ${error}`);
          return response.ok({ body: EMPTY_RESPONSE });
        }
      }
    );
};
