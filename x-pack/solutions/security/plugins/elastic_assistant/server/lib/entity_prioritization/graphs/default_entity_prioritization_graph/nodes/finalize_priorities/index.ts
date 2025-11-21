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
import { getThreatHuntingPrioritiesGenerationSchema } from '../../schemas';
import type { CombinedPrompts } from '../../prompts';
import { extractJson } from '../../../../../langchain/output_chunking/nodes/helpers/extract_json';

/**
 * Formats enriched entity data for the LLM prompt
 */
const formatEnrichedEntity = (
  entityId: string,
  entityType: 'user' | 'host',
  enrichedData?: ThreatHuntingPrioritiesGraphState['enrichedEntities'] extends Map<string, infer V>
    ? V
    : never
): string => {
  // Format enriched entity data for LLM prompt
  const parts: string[] = [];
  parts.push(`Entity ID: ${entityId}`);
  parts.push(`Type: ${entityType}`);

  if (enrichedData) {
    if (enrichedData.riskScore) {
      parts.push(`Risk Score: ${JSON.stringify(enrichedData.riskScore, null, 2)}`);
    }
    if (enrichedData.assetCriticality) {
      parts.push(`Asset Criticality: ${JSON.stringify(enrichedData.assetCriticality, null, 2)}`);
    }
    if (enrichedData.vulnerabilities) {
      parts.push(
        `Vulnerabilities: ${enrichedData.vulnerabilities.vulnerabilitiesTotal} total, ${
          enrichedData.vulnerabilities.vulnerabilitiesAnonymized?.length ?? 0
        } shown`
      );
      if (enrichedData.vulnerabilities.vulnerabilitiesAnonymized) {
        parts.push(
          `Vulnerability Details: ${JSON.stringify(
            enrichedData.vulnerabilities.vulnerabilitiesAnonymized,
            null,
            2
          )}`
        );
      }
    }
    if (enrichedData.anomalies && enrichedData.anomalies.length > 0) {
      parts.push(`Anomalies: ${enrichedData.anomalies.length} detected`);
      parts.push(`Anomaly Details: ${JSON.stringify(enrichedData.anomalies, null, 2)}`);
    }
  }

  return parts.join('\n');
};

/**
 * Formats all enriched entities for the LLM prompt
 */
const formatEnrichedEntities = (state: ThreatHuntingPrioritiesGraphState): string => {
  const { candidateEntities, selectedCandidateIds, enrichedEntities } = state;

  if (selectedCandidateIds.length === 0) {
    return 'No entities selected for enrichment.';
  }

  return selectedCandidateIds
    .map((entityId, index) => {
      const candidateEntity = candidateEntities.find((e) => e.entityId === entityId);
      if (!candidateEntity) {
        return `${index + 1}. Entity ${entityId} (not found in candidates)`;
      }

      const enrichedData = enrichedEntities.get(entityId);
      return `${index + 1}. ${formatEnrichedEntity(
        entityId,
        candidateEntity.entityType,
        enrichedData
      )}`;
    })
    .join('\n\n');
};

export const getFinalizePrioritiesNode = ({
  llm,
  logger,
  prompts,
}: {
  llm: ActionsClientLlm;
  logger?: Logger;
  prompts: CombinedPrompts;
}): ((state: ThreatHuntingPrioritiesGraphState) => Promise<ThreatHuntingPrioritiesGraphState>) => {
  const finalizePriorities = async (
    state: ThreatHuntingPrioritiesGraphState
  ): Promise<ThreatHuntingPrioritiesGraphState> => {
    logger?.debug(() => '---FINALIZE PRIORITIES---');

    const { selectedCandidateIds } = state;

    if (selectedCandidateIds.length === 0) {
      logger?.warn(() => 'No selected candidates to finalize');
      return {
        ...state,
        priorities: [],
      };
    }

    try {
      const generationSchema = getThreatHuntingPrioritiesGenerationSchema(prompts);
      const outputParser = StructuredOutputParser.fromZodSchema(generationSchema);
      const formatInstructions = outputParser.getFormatInstructions();

      // Build the prompt with enriched entity data
      const enrichedEntitiesText = formatEnrichedEntities(state);
      const prompt = `${
        prompts.finalizePriorities ||
        'Analyze the following enriched entities and create a prioritized list of threat hunting priorities. Each priority should group related entities together when they represent the same threat or attack pattern. For each priority, provide a title, detailed description, the associated entities, relevant tags (including MITRE ATT&CK techniques if applicable), and a priority score (1-10, where 10 is highest priority).'
      }

Enriched Entities:
${enrichedEntitiesText}

Create a prioritized list of threat hunting priorities. Each priority can include one or more entities if they are related to the same threat. For each priority:
- Title: A concise, descriptive title (e.g., "Lateral Movement Between Critical Hosts")
- Description: A detailed explanation of why this is a priority, what threats are indicated, and what investigation steps should be taken
- Entities: Array of entities (with type, idField like "host.name" or "user.name", and idValue) associated with this priority
- Tags: Array of tags including key themes (e.g., "Lateral Movement", "Credential Theft") and MITRE ATT&CK techniques/tactics (e.g., "T1021", "Lateral Movement", "Credential Access")
- Priority: A score from 1-10 based on threat level, asset criticality, and urgency

Consider when grouping entities:
- Entities involved in the same attack pattern or campaign
- Entities with similar risk indicators
- Entities that show signs of lateral movement or coordinated activity

Consider for tags:
- MITRE ATT&CK tactics: Reconnaissance, Resource Development, Initial Access, Execution, Persistence, Privilege Escalation, Defense Evasion, Credential Access, Discovery, Lateral Movement, Collection, Command and Control, Exfiltration, Impact
- MITRE ATT&CK techniques: Use technique IDs like T1021, T1078, etc.
- Key themes: Lateral Movement, Credential Theft, Data Exfiltration, Ransomware, APT Activity, etc.

${formatInstructions}`;

      const chatPrompt = ChatPromptTemplate.fromTemplate(
        `Answer the user's question as best you can:\n{format_instructions}\n{query}`
      );

      const chain = chatPrompt.pipe(llm);
      const llmType = llm._llmType();

      logger?.debug(() => `Finalize priorities node is invoking the chain (${llmType})`);

      const rawResponse = (await chain.invoke({
        format_instructions: formatInstructions,
        query: prompt,
      })) as unknown as string;

      // Extract JSON from response
      const jsonResponse = extractJson(rawResponse);

      // Parse and validate the response
      const parsed = await outputParser.parse(jsonResponse);

      const priorities = parsed.priorities || [];

      logger?.debug(() => `Finalized ${priorities.length} priorities`);

      return {
        ...state,
        priorities,
        unrefinedResults: priorities,
      };
    } catch (error) {
      logger?.error(() => `Error finalizing priorities: ${error}`);
      return {
        ...state,
        priorities: null,
        errors: [...(state.errors || []), `Error finalizing priorities: ${error}`],
      };
    }
  };

  return finalizePriorities;
};
