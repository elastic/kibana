/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const CUSTOM_CONTEXT_API_PATH = '/internal/nightshift/custom_context';

export const MAX_CUSTOM_CONTEXT_SNIPPET_LENGTH = 32_768;
export const MAX_CUSTOM_CONTEXT_SNIPPETS = 200;
export const MAX_CUSTOM_CONTEXT_TOTAL_LENGTH = 262_144;
export const MAX_CUSTOM_CONTEXT_SNIPPET_ID_LENGTH = 64;
export const MAX_CUSTOM_CONTEXT_AUTHOR_NAME_LENGTH = 1024;
export const MAX_CUSTOM_CONTEXT_VERSION_LENGTH = 256;

export interface CustomContextSnippet {
  id: string;
  text: string;
  author_name: string;
  /** ISO timestamp of when the snippet was added. */
  created_at: string;
  /** Who last changed the text, set only once the snippet has been edited. */
  updated_by?: string;
  /** ISO timestamp of the last text change, set only once the snippet has been edited. */
  updated_at?: string;
}

export interface CustomContextSnippetInput {
  /** Id of an existing snippet to keep (its text may change); omit to add a new snippet. */
  id?: string;
  text: string;
}

export interface GetCustomContextResponse {
  snippets: CustomContextSnippet[];
  version?: string;
}

export interface PutCustomContextRequest {
  snippets: CustomContextSnippetInput[];
  version?: string;
}

export type PutCustomContextResponse = GetCustomContextResponse;

/**
 * Joins the snippets into the block appended to the investigation agent's system prompt, or
 * returns an empty string when there is nothing to add.
 */
export const formatCustomContextInstructions = (
  snippets: ReadonlyArray<Pick<CustomContextSnippet, 'text'>>
): string => {
  const joined = snippets
    .map(({ text }) => text.trim())
    .filter((text) => text.length > 0)
    .join('\n\n');
  if (joined.length === 0) {
    return '';
  }
  return `**USER CONTEXT**\n<user_provided_context>\n${joined}\n</user_provided_context>`;
};
