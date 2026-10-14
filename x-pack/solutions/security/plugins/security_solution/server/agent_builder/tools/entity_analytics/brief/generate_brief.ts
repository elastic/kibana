/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import { buildRenderAttachmentTag } from '../attachment_utils';
import { buildListEntityAttachmentId, ensureEntityAttachment } from '../entity_attachment_utils';
import type { BriefCandidate, GenerateBriefParams, GenerateBriefResult } from './brief_types';
import { buildFacts } from './build_facts';
import { composeBrief } from './compose_brief';
import { fetchCandidateEntities } from './fetch_candidate_entities';
import { renderBrief } from './render_brief';
import { verifyBrief } from './verify_brief';

/** Turns the captured Entity Analytics view into the markdown brief. Elasticsearch and model errors propagate. */
export const generateBrief = async ({
  scope,
  spaceId,
  esClient,
  inferenceClient,
  attachments,
  abortSignal,
  logger,
}: GenerateBriefParams): Promise<GenerateBriefResult> => {
  const started = Date.now();
  const entities = await fetchCandidateEntities({ scope, spaceId, esClient, logger });
  const { candidates } = entities;
  const facts = buildFacts(candidates, scope);
  const fetched = Date.now();

  if (facts.length === 0) {
    const took = Date.now() - started;
    logger.debug(`AI brief: quiet, ${entities.capturedCount} captured, took ${took}ms`);
    return {
      brief: renderBrief({ scope, spaceId, entities }),
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
    abortSignal,
    logger,
  });
  const composed = Date.now();
  const verified = verifyBrief(draft, facts);
  const priorityCandidates = verified.priorities.flatMap(
    ({ entityId }) => candidates.find(({ id }) => id === entityId) ?? []
  );
  const entityTableTag = await createEntityTable(priorityCandidates, attachments, logger);
  const took = Date.now() - started;
  logger.debug(
    `AI brief: fetch ${fetched - started}ms, compose ${composed - fetched}ms, total ${took}ms; ` +
      `${candidates.length} candidates, ${facts.length} facts, ${verified.priorities.length} priorities, ` +
      `${verified.droppedPriorityCount} dropped, repaired ${repaired}`
  );
  return {
    brief: renderBrief({ scope, spaceId, entities, verified, entityTableTag }),
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
