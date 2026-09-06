/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import { z } from '@kbn/zod/v4';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { MAX_PROMOTED_LEADS } from '../../../../common/entity_analytics/lead_generation/constants';
import {
  formatRelatedEntity,
  formatOmittedRelatedEntityCounts,
} from '../../../../common/entity_analytics/lead_generation/format_related_entity';
import type { LeadCandidate } from './engine/lead_generation_engine';
import {
  extractIsPrivileged,
  errorMessage,
  getEntityAttributes,
  getEntityLifecycle,
} from './observation_modules/utils';
import { getRelatedEntitySignificance } from './attach_related_entities';

export const POOL_SIZE = 150;

/**
 * Upper bound on the rendered pool payload handed to the LLM. Guards against
 * context-window pressure and latency when entities are unusually dense.
 * ~480k chars is ~155k tokens on the heaviest tokenizer observed (Claude,
 * ~3.09 chars/token) = ~78% of a 200k-context model, and ~13% of a 1M model,
 * so it only ever trims pathologically dense pools. Tunable.
 */
export const MAX_POOL_PAYLOAD_CHARS = 480_000;

const relationshipsScore = (candidate: LeadCandidate): number =>
  candidate.topRelatedEntities.reduce((sum, r) => sum + getRelatedEntitySignificance(r), 0);

const formatPoolEntity = (candidate: LeadCandidate, index: number): string => {
  const { entity, observations, topRelatedEntities, relatedEntityCounts } = candidate;
  const attributes = getEntityAttributes(entity);
  const firstSeen = getEntityLifecycle(entity)?.first_seen;

  const header = `### Pool entity ${index + 1}`;
  const identityLine = `  ${entity.type} "${entity.name}" (EUID: ${entity.id})`;
  const attributesLine = `  Attributes: managed=${attributes?.managed ?? 'unknown'}, mfa_enabled=${
    attributes?.mfa_enabled ?? 'unknown'
  }, privileged=${extractIsPrivileged(entity)}`;
  const firstSeenLine = firstSeen ? `  First seen: ${firstSeen}` : '';

  const obsLines =
    observations.length > 0
      ? `  Observations:\n${observations
          .map((o) => `    - [${o.severity.toUpperCase()}] ${o.description} (type=${o.type})`)
          .join('\n')}`
      : '  Observations: none';

  const omitted = formatOmittedRelatedEntityCounts(topRelatedEntities, relatedEntityCounts);
  const relatedLines =
    topRelatedEntities.length > 0
      ? `  Related entities:\n${topRelatedEntities
          .map((r) => `    - ${formatRelatedEntity(r)}`)
          .join('\n')}${omitted ? `\n    (not shown: ${omitted})` : ''}`
      : '  Related entities: none';

  return [header, identityLine, attributesLine, firstSeenLine, obsLines, relatedLines]
    .filter(Boolean)
    .join('\n');
};

/**
 * Ranks exploratory candidates by related-entity significance so High/Critical
 * (and other strong) relationships are included, then caps at {@link POOL_SIZE}
 * and {@link MAX_POOL_PAYLOAD_CHARS}. Candidates without those relationships
 * still fill remaining slots.
 */
const buildExploratoryPool = (
  exploratory: readonly LeadCandidate[]
): { pool: LeadCandidate[]; poolPayload: string } => {
  const ranked = [...exploratory].sort((a, b) => relationshipsScore(b) - relationshipsScore(a));
  const pool: LeadCandidate[] = [];
  const blocks: string[] = [];
  let chars = 0;
  for (const candidate of ranked) {
    if (pool.length >= POOL_SIZE) break;
    const block = formatPoolEntity(candidate, pool.length);
    const added = block.length + (pool.length > 0 ? 2 : 0);
    if (chars + added > MAX_POOL_PAYLOAD_CHARS) break;
    chars += added;
    pool.push(candidate);
    blocks.push(block);
  }
  return { pool, poolPayload: blocks.join('\n\n') };
};

const PROMOTION_PROMPT = `You are a senior security analyst seeding a threat hunt.

Each selection must support a testable hypothesis a hunter could pursue today: what happened, why this entity matters, and why now.

**Pool entities:**
{pool_payload}

Select up to {max_selections} entities above that would change what a hunter investigates today. This is an absolute bar, not a ranking. Return an empty list if none clear it. Do not pad the list to reach {max_selections}.

Do not select an entity only because it has many observations or a high-risk related entity. Select when a combination of this entity's own facts is hunt-worthy — for example newly observed together with unmanaged or privileged access and an interesting relationship. A single attribute or a generic "unusual" observation is not enough.

Rules:
- Only select entities listed above. Only cite facts listed for that entity. Never invent a connection or fact.
- "Accessed by at least N entities" is a lower bound — never treat it as an exact count.
- "reason" must cite the specific observations, attributes, or relationships the claim rests on, so an analyst can verify it from that entity's data alone.
- "confidence" is how certain you are this would change a hunter's priorities today, not a general risk rating.`;

const promotionPrompt = ChatPromptTemplate.fromTemplate(PROMOTION_PROMPT);
const promotionOutputSchema = z.object({
  selections: z
    .array(
      z.object({
        euid: z.string().min(1).describe('The exact EUID from the pool entity, e.g. "user:alice"'),
        reason: z
          .string()
          .min(1)
          .describe(
            'One or two sentences, plain text, citing the specific observations, attributes, or relationships that make this entity hunt-worthy'
          ),
        confidence: z
          .enum(['low', 'medium', 'high'])
          .describe(
            "How certain you are this would change a hunter's priorities today, not a general risk rating"
          ),
      })
    )
    .max(POOL_SIZE)
    .describe(
      `Up to ${MAX_PROMOTED_LEADS} entities that would change what a hunter investigates today. Empty if none clear the bar.`
    ),
});

export const buildExploratoryLeads = async (
  candidates: readonly LeadCandidate[],
  { chatModel, logger }: { chatModel: InferenceChatModel; logger: Logger }
): Promise<LeadCandidate[]> => {
  const { pool, poolPayload } = buildExploratoryPool(candidates);
  logger.debug(
    `[LeadGeneration] Exploratory pool: ${pool.length} of ${candidates.length} exploratory candidates`
  );
  if (pool.length === 0) {
    return [];
  }

  const countCap = Math.min(candidates.length, POOL_SIZE);
  if (pool.length < countCap) {
    logger.info(
      `[LeadGeneration][Telemetry] Exploratory pool trimmed by payload budget: ${pool.length}/${countCap} candidates, ${poolPayload.length}/${MAX_POOL_PAYLOAD_CHARS} chars`
    );
  }

  const llmSelectionStart = Date.now();
  try {
    const candidateLookup = new Map(pool.map((candidate) => [candidate.entity.id, candidate]));

    const structuredModel = chatModel.withStructuredOutput(promotionOutputSchema, {
      name: 'select_exploratory_leads',
    });
    const chain = promotionPrompt.pipe(structuredModel);

    logger.info(
      `[LeadGeneration] Invoking LLM for selecting exploratory leads from ${pool.length} pool entities`
    );

    const { selections } = await chain.invoke({
      max_selections: String(MAX_PROMOTED_LEADS),
      pool_payload: poolPayload,
    });

    if (!Array.isArray(selections)) {
      throw new Error('LLM exploratory lead selection returned with invalid format');
    }

    const selected: LeadCandidate[] = [];
    for (const item of selections) {
      const candidate = candidateLookup.get(item.euid);
      if (!candidate) {
        logger.warn(
          `[LeadGeneration] Promotion referenced EUID not in the pool, rejecting: ${item.euid}`
        );
      } else {
        selected.push({
          ...candidate,
          origin: 'exploratory',
          promotionReason: item.reason,
          promotionConfidence: item.confidence,
        });
      }
    }

    const promoted = selected.slice(0, MAX_PROMOTED_LEADS);
    logger.info(
      `[LeadGeneration][Telemetry] LLM exploratory lead selection: ${
        Date.now() - llmSelectionStart
      }ms (${promoted.length} of ${selections.length} selected from ${pool.length} pool candidates)`
    );
    return promoted;
  } catch (error) {
    logger.warn(`[LeadGeneration] LLM exploratory lead selection failed: ${errorMessage(error)}`);
    return [];
  }
};
