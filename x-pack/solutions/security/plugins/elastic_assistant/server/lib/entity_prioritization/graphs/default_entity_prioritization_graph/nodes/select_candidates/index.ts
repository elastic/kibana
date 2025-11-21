/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClientLlm } from '@kbn/langchain/server';
import type { Logger } from '@kbn/core/server';
import { StructuredOutputParser } from 'langchain/output_parsers';
import { ChatPromptTemplate } from '@langchain/core/prompts';

import type { ThreatHuntingPrioritiesGraphState } from '../../../../state';
import { getSelectCandidatesSchema } from '../../schemas';
import type { CombinedPrompts } from '../../prompts';
import { extractJson } from '../../../../../langchain/output_chunking/nodes/helpers/extract_json';

const MAX_SELECTED_CANDIDATES = 10;

/**
 * Formats candidate entities into a readable string for the LLM prompt
 * Only includes information available from getRiskScoreSpikes
 */
const formatCandidateEntities = (
  candidateEntities: ThreatHuntingPrioritiesGraphState['candidateEntities']
): string => {
  if (candidateEntities.length === 0) {
    return 'No candidate entities found.';
  }

  return candidateEntities
    .map((entity, index) => {
      const details: string[] = [];
      details.push(`Entity ID: ${entity.entityId}`);
      details.push(`Type: ${entity.entityType}`);

      // Include baseline if available
      if (entity.baseline !== undefined) {
        details.push(`Baseline Risk Score: ${entity.baseline}`);
      }

      // Include spike value if available
      if (entity.spike !== undefined) {
        details.push(`Spike: +${entity.spike}`);
      }

      // Include current risk score (baseline + spike or new score)
      if (entity.riskScore !== undefined) {
        details.push(`Current Risk Score: ${entity.riskScore}`);
      }

      // Indicate if this is a new high score (baseline is 0) vs spike above baseline
      if (entity.riskScoreSpike) {
        if (entity.baseline === 0) {
          details.push('New high-risk entity (no previous baseline)');
        } else {
          details.push('Spike above baseline');
        }
      }

      return `${index + 1}. ${details.join(', ')}`;
    })
    .join('\n');
};

export const getSelectCandidatesNode = ({
  llm,
  logger,
  prompts,
}: {
  llm: ActionsClientLlm;
  logger?: Logger;
  prompts: CombinedPrompts;
}): ((state: ThreatHuntingPrioritiesGraphState) => Promise<ThreatHuntingPrioritiesGraphState>) => {
  const selectCandidates = async (
    state: ThreatHuntingPrioritiesGraphState
  ): Promise<ThreatHuntingPrioritiesGraphState> => {
    logger?.debug(() => '---SELECT CANDIDATES---');

    const { candidateEntities } = state;

    // If no candidates, return early
    if (candidateEntities.length === 0) {
      logger?.debug(() => 'No candidate entities to select from');
      return {
        ...state,
        selectedCandidateIds: [],
      };
    }

    // If we have 10 or fewer candidates, select all of them
    if (candidateEntities.length <= MAX_SELECTED_CANDIDATES) {
      logger?.debug(
        () => `Only ${candidateEntities.length} candidates found, selecting all for enrichment`
      );
      return {
        ...state,
        selectedCandidateIds: candidateEntities.map((entity) => entity.entityId),
      };
    }

    try {
      const generationSchema = getSelectCandidatesSchema();
      const outputParser = StructuredOutputParser.fromZodSchema(generationSchema);
      const formatInstructions = outputParser.getFormatInstructions();

      // Build the prompt
      const candidateEntitiesText = formatCandidateEntities(candidateEntities);
      const prompt = `${
        prompts.selectCandidates ||
        'Select the most interesting candidate entities for further analysis.'
      }

Candidate Entities:
${candidateEntitiesText}

Select exactly ${MAX_SELECTED_CANDIDATES} entity IDs that are most worthy of further investigation. Consider factors such as:
- High current risk scores
- Large spike values (the magnitude of the increase)
- Entities with spikes above an established baseline (vs new high-risk entities)
- The ratio of spike to baseline (a small spike on a low baseline may be significant)

${formatInstructions}`;

      const chatPrompt = ChatPromptTemplate.fromTemplate(
        `Answer the user's question as best you can:\n{format_instructions}\n{query}`
      );

      const chain = chatPrompt.pipe(llm);
      const llmType = llm._llmType();

      logger?.debug(
        () =>
          `selectCandidates node is invoking the chain (${llmType}) to select from ${candidateEntities.length} candidates`
      );

      const rawResponse = (await chain.invoke({
        format_instructions: formatInstructions,
        query: prompt,
      })) as unknown as string;

      // Extract JSON from response
      const jsonResponse = extractJson(rawResponse);
      const parsed = await outputParser.parse(jsonResponse);

      // Validate and limit to MAX_SELECTED_CANDIDATES
      const selectedEntityIds = parsed.selectedEntityIds
        .slice(0, MAX_SELECTED_CANDIDATES)
        .filter((id: string) => {
          // Validate that the selected ID exists in our candidate entities
          const exists = candidateEntities.some((entity) => entity.entityId === id);
          if (!exists) {
            logger?.warn(
              () => `LLM selected entity ID "${id}" that doesn't exist in candidate entities`
            );
          }
          return exists;
        });

      logger?.debug(
        () =>
          `Selected ${selectedEntityIds.length} candidates for enrichment: ${selectedEntityIds.join(
            ', '
          )}`
      );

      return {
        ...state,
        selectedCandidateIds: selectedEntityIds,
      };
    } catch (error) {
      logger?.error(() => `Error selecting candidates: ${error}`);
      // Fallback: select first MAX_SELECTED_CANDIDATES candidates
      const fallbackSelection = candidateEntities
        .slice(0, MAX_SELECTED_CANDIDATES)
        .map((entity) => entity.entityId);
      logger?.warn(
        () => `Falling back to selecting first ${fallbackSelection.length} candidates due to error`
      );
      return {
        ...state,
        selectedCandidateIds: fallbackSelection,
      };
    }
  };

  return selectCandidates;
};
