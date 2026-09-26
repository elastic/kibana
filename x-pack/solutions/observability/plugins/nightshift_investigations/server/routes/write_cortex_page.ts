/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { conflict, notFound } from '@hapi/boom';
import { z } from '@kbn/zod/v4';
import { MAX_KEYWORD_LENGTH } from '../../common';
import { CORTEX_ENTITY_TYPES, CORTEX_PAGE_STATUSES } from '../../common/cortex';
import { toCortexKiId } from '../cortex/page_store';
import { createNightshiftInvestigationsServerRoute } from './create_server_route';

const MAX_DESCRIPTION_LENGTH = 4_096;
const MAX_CONTENT_LENGTH = 100_000;

const cortexPageParams = z.object({
  body: z.object({
    entity_type: z.enum(CORTEX_ENTITY_TYPES),
    // Slugs are canonicalized to kebab-case, so one alphanumeric keeps the page id non-empty.
    slug: z
      .string()
      .max(MAX_KEYWORD_LENGTH)
      .regex(/[a-z0-9]/i),
    title: z.string().trim().min(1).max(MAX_KEYWORD_LENGTH),
    description: z.string().max(MAX_DESCRIPTION_LENGTH).optional(),
    content: z.string().max(MAX_CONTENT_LENGTH),
    status: z.enum(CORTEX_PAGE_STATUSES),
  }),
});

export const createCortexPageRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'POST /internal/nightshift/cortex/pages',
  options: {
    access: 'internal',
    summary: 'Create a Cortex page',
    description:
      'Creates a Cortex wiki page. Fails if a page with the same entity and slug exists.',
  },
  security: {
    authz: { requiredPrivileges: ['agentBuilder:write'] },
  },
  params: cortexPageParams,
  handler: async ({ request, params, getCortexPageStore, isCortexEnabled }) => {
    if (!isCortexEnabled()) throw notFound('Cortex is not enabled');

    const { entity_type: entityType, ...page } = params.body;
    const created = await getCortexPageStore(request).create({ entityType, ...page });
    if (!created) {
      throw conflict(`Cortex page ${toCortexKiId(entityType, page.slug)} already exists`);
    }
    return { page: created };
  },
});

export const updateCortexPageRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'PUT /internal/nightshift/cortex/pages',
  options: {
    access: 'internal',
    summary: 'Update a Cortex page',
    description:
      'Overwrites the editable fields of a Cortex wiki page, keeping its corroborations.',
  },
  security: {
    authz: { requiredPrivileges: ['agentBuilder:write'] },
  },
  params: cortexPageParams,
  handler: async ({ request, params, getCortexPageStore, isCortexEnabled }) => {
    if (!isCortexEnabled()) throw notFound('Cortex is not enabled');

    const { entity_type: entityType, ...page } = params.body;
    return { page: await getCortexPageStore(request).upsert({ entityType, ...page }) };
  },
});
