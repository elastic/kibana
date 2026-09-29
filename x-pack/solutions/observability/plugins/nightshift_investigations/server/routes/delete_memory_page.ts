/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest, notFound } from '@hapi/boom';
import { z } from '@kbn/zod/v4';
import { NIGHTSHIFT_API_PRIVILEGES } from '@kbn/nightshift-shared';
import { MAX_KEYWORD_LENGTH } from '../../common';
import { createNightshiftInvestigationsServerRoute } from './create_server_route';

/**
 * Deleting is irreversible, so it is held to a higher bar than archiving: it
 * needs the Nightshift configure privilege, not just manage.
 */
export const memoryDeletePrivileges = [
  NIGHTSHIFT_API_PRIVILEGES.configure,
  NIGHTSHIFT_API_PRIVILEGES.manage,
  'agentBuilder:read',
];

/**
 * Hard-deletes a memory. This is the escape hatch for content that should not
 * remain in the store at all — for example something sensitive the extractor
 * picked up. Archive is the reversible action and is the default.
 *
 * The document leaves the index, but Elasticsearch does not guarantee erasure
 * from existing segments or snapshots; the UI must not describe this as a secure
 * erase.
 */
export const deleteMemoryPageRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'DELETE /internal/nightshift/memory/pages/{id}',
  options: {
    access: 'internal',
    summary: 'Delete a Semantic Memory page',
    description:
      'Permanently removes a Semantic Memory page. Irreversible. The caller must confirm ' +
      'by echoing the page title, so a mistyped or reflexive click cannot destroy content.',
  },
  security: {
    authz: { requiredPrivileges: memoryDeletePrivileges },
  },
  params: z.object({
    path: z.object({
      id: z.string().min(1).max(MAX_KEYWORD_LENGTH),
    }),
    body: z.object({
      /** Must equal the page's current title. */
      confirm_title: z.string().min(1).max(MAX_KEYWORD_LENGTH),
    }),
  }),
  handler: async ({ request, params, getMemoryPageStore, isMemoryEnabled }) => {
    if (!isMemoryEnabled()) throw notFound('Semantic Memory is not enabled');

    const store = getMemoryPageStore(request);
    const page = await store.get(params.path.id);
    if (!page) {
      throw notFound(`Semantic Memory page ${params.path.id} was not found`);
    }
    if (page.title !== params.body.confirm_title) {
      throw badRequest('confirm_title does not match the page title', {
        title: page.title,
      });
    }

    await store.delete(params.path.id);
    return { deleted: true, id: params.path.id };
  },
});
