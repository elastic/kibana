/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Prompt } from '@kbn/ai-prompts';
import instructions from './instructions/investigator.md.text';
import knowledgeWikiSection from './instructions/knowledge_wiki.text';
import semanticMemorySection from './instructions/semantic_memory.text';
import decisionTreesSection from './instructions/decision_trees.text';

/** The `promptGroupId` of every prompt the `nightshift_prompts` package ships. */
export const NIGHTSHIFT_PROMPT_GROUP_ID = 'nightshiftInvestigations';

export const INVESTIGATOR_PROMPT_IDS = {
  instructions: 'investigatorInstructions',
  knowledgeWikiSection: 'investigatorKnowledgeWikiSection',
  semanticMemorySection: 'investigatorSemanticMemorySection',
  decisionTreesSection: 'investigatorDecisionTreesSection',
} as const;

export type InvestigatorPromptKey = keyof typeof INVESTIGATOR_PROMPT_IDS;

/**
 * The texts the investigator's instructions are assembled from. `instructions` holds the
 * `{{knowledge_wiki_section}}`, `{{semantic_memory_section}}` and `{{decision_trees_section}}`
 * placeholders the sections fill.
 */
export type InvestigatorPrompts = Readonly<Record<InvestigatorPromptKey, string>>;

export const BUNDLED_INVESTIGATOR_PROMPTS: InvestigatorPrompts = {
  instructions,
  knowledgeWikiSection,
  semanticMemorySection,
  decisionTreesSection,
};

/** The prompts bundled with Kibana, used when the `nightshift_prompts` package is not installed. */
export const localPrompts: Prompt[] = (
  Object.keys(INVESTIGATOR_PROMPT_IDS) as InvestigatorPromptKey[]
).map((key) => ({
  promptGroupId: NIGHTSHIFT_PROMPT_GROUP_ID,
  promptId: INVESTIGATOR_PROMPT_IDS[key],
  prompt: { default: BUNDLED_INVESTIGATOR_PROMPTS[key] },
}));
