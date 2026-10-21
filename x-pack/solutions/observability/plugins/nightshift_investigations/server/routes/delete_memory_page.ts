/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { conflict, notFound } from '@hapi/boom';
import { z } from '@kbn/zod/v4';
import { NIGHTSHIFT_API_PRIVILEGES } from '@kbn/nightshift-shared';
import { MAX_KEYWORD_LENGTH } from '../../common';
import { MemoryVersionConflictError } from '../memory/page_store';
import { createNightshiftInvestigationsServerRoute } from './create_server_route';

/** Irreversible, so it needs configure as well as manage; every array entry is required. */
export const memoryDeletePrivileges = [
  NIGHTSHIFT_API_PRIVILEGES.configure,
  NIGHTSHIFT_API_PRIVILEGES.manage,
  'agentBuilder:read',
];

/** ES does not guarantee erasure from existing segments or snapshots — never call this a secure erase. */
export const deleteMemoryPageRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'DELETE /internal/nightshift/memory/pages/{id}',
  options: {
    access: 'internal',
    summary: 'Delete a Semantic Memory page',
    description:
      'Permanently removes a Semantic Memory page. Irreversible. The caller must name the ' +
      'revision it reviewed, so a concurrent write answers 409 instead of deleting content ' +
      'the operator never saw.',
  },
  security: {
    authz: { requiredPrivileges: memoryDeletePrivileges },
  },
  params: z.object({
    path: z.object({
      id: z.string().min(1).max(MAX_KEYWORD_LENGTH),
    }),
    body: z.object({
      version: z.object({
        seq_no: z.number().int().min(0),
        primary_term: z.number().int().min(1),
      }),
    }),
  }),
  handler: async ({ request, params, context, getMemoryPageStore, isMemoryEnabled }) => {
    if (!isMemoryEnabled()) throw notFound('Semantic Memory is not enabled');

    const store = getMemoryPageStore(request);
    const { version } = params.body;
    const user = (await context.core).security.authc.getCurrentUser()?.username;

    try {
      await store.delete(
        params.path.id,
        { seqNo: version.seq_no, primaryTerm: version.primary_term },
        user
      );
    } catch (err) {
      if (err instanceof MemoryVersionConflictError) {
        throw conflict('The memory changed while you were reviewing it. Reload and try again.');
      }
      throw err;
    }
    return { deleted: true, id: params.path.id };
  },
});
