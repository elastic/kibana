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
import type { SignalCardId } from '../../../../../common/entity_analytics/home/constants';
import type {
  BriefCandidate,
  EntityFacts,
  GenerateBriefParams,
  GenerateBriefResult,
} from './types';
import { buildFacts } from './build_facts';
import { describeSample, getPeriodStart } from './describe_scope';
import { draftBrief } from './draft_brief';
import { readAlertRules } from './read_alert_rules';
import { readAnomalies } from './read_anomalies';
import { readWatchlistNames } from './read_watchlist_names';
import { getCandidateRisk, readEntities } from './read_entities';
import type { BriefPriority } from './prompts';
import { renderBriefHtml } from './render_brief_html';
import { verifyDraft } from './verify_draft';
import type { BriefRiskHistory } from './view_model';
import { buildViewModel } from './view_model';

/** A chart explains a priority whose risk the page flags as changed. */
const RISK_CHART_TILE_IDS: readonly SignalCardId[] = ['riskMovers', 'newlyHighCritical'];

/** The most points of a risk history the chart draws. */
const MAX_HISTORY_POINTS = 12;

/** Turns the captured Entity Analytics view into the HTML brief. Elasticsearch and model errors propagate. */
export const generateBrief = async ({
  scope,
  spaceId,
  esClient,
  inferenceClient,
  attachments,
  watchlistConfigClient,
  jobService,
  riskScoreDataClient,
  abortSignal,
  logger,
}: GenerateBriefParams): Promise<GenerateBriefResult> => {
  const started = Date.now();
  const entities = await readEntities({ scope, spaceId, esClient });
  const { candidates } = entities;
  if (candidates.length === 0) {
    const viewModel = buildViewModel({ scope, spaceId, entities, facts: [] });
    return { ...renderBriefHtml(viewModel), viewModel, priorityCount: 0 };
  }

  const [
    { alertsByEntityId, isFailed: alertsFailed },
    { anomaliesByEntityId, isFailed: anomaliesFailed },
  ] = await Promise.all([
    readAlertRules({ candidates, scope, spaceId, esClient, logger }),
    readAnomalies({ candidates, scope, jobService, esClient, logger }),
  ]);
  const watchlistNamesById = await readWatchlistNames(watchlistConfigClient, logger);
  const facts = buildFacts(
    candidates,
    scope,
    alertsByEntityId,
    anomaliesByEntityId,
    watchlistNamesById
  );
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
  const riskHistory = await readRiskHistory({
    candidate: findCandidate(getRiskChartEntityId(verified.priorities, facts)),
    scope,
    riskScoreDataClient,
    logger,
  });
  const viewModel = buildViewModel({
    scope,
    spaceId,
    entities,
    facts,
    verified,
    riskHistory,
    alertsFailed,
    anomaliesFailed,
    logger,
  });

  logger.debug(
    `AI brief: ${candidates.length} candidates, ${verified.priorities.length} priorities, ` +
      `${verified.droppedPriorityCount} dropped, ${Date.now() - started}ms`
  );
  return {
    ...renderBriefHtml(viewModel),
    viewModel,
    entityTableTag,
    priorityCount: verified.priorities.length,
  };
};

/** The first priority a risk tile flags. Only it gets a chart. */
const getRiskChartEntityId = (
  priorities: BriefPriority[],
  facts: EntityFacts[]
): string | undefined =>
  priorities.find(({ entityId }) =>
    facts
      .find((entity) => entity.entityId === entityId)
      ?.flaggedFor.some((tileId) => RISK_CHART_TILE_IDS.includes(tileId))
  )?.entityId;

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

/** The period's risk history for a candidate. A failure means no chart, never a failed brief. */
const readRiskHistory = async ({
  candidate,
  scope,
  riskScoreDataClient,
  logger,
}: Pick<GenerateBriefParams, 'scope' | 'logger' | 'riskScoreDataClient'> & {
  candidate: BriefCandidate | undefined;
}): Promise<{ entityId: string; history: BriefRiskHistory } | undefined> => {
  const risk = candidate && getCandidateRisk(candidate);
  if (!candidate || !risk || !riskScoreDataClient) {
    return undefined;
  }
  const { type } = candidate;
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
    const sorted = [...entries].sort((a, b) => a['@timestamp'].localeCompare(b['@timestamp']));
    // Evenly spaced, always keeping the first and the last.
    const picked =
      sorted.length <= MAX_HISTORY_POINTS
        ? sorted
        : Array.from(
            { length: MAX_HISTORY_POINTS },
            (_, index) =>
              sorted[Math.round((index * (sorted.length - 1)) / (MAX_HISTORY_POINTS - 1))]
          );
    return {
      entityId: candidate.id,
      history: {
        of: risk.of,
        from,
        to,
        points: picked.map((entry) => ({
          t: entry['@timestamp'],
          score: entry.calculated_score_norm,
          level: entry.calculated_level,
        })),
      },
    };
  } catch (error) {
    logger.debug(`AI brief: no risk history for ${scoredId}: ${error.message}`);
    return undefined;
  }
};
