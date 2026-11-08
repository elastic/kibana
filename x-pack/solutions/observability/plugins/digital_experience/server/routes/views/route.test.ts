/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NEVER } from 'rxjs';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { encode } from '@kbn/rison';
import { encodeOverviewFilters } from '../../../common/overview_filters_param';
import type { SavedView } from '../../../common/saved_views';
import {
  createSavedView,
  deleteSavedView,
  listSavedViews,
  updateSavedView,
} from '../../lib/saved_views/saved_views';
import {
  SAVED_VIEW_DELETE_ENDPOINT,
  SAVED_VIEW_UPDATE_ENDPOINT,
  SAVED_VIEWS_CREATE_ENDPOINT,
  SAVED_VIEWS_LIST_ENDPOINT,
  savedViewsRouteRepository,
} from './route';

jest.mock('../../lib/saved_views/saved_views');

const VIEW: SavedView = { id: 'a', name: 'checkout' };
const savedObjectsClient = { find: jest.fn() };

type Endpoint = keyof typeof savedViewsRouteRepository;

interface Schema {
  safeParse: (value: unknown) => { success: boolean; data?: Record<string, unknown> };
}

const route = (endpoint: Endpoint) => savedViewsRouteRepository[endpoint];

const runHandler = (endpoint: Endpoint, params?: unknown) => {
  const handler = route(endpoint).handler as unknown as (resources: unknown) => Promise<unknown>;
  return handler({
    params,
    context: { core: Promise.resolve({ savedObjects: { client: savedObjectsClient } }) },
    request: { events: { aborted$: NEVER } },
    plugins: {},
    isServerless: false,
    isUxEnabled: true,
    logger: loggingSystemMock.createLogger(),
  });
};

/** The schema of a part of a route's params: its `body` or `path`. */
const schemaOf = (endpoint: Endpoint, part: 'body' | 'path'): Schema =>
  (route(endpoint) as unknown as { params: { shape: Record<string, Schema> } }).params.shape[part];

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(listSavedViews).mockResolvedValue([VIEW]);
  jest.mocked(createSavedView).mockResolvedValue(VIEW);
  jest.mocked(updateSavedView).mockResolvedValue(VIEW);
  jest.mocked(deleteSavedView).mockResolvedValue(undefined);
});

describe('the saved views routes', () => {
  it('list the views of the space with the user’s own client', async () => {
    await expect(runHandler(SAVED_VIEWS_LIST_ENDPOINT)).resolves.toEqual({ views: [VIEW] });

    expect(listSavedViews).toHaveBeenCalledWith(savedObjectsClient);
  });

  it('save a view, and save it again under its id', async () => {
    const body = { name: 'checkout', kuery: 'a: b', percentile: '95' };

    await runHandler(SAVED_VIEWS_CREATE_ENDPOINT, { body });
    await runHandler(SAVED_VIEW_UPDATE_ENDPOINT, { path: { id: 'a' }, body });

    expect(createSavedView).toHaveBeenCalledWith(savedObjectsClient, body);
    expect(updateSavedView).toHaveBeenCalledWith(savedObjectsClient, 'a', body);
  });

  it('delete a view, and say which', async () => {
    await expect(runHandler(SAVED_VIEW_DELETE_ENDPOINT, { path: { id: 'a' } })).resolves.toEqual({
      id: 'a',
    });

    expect(deleteSavedView).toHaveBeenCalledWith(savedObjectsClient, 'a');
  });

  it('answer a query that does not parse with a 400, and save nothing', async () => {
    const body = { name: 'broken', kuery: 'user_agent.name: (Chrome' };

    await expect(runHandler(SAVED_VIEWS_CREATE_ENDPOINT, { body })).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 400 },
    });
    await expect(
      runHandler(SAVED_VIEW_UPDATE_ENDPOINT, { path: { id: 'a' }, body })
    ).rejects.toMatchObject({ output: { statusCode: 400 } });
    expect(createSavedView).not.toHaveBeenCalled();
    expect(updateSavedView).not.toHaveBeenCalled();
  });

  it('are internal, and need the read privilege to list and the manage one to change', () => {
    const endpoints: Endpoint[] = [
      SAVED_VIEWS_LIST_ENDPOINT,
      SAVED_VIEWS_CREATE_ENDPOINT,
      SAVED_VIEW_UPDATE_ENDPOINT,
      SAVED_VIEW_DELETE_ENDPOINT,
    ];
    const settingsOf = (endpoint: Endpoint) =>
      route(endpoint) as unknown as { options: unknown; security: unknown };

    endpoints.forEach((endpoint) =>
      expect(settingsOf(endpoint).options).toEqual({ access: 'internal' })
    );
    expect(settingsOf(SAVED_VIEWS_LIST_ENDPOINT).security).toEqual({
      authz: { requiredPrivileges: ['read_digital_experience'] },
    });
    endpoints.slice(1).forEach((endpoint) =>
      expect(settingsOf(endpoint).security).toEqual({
        authz: { requiredPrivileges: ['manage_digital_experience'] },
      })
    );
  });
});

describe('the body of a view', () => {
  const body = () => schemaOf(SAVED_VIEWS_CREATE_ENDPOINT, 'body');
  const isValid = (view: Record<string, unknown>) => body().safeParse(view).success;
  const filters = encodeOverviewFilters({ browser: [{ value: 'Chrome', exclude: false }] });

  it('takes a name and what the Overview’s routes take', () => {
    expect(isValid({ name: 'a' })).toBe(true);
    expect(
      isValid({
        name: 'checkout in Germany',
        description: 'The page loads of /checkout',
        filters,
        kuery: 'user_agent.name : "Chrome"',
        percentile: '95',
        rangeFrom: 'now-7d',
        rangeTo: 'now',
      })
    ).toBe(true);
  });

  it('trims the name, and needs one', () => {
    expect(body().safeParse({ name: '  a  ' }).data?.name).toBe('a');
    expect(isValid({})).toBe(false);
    expect(isValid({ name: '   ' })).toBe(false);
    expect(isValid({ name: 'x'.repeat(256) })).toBe(true);
    expect(isValid({ name: 'x'.repeat(257) })).toBe(false);
  });

  it('bounds the description, the query and the time range', () => {
    expect(isValid({ name: 'a', description: 'x'.repeat(1025) })).toBe(false);
    expect(isValid({ name: 'a', kuery: 'x'.repeat(2049) })).toBe(false);
    expect(isValid({ name: 'a', kuery: '' })).toBe(false);
    expect(isValid({ name: 'a', rangeFrom: 'x'.repeat(129), rangeTo: 'now' })).toBe(false);
  });

  it('takes the filters like the Overview’s routes, and rejects what they would repair', () => {
    expect(isValid({ name: 'a', filters: 'not rison ((' })).toBe(false);
    expect(
      isValid({
        name: 'a',
        filters: encode([
          { meta: { key: 'browser', type: 'phrases', params: ['Chrome', 'Chrome'] } },
        ]),
      })
    ).toBe(false);
  });

  it('takes the percentiles the Overview offers only', () => {
    ['50', '75', '90', '95', '99'].forEach((percentile) =>
      expect(isValid({ name: 'a', percentile })).toBe(true)
    );
    expect(isValid({ name: 'a', percentile: '42' })).toBe(false);
  });

  it('keeps a whole time range or none', () => {
    expect(isValid({ name: 'a', rangeFrom: 'now-7d' })).toBe(false);
    expect(isValid({ name: 'a', rangeTo: 'now' })).toBe(false);
    expect(isValid({ name: 'a', rangeFrom: 'now-7d', rangeTo: 'now' })).toBe(true);
  });
});

describe('the id of a view', () => {
  it('is a bounded, non-empty path param', () => {
    const path = schemaOf(SAVED_VIEW_DELETE_ENDPOINT, 'path');

    expect(path.safeParse({ id: 'a' }).success).toBe(true);
    expect(path.safeParse({ id: '' }).success).toBe(false);
    expect(path.safeParse({ id: 'x'.repeat(257) }).success).toBe(false);
  });
});
