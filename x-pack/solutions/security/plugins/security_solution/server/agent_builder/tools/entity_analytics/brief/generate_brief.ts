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
import { attachRiskScoreHistory } from '../risk_score_history/risk_score_history_attachment_utils';
import type { BriefCandidate, GenerateBriefParams, GenerateBriefResult } from './types';
import { buildFacts } from './build_facts';
import { describeSample, getPeriodStart } from './describe_scope';
import { draftBrief } from './draft_brief';
import { getCandidateRisk, readEntities } from './read_entities';
import type { RiskChart } from './render_brief';
import { getRiskChartEntityId, renderBrief } from './render_brief';
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
  const entities = await readEntities({ scope, spaceId, esClient });
  const { candidates } = entities;
  if (candidates.length === 0) {
    return { brief: renderBrief({ scope, spaceId, entities }), priorityCount: 0 };
  }

  const facts = buildFacts(candidates, scope);
  const draft = await draftBrief({
    inferenceClient,
    scope,
    facts,
    sample: describeSample(scope, entities),
    abortSignal,
  });
  const verified = verifyDraft(draft, facts);

  const findCandidate = (entityId: string | undefined) =>
    candidates.find(({ id }) => id === entityId);
  const entityTableTag = await createEntityTable(
    verified.priorities.flatMap(({ entityId }) => findCandidate(entityId) ?? []),
    attachments,
    logger
  );
  const riskChart = await createRiskChart({
    candidate: findCandidate(getRiskChartEntityId(verified.priorities, facts)),
    scope,
    riskScoreDataClient,
    attachments,
    logger,
  });

  logger.debug(
    `AI brief: ${candidates.length} candidates, ${verified.priorities.length} priorities, ` +
      `${verified.droppedPriorityCount} dropped, ${Date.now() - started}ms`
  );
  return {
    brief: renderBrief({
      scope,
      spaceId,
      entities,
      verified,
      entityTableTag,
      riskChart,
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
    description: 'Entities prioritized by the Entity Analytics AI brief',
    logger,
  });
  return attachment ? buildRenderAttachmentTag(attachment) : undefined;
};

/** The period's risk-history chart for a candidate. A failure means no chart, never a failed brief. */
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
  const { scoredId, scoreType } = risk;
  const from = getPeriodStart(scope).toISOString();
  const to = new Date(scope.capturedAt).toISOString();
  const interval = resolveSimpleRiskScoreHistoryInterval({ min: moment(from), max: moment(to) });
  try {
    const entries = await riskScoreDataClient.getRiskScoreHistory({
      entityType: type,
      entityId: scoredId,
      range: { gte: from, lte: to },
      scoreType,
      interval,
    });
    if (entries.length === 0) {
      return undefined;
    }
    const attachment = await attachRiskScoreHistory({
      attachments,
      logger,
      identifierType: type,
      identifier: name,
      entityStoreId: scoredId,
      scoreType,
      from,
      to,
      interval,
      entries,
    });
    return attachment
      ? { tag: buildRenderAttachmentTag(attachment), entityId: candidate.id, of: risk.of }
      : undefined;
  } catch (error) {
    logger.debug(`AI brief: no risk-history chart for ${scoredId}: ${error.message}`);
    return undefined;
  }
};
