/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { notFound } from '@hapi/boom';
import { z, lazySchema } from '@kbn/zod/v4';
import { MAX_KEYWORD_LENGTH } from '../../common';
import { createNightshiftInvestigationsServerRoute } from './create_server_route';
import { wikiPageVersion, wikiWritePrivileges, withVersionConflict } from './write_wiki_page';

export const archiveWikiPageRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'DELETE /internal/nightshift/wiki/pages/{id}',
  options: {
    access: 'internal',
    summary: 'Archive a Wiki page',
    description:
      'Soft-deletes a Wiki page by archiving it, so it stops being loaded into investigations but stays restorable. Fails if the page changed since the given version.',
  },
  security: {
    authz: { requiredPrivileges: wikiWritePrivileges },
  },
  params: lazySchema(() =>
    z.object({
      path: z.object({
        id: z.string().min(1).max(MAX_KEYWORD_LENGTH),
      }),
      query: z.object({ version: wikiPageVersion }),
    })
  ),
  handler: async ({ request, params, getWikiPageStore, isWikiEnabled }) => {
    if (!isWikiEnabled()) throw notFound('Wiki is not enabled');

    const store = getWikiPageStore(request);
    // An active legacy duplicate would revive the page at the next fold, so fold first and archive
    // the canonical page that `get` resolves the requested id to.
    await store.pruneDuplicates();
    const existing = await store.get(params.path.id);
    const page =
      existing &&
      (await withVersionConflict(existing.id, () =>
        store.archive(existing.id, params.query.version)
      ));
    if (!page) {
      throw notFound(`Wiki page ${params.path.id} was not found`);
    }
    return { page };
  },
});
