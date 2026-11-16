/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegisteredEvaluatorDefinition } from '@kbn/evals-plugin/server';
import { collectCortexPageReads } from './cortex_pages';

export const cortexPagesReadJudge: RegisteredEvaluatorDefinition = {
  name: 'nightshift_cortex_pages_read',
  version: '1.0.0',
  kind: 'code',
  direction: 'maximize',
  description:
    'Reference-free: how many distinct Cortex pages the investigator opened. Failed reads and the index do not count.',
  async evaluate({ round }) {
    const pages = collectCortexPageReads(round);
    return {
      scores: [
        {
          name: 'cortex_pages_read',
          score: pages.length,
          label: `${pages.length} pages`,
          explanation: pages.map(({ id }) => id).join(', ') || 'none',
          metadata: { page_ids: pages.map(({ id }) => id) },
        },
      ],
    };
  },
};
