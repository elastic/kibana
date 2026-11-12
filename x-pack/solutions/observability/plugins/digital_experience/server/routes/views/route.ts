/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';
import { DIGITAL_EXPERIENCE_API_PRIVILEGES } from '../../../common/feature';
import { OVERVIEW_PERCENTILE_PARAMS } from '../../../common/overview_filters';
import {
  SAVED_VIEW_DESCRIPTION_MAX_LENGTH,
  SAVED_VIEW_NAME_MAX_LENGTH,
  SAVED_VIEW_RANGE_MAX_LENGTH,
  type DeletedSavedViewResponse,
  type SavedView,
  type SavedViewAttributes,
  type SavedViewsResponse,
} from '../../../common/saved_views';
import { kueryToQuery } from '../../lib/helpers/kuery';
import {
  createSavedView,
  deleteSavedView,
  listSavedViews,
  updateSavedView,
} from '../../lib/saved_views/saved_views';
import { createDigitalExperienceServerRoute } from '../create_digital_experience_server_route';
import { overviewFiltersShape } from '../params';

export const SAVED_VIEWS_LIST_ENDPOINT = 'GET /internal/digital_experience/views';
export const SAVED_VIEWS_CREATE_ENDPOINT = 'POST /internal/digital_experience/views';
export const SAVED_VIEW_UPDATE_ENDPOINT = 'PUT /internal/digital_experience/views/{id}';
export const SAVED_VIEW_DELETE_ENDPOINT = 'DELETE /internal/digital_experience/views/{id}';

const OPTIONS = { access: 'internal' } as const;

/** Reading views needs the app's read privilege; saving and deleting them, its manage one. */
const READ_SECURITY = {
  authz: { requiredPrivileges: [DIGITAL_EXPERIENCE_API_PRIVILEGES.read] },
};
const WRITE_SECURITY = {
  authz: { requiredPrivileges: [DIGITAL_EXPERIENCE_API_PRIVILEGES.manage] },
};

const idParams = () => z.object({ id: z.string().min(1).max(SAVED_VIEW_NAME_MAX_LENGTH) });

/**
 * A view as it is saved: a name, and what the Overview's routes take of the filters and the query,
 * bounded the same, and the percentile and time range. The time range comes whole or not at all.
 */
const viewBody = () =>
  z
    .object({
      name: z.string().trim().min(1).max(SAVED_VIEW_NAME_MAX_LENGTH),
      description: z.string().max(SAVED_VIEW_DESCRIPTION_MAX_LENGTH).optional(),
      ...overviewFiltersShape(),
      percentile: z.enum(OVERVIEW_PERCENTILE_PARAMS).optional(),
      rangeFrom: z.string().min(1).max(SAVED_VIEW_RANGE_MAX_LENGTH).optional(),
      rangeTo: z.string().min(1).max(SAVED_VIEW_RANGE_MAX_LENGTH).optional(),
    })
    .refine(({ rangeFrom, rangeTo }) => (rangeFrom === undefined) === (rangeTo === undefined), {
      message: '`rangeFrom` and `rangeTo` come together',
      path: ['rangeTo'],
    });

/** The attributes to save: a query that does not parse is a 400 now, not when the view is used. */
const toAttributes = (body: SavedViewAttributes): SavedViewAttributes => {
  kueryToQuery(body.kuery);
  return body;
};

const listRoute = createDigitalExperienceServerRoute({
  endpoint: SAVED_VIEWS_LIST_ENDPOINT,
  options: OPTIONS,
  security: READ_SECURITY,
  handler: async ({ context }): Promise<SavedViewsResponse> => {
    const { savedObjects } = await context.core;
    return { views: await listSavedViews(savedObjects.client) };
  },
});

const createRoute = createDigitalExperienceServerRoute({
  endpoint: SAVED_VIEWS_CREATE_ENDPOINT,
  options: OPTIONS,
  security: WRITE_SECURITY,
  params: lazySchema(() => z.object({ body: viewBody() })),
  handler: async ({ params, context }): Promise<SavedView> => {
    const { savedObjects } = await context.core;
    return createSavedView(savedObjects.client, toAttributes(params.body));
  },
});

const updateRoute = createDigitalExperienceServerRoute({
  endpoint: SAVED_VIEW_UPDATE_ENDPOINT,
  options: OPTIONS,
  security: WRITE_SECURITY,
  params: lazySchema(() => z.object({ path: idParams(), body: viewBody() })),
  handler: async ({ params, context }): Promise<SavedView> => {
    const { savedObjects } = await context.core;
    return updateSavedView(savedObjects.client, params.path.id, toAttributes(params.body));
  },
});

const deleteRoute = createDigitalExperienceServerRoute({
  endpoint: SAVED_VIEW_DELETE_ENDPOINT,
  options: OPTIONS,
  security: WRITE_SECURITY,
  params: lazySchema(() => z.object({ path: idParams() })),
  handler: async ({ params, context }): Promise<DeletedSavedViewResponse> => {
    const { savedObjects } = await context.core;
    await deleteSavedView(savedObjects.client, params.path.id);
    return { id: params.path.id };
  },
});

/** The routes of the saved views, keyed by endpoint; `plugin.ts` registers them. */
export const savedViewsRouteRepository = {
  ...listRoute,
  ...createRoute,
  ...updateRoute,
  ...deleteRoute,
};
