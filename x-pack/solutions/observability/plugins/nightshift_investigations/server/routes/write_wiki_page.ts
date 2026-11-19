/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { conflict, notFound } from '@hapi/boom';
import { z, lazySchema } from '@kbn/zod/v4';
import { NIGHTSHIFT_API_PRIVILEGES } from '@kbn/nightshift-shared';
import { MAX_KEYWORD_LENGTH } from '../../common';
import { WIKI_ENTITY_TYPES, WIKI_PAGE_STATUSES } from '../../common/wiki';
import { isVersionConflict, toWikiPageId } from '../wiki/page_store';
import { createNightshiftInvestigationsServerRoute } from './create_server_route';

const MAX_DESCRIPTION_LENGTH = 4_096;
const MAX_CONTENT_LENGTH = 100_000;

/** Wiki reads need `agentBuilder:read`, so writers must also be able to read back what they write. */
export const wikiWritePrivileges = [NIGHTSHIFT_API_PRIVILEGES.manage, 'agentBuilder:read'];

/** The `version` a page was read at; the write fails if the page changed since. */
export const wikiPageVersion = lazySchema(() =>
  z
    .string()
    .max(39)
    .regex(/^\d{1,19}:\d{1,19}$/)
);

/** Maps a lost versioned write to a 409 the UI can explain. */
export const withVersionConflict = async <T>(id: string, write: () => Promise<T>): Promise<T> => {
  try {
    return await write();
  } catch (error) {
    if (isVersionConflict(error)) {
      throw conflict(`Wiki page ${id} changed since it was loaded. Reload it and try again.`);
    }
    throw error;
  }
};

const wikiPageBody = lazySchema(() =>
  z.object({
    entity_type: z.enum(WIKI_ENTITY_TYPES),
    // Slugs are canonicalized to kebab-case, so one alphanumeric keeps the page id non-empty.
    slug: z
      .string()
      .max(MAX_KEYWORD_LENGTH)
      .regex(/[a-z0-9]/i),
    title: z.string().trim().min(1).max(MAX_KEYWORD_LENGTH),
    description: z.string().max(MAX_DESCRIPTION_LENGTH).optional(),
    content: z.string().max(MAX_CONTENT_LENGTH),
    status: z.enum(WIKI_PAGE_STATUSES),
  })
);

export const createWikiPageRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'POST /internal/nightshift/wiki/pages',
  options: {
    access: 'internal',
    summary: 'Create a Wiki page',
    description: 'Creates a Wiki page. Fails if a page with the same entity and slug exists.',
  },
  security: {
    authz: { requiredPrivileges: wikiWritePrivileges },
  },
  params: lazySchema(() => z.object({ body: wikiPageBody })),
  handler: async ({ request, params, getWikiPageStore, isWikiEnabled }) => {
    if (!isWikiEnabled()) throw notFound('Wiki is not enabled');

    const { entity_type: entityType, ...page } = params.body;
    const store = getWikiPageStore(request);
    // Folds legacy non-canonical ids into the canonical page so the create-only write sees them.
    await store.pruneDuplicates();
    const created = await store.create({ entityType, ...page });
    if (!created) {
      throw conflict(`Wiki page ${toWikiPageId(entityType, page.slug)} already exists`);
    }
    return { page: created };
  },
});

export const updateWikiPageRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'PUT /internal/nightshift/wiki/pages',
  options: {
    access: 'internal',
    summary: 'Update a Wiki page',
    description:
      'Overwrites the editable fields of an existing Wiki page, keeping its corroborations. Fails if the page changed since the given version.',
  },
  security: {
    authz: { requiredPrivileges: wikiWritePrivileges },
  },
  params: lazySchema(() => z.object({ body: wikiPageBody.extend({ version: wikiPageVersion }) })),
  handler: async ({ request, params, getWikiPageStore, isWikiEnabled }) => {
    if (!isWikiEnabled()) throw notFound('Wiki is not enabled');

    const { entity_type: entityType, ...page } = params.body;
    const store = getWikiPageStore(request);
    // A legacy page must be folded into its canonical id first, or the edit would fork it.
    await store.pruneDuplicates();
    const id = toWikiPageId(entityType, page.slug);
    if (!(await store.get(id))) {
      throw notFound(`Wiki page ${id} was not found`);
    }
    return { page: await withVersionConflict(id, () => store.upsert({ entityType, ...page })) };
  },
});
