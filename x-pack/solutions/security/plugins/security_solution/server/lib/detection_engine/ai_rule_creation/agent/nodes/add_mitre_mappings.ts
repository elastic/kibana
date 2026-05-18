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
   * When present, the node retrieves MITRE candidates from the managed index
   * and constrains the LLM to a closed-set selection from those candidates.
   * Validates and shapes the chosen IDs against the same index. When absent,
   * the node falls back to in-memory lookups against the legacy hardcoded
   * TS blob and lets the LLM use its prior MITRE knowledge.
   */
  mitreAttackDataClient?: MitreAttackDataClient;
}

const FRAMEWORK = 'enterprise';

/**
 * Maximum number of techniques + subtechniques to retrieve as candidates.
 * Tactics are always fully enumerated (~14 entries) since the corpus is small.
 */
const MAX_TECHNIQUE_CANDIDATES = 25;

/**
 * Truncate long descriptions to keep the prompt size bounded. Most MITRE
 * descriptions exceed 1k characters; for selection purposes the leading
 * sentences carry the salient meaning.
 */
const DESCRIPTION_TRUNCATE_CHARS = 250;

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

/**
 * Retrieve a candidate set of MITRE entities from the managed index that the
 * LLM may select from. Uses BM25 over the user's free-text request, the rule
 * tags, and the ES|QL query body to surface lexically-relevant techniques and
 * subtechniques. Tactics are fully enumerated since there are only ~14 of
 * them — listing all of them is cheaper and removes the recall risk that the
 * primary tactic gets BM25-ranked off the top of the list.
 */
const retrieveCandidates = async (
  client: MitreAttackDataClient,
  state: RuleCreationState
): Promise<MitreEntity[]> => {
  const ruleTags = Array.isArray(state?.rule?.tags) ? state.rule.tags.join(' ') : '';
  const ruleQuery = state?.rule?.query ?? '';
  const searchQuery = [state.userQuery, ruleTags, ruleQuery].filter(Boolean).join(' ').trim();

  const tactics =
    searchQuery.length > 0
      ? await client.list({ framework: FRAMEWORK, types: ['tactic'] })
      : [];

  const techniqueAndSub = searchQuery
    ? await client.search({
        query: searchQuery,
        framework: FRAMEWORK,
        types: ['technique', 'subtechnique'],
        limit: MAX_TECHNIQUE_CANDIDATES,
      })
    : [];

  return [...tactics, ...techniqueAndSub];
};

const truncateDescription = (description: string): string => {
  if (description.length <= DESCRIPTION_TRUNCATE_CHARS) return description;
  return `${description.slice(0, DESCRIPTION_TRUNCATE_CHARS).trimEnd()}…`;
};

/**
 * Render the candidate entities as a compact text block scoped to the
 * information the LLM needs to make a selection: id, name, parent/tactic
 * relationships, and a short description excerpt.
 */
const formatCandidateBlock = (candidates: MitreEntity[]): string => {
  if (candidates.length === 0) return '';

  const tactics = candidates.filter(isTactic);
  const techniques = candidates.filter(isTechnique);
  const subtechniques = candidates.filter(isSubtechnique);

  const sections: string[] = [];

  if (tactics.length > 0) {
    sections.push(
      'Tactics:',
      ...tactics.map(
        (t) => `- ${t.id} ${t.name} — ${truncateDescription(t.description ?? '')}`
      )
    );
  }
  if (techniques.length > 0) {
    sections.push(
      '',
      'Techniques:',
      ...techniques.map(
        (t) =>
          `- ${t.id} ${t.name} (tactics: ${t.tactics.join(', ')}) — ${truncateDescription(
            t.description ?? ''
          )}`
      )
    );
  }
  if (subtechniques.length > 0) {
    sections.push(
      '',
      'Subtechniques:',
      ...subtechniques.map(
        (s) =>
          `- ${s.id} ${s.name} (parent technique: ${s.techniqueId}) — ${truncateDescription(
            s.description ?? ''
          )}`
      )
    );
  }

  return sections.join('\n');
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
      const candidates = mitreAttackDataClient
        ? await retrieveCandidates(mitreAttackDataClient, state)
        : [];
      const candidateBlock = formatCandidateBlock(candidates);

      if (mitreAttackDataClient) {
        events?.reportProgress(
          `Retrieved ${candidates.length} MITRE ATT&CK candidate(s) from managed index`
        );
      }

      const mitreSelectionChain = MITRE_MAPPING_SELECTION_PROMPT.pipe(model).pipe(jsonParser);

      const ruleTags = Array.isArray(state?.rule?.tags) ? state.rule.tags.join(', ') : '';

      const mitreSelectionResult = await mitreSelectionChain.invoke({
        user_request: state.userQuery,
        esql_query: state?.rule?.query || '',
        rule_tags: ruleTags,
        candidate_mitre: candidateBlock,
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
