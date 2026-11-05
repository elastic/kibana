/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegisteredEvaluatorDefinition } from '@kbn/evals-plugin/server';
import { z, lazySchema } from '@kbn/zod/v4';
import { collectCortexPageReads, isPageReferenced } from './cortex_pages';

const evidenceSchema = lazySchema(() => z.object({ response: z.object({ message: z.string() }) }));

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

export const cortexPagesReferencedJudge: RegisteredEvaluatorDefinition = {
  name: 'nightshift_cortex_pages_referenced',
  version: '1.0.0',
  kind: 'code',
  direction: 'maximize',
  description:
    'Reference-free: how many of the Cortex pages the investigator opened are named in its final answer.',
  evidenceSchema,
  async evaluate({ round }) {
    const pages = collectCortexPageReads(round);
    if (pages.length === 0) {
      return { scores: [], notApplicable: { reason: 'no Cortex pages were read' } };
    }
    const referenced = pages.filter((page) => isPageReferenced(page, round.response.message));
    return {
      scores: [
        {
          name: 'cortex_pages_referenced',
          score: referenced.length,
          label: `${referenced.length}/${pages.length} pages`,
          explanation: referenced.map(({ id }) => id).join(', ') || 'none',
          metadata: { page_ids: referenced.map(({ id }) => id), pages_read: pages.length },
        },
      ],
    };
  },
};
