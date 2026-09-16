/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonOutputParser } from '@langchain/core/output_parsers';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import type { ToolEventEmitter } from '@kbn/agent-builder-server';
import type { MitreAttackDataClient } from '@kbn/mitre-attack-plugin/server';
import type { MitreEntitySummaryBuckets } from '@kbn/security-mitre-attack-common';
import type { RuleCreationState } from '../state';
import { MITRE_MAPPING_SELECTION_PROMPT } from './prompts';
import type {
  Threat,
  ThreatTechnique,
} from '../../../../../../common/api/detection_engine/model/rule_schema/common_attributes.gen';

interface MitreMappingSelectionResponse {
  tactics: string[]; // Array of tactic IDs like ["TA0001", "TA0002"]
  techniques: Array<{
    id: string;
    subtechnique?: string[]; // Array of subtechnique IDs like ["T1078.001"]
  }>;
}

interface AddMitreMappingsNodeParams {
  model: InferenceChatModel;
  events?: ToolEventEmitter;
  /** Resolved managed MITRE data client. Absent when xpack.mitreAttack.managedSourceEnabled is off. */
  mitreDataClient?: MitreAttackDataClient;
}

/** Retrieves MITRE buckets from the managed client when available, else adapts the static blob. */
const getMitreBuckets = async (
  mitreDataClient: MitreAttackDataClient | undefined
): Promise<MitreEntitySummaryBuckets> => {
  if (mitreDataClient) {
    return mitreDataClient.list();
  }

  // Fallback: serves the bundled legacy blob when xpack.mitreAttack.managedSourceEnabled is off.
  // Remove once the managed source is the default and the blob is deleted.
  const { tactics, techniques, subtechniques } = await import(
    '../../../../../../common/detection_engine/mitre/mitre_tactics_techniques'
  );
  const { transformLegacyMitreData } = await import(
    '../../../../../../common/detection_engine/mitre/mitre_data_adapter'
  );
  return transformLegacyMitreData({ tactics, techniques, subtechniques });
};

/**
 * Validates and formats the MITRE mapping response according to the Threat schema.
 * Operates on the managed shape: techniques carry `tactic_ids` (ID-based membership),
 * and subtechniques carry `technique_id` for parent-technique validation.
 */
export const formatMitreMapping = (
  response: MitreMappingSelectionResponse,
  buckets: MitreEntitySummaryBuckets
): Array<Threat> => {
  const threatMappings: Array<Threat> = [];

  const tacticsMap = new Map(buckets.tactics.map((t) => [t.id, t]));
  const techniquesMap = new Map(buckets.techniques.map((t) => [t.id, t]));
  const subtechniquesMap = new Map(buckets.subtechniques.map((s) => [s.id, s]));

  for (const tacticId of response.tactics || []) {
    const tacticData = tacticsMap.get(tacticId);
    if (tacticData) {
      // Find techniques that belong to this tactic and validate them against managed data
      const relevantTechniques = (response.techniques || [])
        .map((tech) => {
          const techData = techniquesMap.get(tech.id);
          if (!techData) {
            return null;
          }
          // Check if technique belongs to this tactic via ID (managed shape uses tactic_ids)
          if (!techData.tactic_ids.includes(tacticData.id)) {
            return null;
          }
          return { techData, subtechniqueIds: tech.subtechnique || [] };
        })
        .filter((item) => item !== null);

      // Format techniques with subtechniques using managed-shape data
      const formattedTechniques = relevantTechniques.map(({ techData, subtechniqueIds }) => {
        const formatted: ThreatTechnique = {
          id: techData.id,
          name: techData.name,
          reference: techData.reference,
        };

        // Add subtechniques if present — validate and resolve from managed data
        if (subtechniqueIds.length > 0) {
          const formattedSubtechniques = subtechniqueIds
            .map((subId) => {
              const subData = subtechniquesMap.get(subId);
              if (!subData) {
                return null;
              }
              // Verify subtechnique belongs to the parent technique via technique_id
              if (subData.technique_id !== techData.id) {
                return null;
              }
              return {
                id: subData.id,
                name: subData.name,
                reference: subData.reference,
              };
            })
            .filter((sub) => sub !== null);

          if (formattedSubtechniques.length > 0) {
            formatted.subtechnique = formattedSubtechniques;
          }
        }

        return formatted;
      });

      threatMappings.push({
        framework: 'MITRE ATT&CK',
        tactic: {
          id: tacticData.id,
          name: tacticData.name,
          reference: tacticData.reference,
        },
        technique: formattedTechniques,
      });
    }
  }

  return threatMappings;
};

export const addMitreMappingsNode = ({
  model,
  events,
  mitreDataClient,
}: AddMitreMappingsNodeParams) => {
  const jsonParser = new JsonOutputParser<MitreMappingSelectionResponse>();

  return async (state: RuleCreationState): Promise<RuleCreationState> => {
    events?.reportProgress(
      'Analyzing rule to identify relevant MITRE ATT&CK tactics and techniques...'
    );

    try {
      const mitreSelectionChain = MITRE_MAPPING_SELECTION_PROMPT.pipe(model).pipe(jsonParser);

      const ruleTags = Array.isArray(state?.rule?.tags) ? state.rule.tags.join(', ') : '';

      const mitreSelectionResult = await mitreSelectionChain.invoke({
        user_request: state.userQuery,
        esql_query: state?.rule?.query || '',
        rule_tags: ruleTags,
      });
      const mitreBuckets = await getMitreBuckets(mitreDataClient);

      const threatMappings = formatMitreMapping(mitreSelectionResult, mitreBuckets);

      events?.reportProgress(
        `Identified ${threatMappings.length} MITRE ATT&CK mapping(s) with ${threatMappings.reduce(
          (sum, m) => sum + (m.technique?.length || 0),
          0
        )} technique(s)`
      );

      return {
        ...state,
        rule: {
          threat: threatMappings,
        },
      };
    } catch (error) {
      events?.reportProgress(`Failed to add MITRE mappings: ${error.message}`);
      // Don't fail the entire rule creation if MITRE mapping fails
      return {
        ...state,
        warnings: [`Failed to add MITRE mappings: ${error.message}`],
      };
    }
  };
};
