/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TinesStoryExport } from './types';

export interface TranslateTinesStoryResult {
  yaml: string;
}

/** Placeholder until Tines story translation is implemented. */
export const translateTinesStory = (_story: TinesStoryExport): TranslateTinesStoryResult => {
  return { yaml: '' };
};
