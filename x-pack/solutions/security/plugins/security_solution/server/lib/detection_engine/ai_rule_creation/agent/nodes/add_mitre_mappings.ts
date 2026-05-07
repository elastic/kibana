/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { JsonOutputParser } from '@langchain/core/output_parsers';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import type { ToolEventEmitter } from '@kbn/agent-builder-server';
import type {
  MitreEntity,
  MitreSubtechnique,
  MitreTactic,
  MitreTechnique,
} from '@kbn/security-mitre-attack-common';
import type { MitreAttackDataClient } from '../../../../mitre_attack';
import type { RuleCreationState } from '../state';
import { MITRE_MAPPING_SELECTION_PROMPT } from './prompts';
import {
  tactics as legacyTactics,
  techniques as legacyTechniques,
  subtechniques as legacySubtechniques,
} from '../../../../../../common/detection_engine/mitre/mitre_tactics_techniques';
import type {
  MitreTactic as LegacyMitreTactic,
  MitreTechnique as LegacyMitreTechnique,
  MitreSubTechnique as LegacyMitreSubTechnique,
} from '../../../../../../common/detection_engine/mitre/types';
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
  /**
   * When present, MITRE IDs returned by the LLM are validated against the
   * managed index. When absent, the node falls back to in-memory lookups
   * against the legacy hardcoded TS blob.
   */
  mitreAttackDataClient?: MitreAttackDataClient;
}

const FRAMEWORK = 'enterprise';

interface MitreLookups {
  getTactic: (id: string) => Promise<{ id: string; name: string; reference: string } | undefined>;
  getTechnique: (
    id: string
  ) => Promise<{ id: string; name: string; reference: string; tactics: string[] } | undefined>;
  getSubtechnique: (
    id: string
  ) => Promise<{ id: string; name: string; reference: string; techniqueId: string } | undefined>;
  /** Convert a tactic id (e.g. `TA0006`) into its kill-chain shortname (e.g. `credential-access`). */
  tacticIdToShortname: (tacticId: string) => Promise<string | undefined>;
}

const buildManagedLookups = (client: MitreAttackDataClient): MitreLookups => {
  return {
    async getTactic(id) {
      const entity = await client.getById(FRAMEWORK, id);
      if (!isTactic(entity)) return undefined;
      return { id: entity.id, name: entity.name, reference: entity.reference };
    },
    async getTechnique(id) {
      const entity = await client.getById(FRAMEWORK, id);
      if (!isTechnique(entity)) return undefined;
      return {
        id: entity.id,
        name: entity.name,
        reference: entity.reference,
        tactics: entity.tactics,
      };
    },
    async getSubtechnique(id) {
      const entity = await client.getById(FRAMEWORK, id);
      if (!isSubtechnique(entity)) return undefined;
      return {
        id: entity.id,
        name: entity.name,
        reference: entity.reference,
        techniqueId: entity.techniqueId,
      };
    },
    async tacticIdToShortname(tacticId) {
      const entity = await client.getById(FRAMEWORK, tacticId);
      if (!isTactic(entity)) return undefined;
      return entity.name.toLowerCase().replaceAll(' ', '-');
    },
  };
};

const buildLegacyLookups = (): MitreLookups => {
  const tacticsById = new Map<string, LegacyMitreTactic>();
  legacyTactics.forEach((tactic) => tacticsById.set(tactic.id, tactic));
  const techniquesById = new Map<string, LegacyMitreTechnique>();
  legacyTechniques.forEach((tech) => techniquesById.set(tech.id, tech));
  const subtechniquesById = new Map<string, LegacyMitreSubTechnique>();
  legacySubtechniques.forEach((sub) => subtechniquesById.set(sub.id, sub));

  return {
    async getTactic(id) {
      const entity = tacticsById.get(id);
      if (!entity) return undefined;
      return { id: entity.id, name: entity.name, reference: entity.reference };
    },
    async getTechnique(id) {
      const entity = techniquesById.get(id);
      if (!entity) return undefined;
      return {
        id: entity.id,
        name: entity.name,
        reference: entity.reference,
        tactics: entity.tactics,
      };
    },
    async getSubtechnique(id) {
      const entity = subtechniquesById.get(id);
      if (!entity) return undefined;
      return {
        id: entity.id,
        name: entity.name,
        reference: entity.reference,
        techniqueId: entity.techniqueId,
      };
    },
    async tacticIdToShortname(tacticId) {
      const entity = tacticsById.get(tacticId);
      if (!entity) return undefined;
      // Legacy data normalizes tactic shortnames into camelCase `value`. Convert
      // back to the kebab-case form used in `technique.tactics`.
      return entity.value
        .replace(/([A-Z])/g, '-$1')
        .toLowerCase()
        .replace(/^-/, '');
    },
  };
};

const isTactic = (e: MitreEntity | undefined): e is MitreTactic => e?.type === 'tactic';
const isTechnique = (e: MitreEntity | undefined): e is MitreTechnique => e?.type === 'technique';
const isSubtechnique = (e: MitreEntity | undefined): e is MitreSubtechnique =>
  e?.type === 'subtechnique';

/**
 * Validate the LLM response and shape it into the rule `threat` field, using
 * the managed MITRE source when available.
 */
const formatMitreMapping = async (
  response: MitreMappingSelectionResponse,
  lookups: MitreLookups
): Promise<Threat[]> => {
  const threatMappings: Threat[] = [];

  for (const tacticId of response.tactics ?? []) {
    const tactic = await lookups.getTactic(tacticId);
    if (!tactic) {
      // Skip unknown tactics returned by the LLM
    } else {
      const shortname = await lookups.tacticIdToShortname(tacticId);
      const formattedTechniques: ThreatTechnique[] = [];

      for (const requested of response.techniques ?? []) {
        const technique = await lookups.getTechnique(requested.id);
        const matchesTactic =
          technique != null && (!shortname || technique.tactics.includes(shortname));
        if (!matchesTactic) {
          // Skip techniques the LLM hallucinated or that don't belong to this tactic
        } else {
          const formattedSubtechniques: Array<{ id: string; name: string; reference: string }> = [];
          for (const subId of requested.subtechnique ?? []) {
            const sub = await lookups.getSubtechnique(subId);
            if (sub != null && sub.techniqueId === technique.id) {
              formattedSubtechniques.push({
                id: sub.id,
                name: sub.name,
                reference: sub.reference,
              });
            }
          }

          const formatted: ThreatTechnique = {
            id: technique.id,
            name: technique.name,
            reference: technique.reference,
          };
          if (formattedSubtechniques.length > 0) {
            formatted.subtechnique = formattedSubtechniques;
          }
          formattedTechniques.push(formatted);
        }
      }

      threatMappings.push({
        framework: 'MITRE ATT&CK',
        tactic: { id: tactic.id, name: tactic.name, reference: tactic.reference },
        technique: formattedTechniques.length > 0 ? formattedTechniques : undefined,
      });
    }
  }

  return threatMappings;
};

export const addMitreMappingsNode = ({
  model,
  events,
  mitreAttackDataClient,
}: AddMitreMappingsNodeParams) => {
  const jsonParser = new JsonOutputParser<MitreMappingSelectionResponse>();
  const lookups = mitreAttackDataClient
    ? buildManagedLookups(mitreAttackDataClient)
    : buildLegacyLookups();

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

      const threatMappings = await formatMitreMapping(mitreSelectionResult, lookups);

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
