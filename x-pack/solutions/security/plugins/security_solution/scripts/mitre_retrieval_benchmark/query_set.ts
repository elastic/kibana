/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import type { MitreEntity } from '@kbn/security-mitre-attack-common';
import { behavioralQueries } from './behavioral_queries';
import { entitiesAddedInV19, renamedEntities, retiredEntities } from './version_drift';
import {
  abstractPrompts,
  tacticPrompts,
  techniqueDescriptionPrompts,
  type PromptQuery,
} from './prompt_queries';
import { independentPrompts } from './independent_prompts';

interface ReferenceRuleLike {
  description: string;
  threat: Array<{ technique?: string; subtechnique?: string }>;
}

/**
 * The labelled rule pairs live in `@kbn/evals-suite-security-ai-rules`, which
 * has no public entry point and is private to its own group. Rather than
 * duplicating the dataset, this dev-only script loads the modules by path so
 * the pairs keep a single source of truth.
 */
const DATASETS_DIR = path.resolve(
  __dirname,
  '../../../../packages/kbn-evals-suite-security-ai-rules/datasets'
);

const loadRulePairs = async (): Promise<ReferenceRuleLike[]> => {
  const modules: Array<[string, string]> = [
    ['sample_rules', 'sampleRules'],
    ['standard_pairs', 'standardPairs'],
    ['complex_pairs', 'complexPairs'],
  ];

  const loaded = await Promise.all(
    modules.map(async ([moduleName, exportName]) => {
      const imported = await import(path.join(DATASETS_DIR, moduleName));
      return (imported[exportName] ?? []) as ReferenceRuleLike[];
    })
  );

  return loaded.flat();
};

export type Stratum =
  | 'exact_id'
  | 'exact_name'
  | 'near_name'
  | 'description_lead'
  | 'behavioral'
  | 'rule_prompt'
  | 'stale_id'
  | 'stale_name'
  | 'v19_new'
  | 'prompt_tactic'
  | 'prompt_abstract'
  | 'prompt_technique'
  | 'indep_tactic'
  | 'indep_abstract'
  | 'indep_technique';

export interface LabeledQuery {
  stratum: Stratum;
  query: string;
  relevant: Set<string>;
}

const LCG_MODULUS = 2147483647;
const LCG_MULTIPLIER = 16807;

/** Deterministic Park-Miller PRNG so a rerun samples the same entities. */
const createRandom = (seed: number) => {
  let state = seed % LCG_MODULUS;
  if (state <= 0) {
    state += LCG_MODULUS - 1;
  }

  return () => {
    state = (state * LCG_MULTIPLIER) % LCG_MODULUS;
    return (state - 1) / (LCG_MODULUS - 1);
  };
};

const sample = <T>(items: T[], count: number, random: () => number): T[] => {
  const pool = [...items];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length));
};

/**
 * Drops a word and transposes two characters. Approximates the way an analyst
 * half-remembers a technique name, which is the case fuzzy keyword matching is
 * supposed to cover.
 */
const perturbName = (name: string, random: () => number): string => {
  const words = name.split(' ').filter((word) => word.toLowerCase() !== 'or');
  const kept = words.length > 2 ? words.filter((_, index) => index !== words.length - 1) : words;
  const joined = kept.join(' ');

  const position = Math.floor(random() * Math.max(1, joined.length - 2));
  if (position < 1 || position >= joined.length - 1) return joined.toLowerCase();

  return (
    joined.slice(0, position) +
    joined[position + 1] +
    joined[position] +
    joined.slice(position + 2)
  ).toLowerCase();
};

const firstSentence = (description: string): string => {
  const cleaned = description.replace(/\s+/g, ' ').trim();
  const match = cleaned.match(/^(.{40,400}?[.!?])\s/);
  return (match?.[1] ?? cleaned.slice(0, 300)).trim();
};

/** Ids MITRE actually ships, used to reject stale hand-written labels. */
const buildKnownIds = (entities: MitreEntity[]): Set<string> =>
  new Set(entities.map(({ id }) => id));

const TECHNIQUE_ID_PATTERN = /^T\d{4}(\.\d{3})?$/;

/**
 * Rule threat mappings name subtechniques inconsistently (sometimes an id,
 * sometimes a display name), so only well-formed ids become labels.
 */
const extractRuleTechniques = (threat: Array<{ technique?: string; subtechnique?: string }>) => {
  const ids = new Set<string>();
  for (const entry of threat) {
    for (const value of [entry.technique, entry.subtechnique]) {
      if (value && TECHNIQUE_ID_PATTERN.test(value)) ids.add(value);
    }
  }
  return ids;
};

export interface BuildQuerySetParams {
  entities: MitreEntity[];
  /** Entities sampled per auto-generated stratum. */
  samplesPerStratum: number;
  seed: number;
}

export interface QuerySetResult {
  queries: LabeledQuery[];
  /** Hand-written labels that no longer exist in the artifact. */
  unknownLabels: string[];
}

export const buildQuerySet = async ({
  entities,
  samplesPerStratum,
  seed,
}: BuildQuerySetParams): Promise<QuerySetResult> => {
  const random = createRandom(seed);
  const knownIds = buildKnownIds(entities);
  const unknownLabels: string[] = [];

  // Tactics have far shorter, more generic names, so the auto-generated strata
  // draw from techniques and subtechniques only.
  const techniques = entities.filter((entity) => entity.type !== 'tactic');

  const queries: LabeledQuery[] = [];

  for (const entity of sample(techniques, samplesPerStratum, random)) {
    queries.push({ stratum: 'exact_id', query: entity.id, relevant: new Set([entity.id]) });
  }

  for (const entity of sample(techniques, samplesPerStratum, random)) {
    queries.push({ stratum: 'exact_name', query: entity.name, relevant: new Set([entity.id]) });
  }

  for (const entity of sample(techniques, samplesPerStratum, random)) {
    queries.push({
      stratum: 'near_name',
      query: perturbName(entity.name, random),
      relevant: new Set([entity.id]),
    });
  }

  const describable = techniques.filter((entity) => entity.description.length >= 80);
  for (const entity of sample(describable, samplesPerStratum, random)) {
    queries.push({
      stratum: 'description_lead',
      query: firstSentence(entity.description),
      relevant: new Set([entity.id]),
    });
  }

  // A pre-v19 model reaches for the identifier and the name it was trained on.
  // Both queries are scored against the entity that superseded them, so a hit
  // means retrieval repaired the stale recollection.
  for (const { staleId, staleName, successorId } of retiredEntities) {
    if (knownIds.has(successorId)) {
      queries.push({ stratum: 'stale_id', query: staleId, relevant: new Set([successorId]) });
      queries.push({ stratum: 'stale_name', query: staleName, relevant: new Set([successorId]) });
    }
  }

  for (const { id, staleName } of renamedEntities) {
    if (knownIds.has(id)) {
      queries.push({ stratum: 'stale_name', query: staleName, relevant: new Set([id]) });
    }
  }

  // Content that did not exist before v19.1, so no model prior can supply it.
  const addedById = new Map(entities.map((entity) => [entity.id, entity]));
  for (const id of entitiesAddedInV19) {
    const entity = addedById.get(id);
    if (entity && entity.description.length >= 80) {
      queries.push({
        stratum: 'v19_new',
        query: firstSentence(entity.description),
        relevant: new Set([id]),
      });
    }
  }

  const promptStrata: Array<[Stratum, PromptQuery[]]> = [
    ['prompt_tactic', tacticPrompts],
    ['prompt_abstract', abstractPrompts],
    ['prompt_technique', techniqueDescriptionPrompts],
  ];
  for (const [stratum, prompts] of promptStrata) {
    for (const { prompt, relevant } of prompts) {
      unknownLabels.push(...relevant.filter((id) => !knownIds.has(id)));
      const usable = relevant.filter((id) => knownIds.has(id));
      if (usable.length > 0) {
        queries.push({ stratum, query: prompt, relevant: new Set(usable) });
      }
    }
  }

  for (const { group, prompt, relevant } of independentPrompts) {
    unknownLabels.push(...relevant.filter((id) => !knownIds.has(id)));
    const usable = relevant.filter((id) => knownIds.has(id));
    if (usable.length > 0) {
      queries.push({
        stratum: `indep_${group}` as Stratum,
        query: prompt,
        relevant: new Set(usable),
      });
    }
  }

  for (const { query, relevant } of behavioralQueries) {
    const missing = relevant.filter((id) => !knownIds.has(id));
    unknownLabels.push(...missing);
    const usable = relevant.filter((id) => knownIds.has(id));
    if (usable.length > 0) {
      queries.push({ stratum: 'behavioral', query, relevant: new Set(usable) });
    }
  }

  for (const rule of await loadRulePairs()) {
    const labels = extractRuleTechniques(rule.threat);
    const usable = [...labels].filter((id) => {
      if (knownIds.has(id)) return true;
      unknownLabels.push(id);
      return false;
    });
    if (usable.length > 0) {
      queries.push({ stratum: 'rule_prompt', query: rule.description, relevant: new Set(usable) });
    }
  }

  return { queries, unknownLabels: [...new Set(unknownLabels)] };
};
