/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { notFound } from '@hapi/boom';
import type { ServerRouteRepository } from '@kbn/server-route-repository-utils';
import { apiPrivileges } from '@kbn/agent-builder-plugin/common/features';
import { createObservabilityAgentBuilderServerRoute } from '../create_observability_agent_builder_server_route';
import { buildEvidenceTrendLensConfig } from '../../utils/significant_event/run_sig_event_evidence_trend';
import { getSignificantEventByEventId } from '../../utils/get_significant_event_by_event_id';
import {
  getPromotedSigEventEvidencesWithEsql,
  type SigEventDocumentForEvidence,
} from '../../utils/significant_event/evaluate_sig_event_evidences';
import {
  toEvidenceReviewTrendPayload,
  type SigEventEvidenceReviewResponse,
} from '../../utils/significant_event/sig_event_evidence_types';

export function getSignificantEventEvidenceReviewRouteRepository(): ServerRouteRepository {
  const significantEventEvidenceReviewRoute = createObservabilityAgentBuilderServerRoute({
    endpoint: 'POST /internal/observability_agent_builder/significant_events/evidence_review',
    options: {
      access: 'internal',
    },
    security: {
      authz: {
        requiredPrivileges: [apiPrivileges.readAgentBuilder],
      },
    },
    params: t.type({
      body: t.type({
        significantEventId: t.string,
        significantEventsIndex: t.string,
      }),
    }),
    handler: async ({ core, request, params, response, logger }) => {
      const [coreStart] = await core.getStartServices();
      const esClient = coreStart.elasticsearch.client.asScoped(request).asCurrentUser;

      const document: SigEventDocumentForEvidence | undefined = await getSignificantEventByEventId({
        esClient,
        eventId: params.body.significantEventId,
        index: params.body.significantEventsIndex,
      });

      if (!document) {
        throw notFound(
          `Significant event not found for event_id ${params.body.significantEventId} in ${params.body.significantEventsIndex}`
        );
      }

      const promotedEvidences = getPromotedSigEventEvidencesWithEsql(document);

      const toMs = Date.now();
      const hours = 2;
      const fromMs = toMs - hours * 60 * 60 * 1000;
      const trendRangeFrom = new Date(fromMs).toISOString();
      const trendRangeTo = new Date(toMs).toISOString();
      const trendBucketMinutes = 5;

      const evidenceItems = promotedEvidences.map((evidence) => {
        const ruleName = evidence.rule_name?.trim() || 'evidence';

        let trend: SigEventEvidenceReviewResponse['evidenceItems'][number]['trend'];
        try {
          trend = toEvidenceReviewTrendPayload(
            buildEvidenceTrendLensConfig({
              evidenceEsql: evidence.esql_query,
              rangeFrom: trendRangeFrom,
              rangeTo: trendRangeTo,
              bucketMinutes: trendBucketMinutes,
            })
          );
        } catch (err) {
          trend = {
            success: false as const,
            error: err instanceof Error ? err.message : String(err),
          };
        }

        return { ruleName, lastSeen: null, trend };
      });

      const body: SigEventEvidenceReviewResponse = {
        status: 'failing',
        recommendation: '',
        signals: {
          evidenceRowHits: 0,
          eligibleEvidenceCount: promotedEvidences.length,
          evidenceQueriesWithMatches: promotedEvidences.length,
        },
        significantEventId: params.body.significantEventId,
        trendRange: {
          from: trendRangeFrom,
          to: trendRangeTo,
          bucketMinutes: trendBucketMinutes,
        },
        evidenceItems,
      };

      return response.ok({ body });
    },
  });

  return {
    ...significantEventEvidenceReviewRoute,
  };
}
