/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { promptSavedObjectType, type Prompt } from '@kbn/ai-prompts';
import { NIGHTSHIFT_PROMPTS_PACKAGE_NAME } from '../../server/prompts_package';

export interface PromptSavedObject {
  id: string;
  type: typeof promptSavedObjectType;
  attributes: Prompt;
}

const toKebabCase = (value: string): string =>
  value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .toLowerCase();

/**
 * Converts prompts to the saved objects a package installs. The package spec requires every file
 * name, and so every id, to start with the package name; the id must stay stable across versions
 * so an upgrade replaces the prompt instead of adding a second one.
 */
export const toPromptSavedObjects = (prompts: readonly Prompt[]): PromptSavedObject[] =>
  prompts.map((prompt) => ({
    id: [
      NIGHTSHIFT_PROMPTS_PACKAGE_NAME,
      toKebabCase(prompt.promptId),
      ...(prompt.provider ? [toKebabCase(prompt.provider)] : []),
      ...(prompt.provider && prompt.model ? [toKebabCase(prompt.model)] : []),
    ].join('-'),
    type: promptSavedObjectType,
    attributes: prompt,
  }));
