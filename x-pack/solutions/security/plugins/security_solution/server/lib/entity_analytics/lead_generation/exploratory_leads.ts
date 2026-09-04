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

const relationshipsScore = (candidate: LeadCandidate): number =>
  candidate.topRelatedEntities.reduce((sum, r) => sum + getRelatedEntitySignificance(r), 0);

/**
 * Ranks exploratory candidates by related-entity significance so High/Critical
 * (and other strong) relationships are included, then caps at {@link POOL_SIZE}.
 * Candidates without those relationships still fill remaining slots.
 */
const buildExploratoryPool = (exploratory: readonly LeadCandidate[]): LeadCandidate[] =>
  [...exploratory]
    .sort((a, b) => relationshipsScore(b) - relationshipsScore(a))
    .slice(0, POOL_SIZE);

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
const formatPoolPayload = (pool: readonly LeadCandidate[]): string =>
  pool.map((c, i) => formatPoolEntity(c, i)).join('\n\n');

const PROMOTION_PROMPT = `You are a senior security analyst seeding a threat hunt.

Each selection must support a testable hypothesis a hunter could pursue today: what happened, why this entity matters, and why now.

**Pool entities:**
{pool_payload}

Select up to {max_selections} entities above that would change what a hunter investigates today. This is an absolute bar, not a ranking. Return an empty list if none clear it. Do not pad the list to reach {max_selections}.

Do not select an entity based on a single strong-looking fact alone — a lone "High" or "Critical" risk score, a lone relationship to a critical-impact asset, or a generic "unusual" observation, with no other attribute or observation, is exactly the kind of entity to reject, no matter how alarming it looks in isolation. Select only when a combination of this entity's own facts is hunt-worthy — for example newly observed together with unmanaged or privileged access and an interesting relationship, or newly observed together with recently gaining control over a critical-impact asset, or a governance gap (unmanaged, no MFA, or privileged access) together with a relationship to a critical-impact asset.

Rules:
- Only select entities listed above. Only cite facts listed for that entity. Never invent a connection, count, or fact that is not written verbatim above for that entity.
- Before finalizing each selection, re-read that entity's own pool listing and confirm every fact in "reason" appears there — if it doesn't, drop that fact or drop the selection.
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
    .max(MAX_PROMOTED_LEADS)
    .describe(
      `Up to ${MAX_PROMOTED_LEADS} entities that would change what a hunter investigates today. Empty if none clear the bar.`
    ),
});

export const buildExploratoryLeads = async (
  candidates: readonly LeadCandidate[],
  { chatModel, logger }: { chatModel: InferenceChatModel; logger: Logger }
): Promise<LeadCandidate[]> => {
  const pool = buildExploratoryPool(candidates);
  logger.debug(
    `[LeadGeneration] Exploratory pool: ${pool.length} of ${candidates.length} exploratory candidates`
  );
  if (pool.length === 0) {
    return [];
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
      pool_payload: formatPoolPayload(pool),
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

    logger.info(
      `[LeadGeneration][Telemetry] LLM exploratory lead selection: ${
        Date.now() - llmSelectionStart
      }ms (${selected.length} of ${selections.length} selected from ${pool.length} pool candidates)`
    );
    return selected;
  } catch (error) {
    logger.warn(`[LeadGeneration] LLM exploratory lead selection failed: ${errorMessage(error)}`);
    return [];
  }
};
