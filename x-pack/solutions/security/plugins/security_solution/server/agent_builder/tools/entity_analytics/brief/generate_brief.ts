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
import type {
  BriefCandidate,
  GenerateBriefParams,
  GenerateBriefResult,
  BriefFact,
} from './brief_types';
import { buildFacts, getFirstCitedRiskChange } from './build_facts';
import { composeBrief } from './compose_brief';
import { describeCoverage, getPeriodStart } from './describe_scope';
import { fetchRiskAtStart } from './fetch_risk_at_start';
import { fetchCandidateEntities } from './fetch_candidate_entities';
import type { RiskChart } from './render_brief';
import { renderBrief } from './render_brief';
import { verifyBrief } from './verify_brief';

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
  // Risk change is supporting detail: a failure leaves its facts out, and the brief says so.
  const riskAtStart = await fetchRiskAtStart({ candidates, scope, spaceId, esClient }).catch(
    (error) => {
      logger.debug(`AI brief: risk change couldn't be read: ${error.message}`);
      return undefined;
    }
  );
  const riskChangeFailed = !riskAtStart;
  const facts = buildFacts(candidates, scope, {
    riskAtStart,
    storeStartTimestamp: entities.storeStartTimestamp,
  });
  const fetched = Date.now();

  if (facts.length === 0) {
    const took = Date.now() - started;
    logger.debug(`AI brief: quiet, ${entities.capturedCount} captured, took ${took}ms`);
    return {
      brief: renderBrief({ scope, spaceId, entities, riskChangeFailed }),
      outcome: 'quiet',
      stats: {
        candidateCount: 0,
        factCount: 0,
        priorityCount: 0,
        droppedPriorityCount: 0,
        repaired: false,
        took,
      },
    };
  }

  const { draft, repaired } = await composeBrief({
    inferenceClient,
    scope,
    candidates,
    facts,
    coverage: describeCoverage(scope, candidates.length, entities.capturedCount),
    abortSignal,
    logger,
  });
  const composed = Date.now();
  const verified = verifyBrief(draft, facts, scope, candidates);
  const priorityCandidates = verified.priorities.flatMap(
    ({ entityId }) => candidates.find(({ id }) => id === entityId) ?? []
  );
  const entityTableTag = await createEntityTable(priorityCandidates, attachments, logger);
  const riskChart = await createRiskChart({
    fact: getFirstCitedRiskChange(verified.priorities, facts),
    scope,
    riskScoreDataClient,
    attachments,
    logger,
  });
  const took = Date.now() - started;
  logger.debug(
    `AI brief: fetch ${fetched - started}ms, compose ${composed - fetched}ms, total ${took}ms; ` +
      `${candidates.length} candidates, ${facts.length} facts, ${verified.priorities.length} priorities, ` +
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
      riskChangeFailed,
    }),
    outcome: verified.priorities.length > 0 ? 'brief' : 'no_priorities',
    stats: {
      candidateCount: candidates.length,
      factCount: facts.length,
      priorityCount: verified.priorities.length,
      droppedPriorityCount: verified.droppedPriorityCount,
      repaired,
      took,
    },
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

/**
 * The period's risk-history chart for a cited risk change fact. A chart is supporting detail, so a
 * failure leaves the brief without one.
 */
const createRiskChart = async ({
  fact,
  scope,
  riskScoreDataClient,
  attachments,
  logger,
}: Pick<GenerateBriefParams, 'scope' | 'attachments' | 'logger' | 'riskScoreDataClient'> & {
  fact: BriefFact | undefined;
}): Promise<RiskChart | undefined> => {
  const riskChangeEntity = fact?.riskChangeEntity;
  if (!fact || !riskChangeEntity || !riskScoreDataClient) {
    return undefined;
  }
  const { id, name, type } = riskChangeEntity;
  const from = getPeriodStart(scope).toISOString();
  const to = new Date(scope.capturedAt).toISOString();
  const interval = resolveSimpleRiskScoreHistoryInterval({ min: moment(from), max: moment(to) });
  try {
    const entries = await riskScoreDataClient.getRiskScoreHistory({
      entityType: type,
      entityId: id,
      range: { gte: from, lte: to },
      scoreType: 'base',
      interval,
    });
    if (entries.length === 0) {
      return undefined;
    }
    const label = `${type}: ${name}`;
    const attachment = await ensureRiskScoreHistoryAttachment({
      attachments,
      id: buildRiskScoreHistoryAttachmentId(type, id, 'base'),
      data: {
        attachmentLabel: label,
        identifierType: type,
        identifier: name,
        entityStoreId: id,
        from,
        to,
        bucketInterval: `${interval.value}${interval.unit}`,
        scoreType: 'base',
        entries,
      },
      description: label,
      logger,
    });
    if (!attachment) {
      return undefined;
    }
    return { tag: buildRenderAttachmentTag(attachment), entityId: fact.entityId, riskChangeEntity };
  } catch (error) {
    logger.debug(`AI brief: no risk-history chart for ${id}: ${error.message}`);
    return undefined;
  }
};
