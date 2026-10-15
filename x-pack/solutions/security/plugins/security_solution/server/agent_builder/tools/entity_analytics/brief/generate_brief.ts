/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { Logger } from '@kbn/core/server';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import { buildRenderAttachmentTag } from '../attachment_utils';
import { buildListEntityAttachmentId, ensureEntityAttachment } from '../entity_attachment_utils';
import { resolveSimpleRiskScoreHistoryInterval } from '../risk_score_history/resolve_risk_score_history_interval';
import {
  buildRiskScoreHistoryAttachmentId,
  ensureRiskScoreHistoryAttachment,
} from '../risk_score_history/risk_score_history_attachment_utils';
import type { BriefCandidate, GenerateBriefParams, GenerateBriefResult } from './brief_types';
import { buildFacts, getCandidateRisk, getRiskChartEntityId } from './build_facts';
import { draftBrief } from './draft_brief';
import { describeCoverage, getPeriodStart } from './describe_scope';
import { fetchCandidateEntities, fetchRiskAtStart } from './read_entities';
import type { RiskChart } from './render_brief';
import { renderBrief } from './render_brief';
import { verifyDraft } from './verify_draft';

/** Turns the captured Entity Analytics view into the markdown brief. Elasticsearch and model errors propagate. */
export const generateBrief = async ({
  scope,
  spaceId,
  esClient,
  inferenceClient,
  attachments,
  riskScoreDataClient,
  abortSignal,
  logger,
}: GenerateBriefParams): Promise<GenerateBriefResult> => {
  const started = Date.now();
  const entities = await fetchCandidateEntities({ scope, spaceId, esClient, logger });
  const { candidates } = entities;
  // Every candidate has facts, so with none there is nothing to brief on and no model call.
  if (candidates.length === 0) {
    logger.debug(`AI brief: quiet, ${entities.capturedCount} captured`);
    return { brief: renderBrief({ scope, spaceId, entities }), priorityCount: 0 };
  }
  // Risk change is supporting detail: a failure leaves its facts out, and the brief says so.
  const riskAtStart = await fetchRiskAtStart({ candidates, scope, spaceId, esClient }).catch(
    (error) => {
      logger.debug(`AI brief: risk change couldn't be read: ${error.message}`);
      return undefined;
    }
  );
  const facts = buildFacts(candidates, scope, {
    riskAtStart,
    storeStartTimestamp: entities.storeStartTimestamp,
  });
  const fetched = Date.now();

  const { draft, repaired } = await draftBrief({
    inferenceClient,
    scope,
    facts,
    coverage: describeCoverage(scope, entities),
    abortSignal,
    logger,
  });
  const composed = Date.now();
  const verified = verifyDraft(draft, facts, scope);
  const priorityCandidates = verified.priorities.flatMap(
    ({ entityId }) => candidates.find(({ id }) => id === entityId) ?? []
  );
  const entityTableTag = await createEntityTable(priorityCandidates, attachments, logger);
  const chartEntityId = getRiskChartEntityId(verified.priorities, facts);
  const riskChart = await createRiskChart({
    candidate: candidates.find(({ id }) => id === chartEntityId),
    scope,
    riskScoreDataClient,
    attachments,
    logger,
  });
  const took = Date.now() - started;
  logger.debug(
    `AI brief: fetch ${fetched - started}ms, compose ${composed - fetched}ms, total ${took}ms; ` +
      `${candidates.length} candidates, ${verified.priorities.length} priorities, ` +
      `${verified.droppedPriorityCount} dropped, repaired ${repaired}`
  );
  return {
    brief: renderBrief({
      scope,
      spaceId,
      entities,
      verified,
      entityTableTag,
      riskChart,
      riskChangeFailed: !riskAtStart,
    }),
    priorityCount: verified.priorities.length,
  };
};

/** The priorities as a `security.entity` list attachment, returned as its render tag. */
const createEntityTable = async (
  candidates: BriefCandidate[],
  attachments: AttachmentStateManager,
  logger: Logger
): Promise<string | undefined> => {
  if (candidates.length === 0) {
    return undefined;
  }
  const entities = candidates.map(({ id, name, type }) => ({
    identifierType: type,
    identifier: name,
    entityStoreId: id,
  }));
  const attachment = await ensureEntityAttachment({
    attachments,
    id: buildListEntityAttachmentId(entities),
    data: { entities, attachmentLabel: 'AI brief priorities' },
    description: 'Entities prioritised by the Entity Analytics AI brief',
    logger,
  });
  return attachment ? buildRenderAttachmentTag(attachment) : undefined;
};

/** The period's risk-history chart for a priority whose risk moved. A failure means no chart, never a failed brief. */
const createRiskChart = async ({
  candidate,
  scope,
  riskScoreDataClient,
  attachments,
  logger,
}: Pick<GenerateBriefParams, 'scope' | 'attachments' | 'logger' | 'riskScoreDataClient'> & {
  candidate: BriefCandidate | undefined;
}): Promise<RiskChart | undefined> => {
  const risk = candidate && getCandidateRisk(candidate);
  if (!candidate || !risk || !riskScoreDataClient) {
    return undefined;
  }
  const { name, type } = candidate;
  const { scoredId: id, scoreType, of } = risk;
  const from = getPeriodStart(scope).toISOString();
  const to = new Date(scope.capturedAt).toISOString();
  const interval = resolveSimpleRiskScoreHistoryInterval({ min: moment(from), max: moment(to) });
  try {
    const entries = await riskScoreDataClient.getRiskScoreHistory({
      entityType: type,
      entityId: id,
      range: { gte: from, lte: to },
      scoreType,
      interval,
    });
    if (entries.length === 0) {
      return undefined;
    }
    const label = `${type}: ${name}`;
    const attachment = await ensureRiskScoreHistoryAttachment({
      attachments,
      id: buildRiskScoreHistoryAttachmentId(type, id, scoreType),
      data: {
        attachmentLabel: label,
        identifierType: type,
        identifier: name,
        entityStoreId: id,
        from,
        to,
        bucketInterval: `${interval.value}${interval.unit}`,
        scoreType,
        entries,
      },
      description: label,
      logger,
    });
    if (!attachment) {
      return undefined;
    }
    return { tag: buildRenderAttachmentTag(attachment), entityId: candidate.id, of };
  } catch (error) {
    logger.debug(`AI brief: no risk-history chart for ${id}: ${error.message}`);
    return undefined;
  }
};
