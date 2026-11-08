/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { SavedObject } from '@kbn/core/server';
import {
  SAVED_VIEW_TYPE,
  SAVED_VIEWS_MAX,
  type SavedViewAttributes,
} from '../../../common/saved_views';
import { createSavedView, deleteSavedView, listSavedViews, updateSavedView } from './saved_views';

const UPDATED_AT = '2026-11-07T10:00:00.000Z';

const savedObject = (
  id: string,
  attributes: SavedViewAttributes
): SavedObject<SavedViewAttributes> => ({
  id,
  type: SAVED_VIEW_TYPE,
  attributes,
  references: [],
  updated_at: UPDATED_AT,
});

const client = savedObjectsClientMock.create();

const existing = (...views: Array<[string, string]>) =>
  client.find.mockResolvedValue({
    saved_objects: views.map(([id, name]) => ({ ...savedObject(id, { name }), score: 0 })),
    total: views.length,
    per_page: SAVED_VIEWS_MAX,
    page: 1,
  });

beforeEach(() => {
  jest.resetAllMocks();
  existing();
});

describe('listSavedViews', () => {
  it('reads the views of the space whole, by name, with what they keep', async () => {
    client.find.mockResolvedValue({
      saved_objects: [
        {
          ...savedObject('b', { name: 'checkout', filters: '!((meta:()))', percentile: '95' }),
          score: 0,
        },
        { ...savedObject('a', { name: 'Android' }), score: 0 },
      ],
      total: 2,
      per_page: SAVED_VIEWS_MAX,
      page: 1,
    });

    await expect(listSavedViews(client)).resolves.toEqual([
      { id: 'a', name: 'Android', updatedAt: UPDATED_AT },
      {
        id: 'b',
        name: 'checkout',
        filters: '!((meta:()))',
        percentile: '95',
        updatedAt: UPDATED_AT,
      },
    ]);
    expect(client.find).toHaveBeenCalledWith({ type: SAVED_VIEW_TYPE, perPage: SAVED_VIEWS_MAX });
  });
});

describe('createSavedView', () => {
  it('saves the view and returns it', async () => {
    client.create.mockResolvedValue(savedObject('new', { name: 'Safari', kuery: 'a: b' }));

    await expect(createSavedView(client, { name: 'Safari', kuery: 'a: b' })).resolves.toEqual({
      id: 'new',
      name: 'Safari',
      kuery: 'a: b',
      updatedAt: UPDATED_AT,
    });
    expect(client.create).toHaveBeenCalledWith(SAVED_VIEW_TYPE, { name: 'Safari', kuery: 'a: b' });
  });

  it('refuses a name another view has, whatever its case and spaces', async () => {
    existing(['a', 'Safari on iOS']);

    await expect(createSavedView(client, { name: '  safari on ios ' })).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 409 },
    });
    expect(client.create).not.toHaveBeenCalled();
  });

  it('refuses a view past the most a space holds', async () => {
    existing(
      ...Array.from({ length: SAVED_VIEWS_MAX }, (_, index): [string, string] => [
        `v${index}`,
        `view ${index}`,
      ])
    );

    await expect(createSavedView(client, { name: 'one more' })).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 400 },
    });
    expect(client.create).not.toHaveBeenCalled();
  });
});

describe('updateSavedView', () => {
  it('saves the view again under its id, in place of what it kept', async () => {
    existing(['a', 'checkout']);
    client.create.mockResolvedValue(savedObject('a', { name: 'checkout', kuery: 'a: b' }));

    await updateSavedView(client, 'a', { name: 'checkout', kuery: 'a: b' });

    expect(client.create).toHaveBeenCalledWith(
      SAVED_VIEW_TYPE,
      { name: 'checkout', kuery: 'a: b' },
      { id: 'a', overwrite: true }
    );
  });

  it('keeps its own name, and refuses another view’s', async () => {
    existing(['a', 'checkout'], ['b', 'Safari']);
    client.create.mockResolvedValue(savedObject('a', { name: 'CHECKOUT' }));

    await expect(updateSavedView(client, 'a', { name: 'CHECKOUT' })).resolves.toBeDefined();
    await expect(updateSavedView(client, 'a', { name: 'safari' })).rejects.toMatchObject({
      output: { statusCode: 409 },
    });
  });

  it('answers a view that is not there with a 404', async () => {
    existing(['a', 'checkout']);

    await expect(updateSavedView(client, 'gone', { name: 'x' })).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 404 },
    });
    expect(client.create).not.toHaveBeenCalled();
  });
});

describe('deleteSavedView', () => {
  it('deletes the view', async () => {
    await deleteSavedView(client, 'a');

    expect(client.delete).toHaveBeenCalledWith(SAVED_VIEW_TYPE, 'a');
  });

  it('answers a view that is not there with a 404', async () => {
    client.delete.mockRejectedValue(SavedObjectsErrorHelpers.createGenericNotFoundError('x', 'a'));

    await expect(deleteSavedView(client, 'a')).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 404 },
    });
  });

  it('does not hide another failure', async () => {
    client.delete.mockRejectedValue(new Error('boom'));

    await expect(deleteSavedView(client, 'a')).rejects.toThrow('boom');
  });
});
