/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SourceInput } from '@kbn/nightshift-shared';

export type RecommendedSource = Pick<SourceInput, 'title' | 'description' | 'tags' | 'esql'> & {
  id: string;
};

export const RECOMMENDED_SOURCES: readonly RecommendedSource[] = [
  {
    id: 'logs',
    title: 'All logs',
    description: 'Application and infrastructure logs across your environment.',
    tags: ['logs'],
    esql: 'FROM logs*',
  },
];

export interface RecommendedSourcesResponse {
  recommendations: RecommendedSource[];
}
