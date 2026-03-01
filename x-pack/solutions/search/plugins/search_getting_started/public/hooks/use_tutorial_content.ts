/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sampleTutorial } from '../components/tutorials/new_tutorial_content/sample_tutorial';

type StepID = string;
type ResponsePath = string;
export type SnippetVariableKey = string;
type MarkdownSnippet = string;
type ApiSnippet = string;

// Example step:
/**
id: "agent_builder_step_1"
header: "Query the index and see the score"
description: "Now we query the index"
apiSnippet: "GET /_search?q={{step_1_index_name}}"
valuesToInsert: ["step_1_index_name"]
valuesToSave: {
  "step_2_query_score": "hits.hits[0]._score"
}
explanation: "The score for that query is {{step_2_query_score}}."
*/

// TODO: an agent can reason about responses and keep track of relevant
//  information for subsequent steps. Consider loading context into agent builder
// and having it generate the next steps and run the snippets.
export interface TutorialStep {
  id: StepID;
  header: MarkdownSnippet;
  description: MarkdownSnippet;
  explanation: MarkdownSnippet;
  apiSnippet: ApiSnippet;
  valuesToInsert: Array<SnippetVariableKey>;
  valuesToSave: Record<SnippetVariableKey, ResponsePath>;
}

export interface TutorialSummaryLink {
  label: string;
  href: string;
}

export interface TutorialDefinition {
  slug: string;
  title: string;
  description: string;
  summary: {
    text: string;
    links: TutorialSummaryLink[];
  };
  steps: TutorialStep[];
}

export type TutorialSlug = (typeof AVAILABLE_TUTORIALS)[number]['slug'];

export const AVAILABLE_TUTORIALS: TutorialDefinition[] = [sampleTutorial];

const TUTORIAL_BY_SLUG = new Map(AVAILABLE_TUTORIALS.map((t) => [t.slug, t]));

export const useTutorialContent = (slug: TutorialSlug): TutorialDefinition => {
  const tutorial = TUTORIAL_BY_SLUG.get(slug);
  if (!tutorial) {
    throw new Error(`Unknown tutorial slug: ${slug}`);
  }
  return tutorial;
};
