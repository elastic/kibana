/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest, conflict, notFound } from '@hapi/boom';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { SavedObject, SavedObjectsClientContract } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { OVERVIEW_PERCENTILE_PARAMS } from '../../../common/overview_filters';
import {
  SAVED_VIEW_TYPE,
  SAVED_VIEWS_MAX,
  type SavedView,
  type SavedViewAttributes,
} from '../../../common/saved_views';
import { savedViewAttributesSchema } from '../../saved_objects/saved_view';

const tooManyMessage = () =>
  i18n.translate('xpack.digitalExperience.savedViews.api.tooMany', {
    defaultMessage: 'A space holds at most {max} views. Delete one to save another.',
    values: { max: SAVED_VIEWS_MAX },
  });

const nameTakenMessage = (name: string) =>
  i18n.translate('xpack.digitalExperience.savedViews.api.nameTaken', {
    defaultMessage: 'A view named [{name}] exists already.',
    values: { name },
  });

const notFoundMessage = (id: string) =>
  i18n.translate('xpack.digitalExperience.savedViews.api.notFound', {
    defaultMessage: 'View [{id}] not found',
    values: { id },
  });

const changedMessage = (id: string) =>
  i18n.translate('xpack.digitalExperience.savedViews.api.changed', {
    defaultMessage: 'View [{id}] was changed or deleted by someone else. Reload the views.',
    values: { id },
  });

const toSavedView = ({
  id,
  attributes,
  updated_at: updatedAt,
}: SavedObject<SavedViewAttributes>): SavedView => ({ id, ...attributes, updatedAt });

const byName = (a: SavedView, b: SavedView) =>
  a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });

/** Names are told apart by their letters, not their case or the spaces around them. */
const isSameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** A view as it was read, with the version of the saved object to write it again against. */
interface StoredView {
  view: SavedView;
  version?: string;
}

/**
 * The attributes a stored view should have, or nothing. The routes only save valid ones, but the
 * generic saved objects API does not check an update against the type, so a view can hold anything,
 * and one such view must not fail the list of the whole space.
 */
const parseAttributes = (attributes: unknown): SavedViewAttributes | undefined => {
  try {
    const { percentile, ...parsed } = savedViewAttributesSchema.validate(attributes);
    const offered = OVERVIEW_PERCENTILE_PARAMS.find((param) => param === percentile);
    return offered ? { ...parsed, percentile: offered } : parsed;
  } catch {
    return undefined;
  }
};

const toStoredView = ({
  id,
  attributes,
  updated_at: updatedAt,
  version,
}: SavedObject<unknown>): StoredView | undefined => {
  const parsed = parseAttributes(attributes);
  return parsed ? { view: { id, ...parsed, updatedAt }, version } : undefined;
};

/** Every saved object of the type, page after page: an import can bring a space past the most it holds. */
const findAll = async (
  client: SavedObjectsClientContract,
  page = 1,
  found: Array<SavedObject<unknown>> = []
): Promise<Array<SavedObject<unknown>>> => {
  const { saved_objects: savedObjects, total } = await client.find<unknown>({
    type: SAVED_VIEW_TYPE,
    perPage: SAVED_VIEWS_MAX,
    page,
  });
  const all = [...found, ...savedObjects];
  return savedObjects.length === 0 || all.length >= total ? all : findAll(client, page + 1, all);
};

const readStoredViews = async (client: SavedObjectsClientContract): Promise<StoredView[]> =>
  (await findAll(client)).flatMap((savedObject) => toStoredView(savedObject) ?? []);

/** The views of the client's space, by name. */
export const listSavedViews = async (client: SavedObjectsClientContract): Promise<SavedView[]> =>
  (await readStoredViews(client)).map(({ view }) => view).sort(byName);

/** Saves a view; its name is not another view's, and the space has room for one more. */
export const createSavedView = async (
  client: SavedObjectsClientContract,
  attributes: SavedViewAttributes
): Promise<SavedView> => {
  const views = await listSavedViews(client);
  if (views.length >= SAVED_VIEWS_MAX) {
    throw badRequest(tooManyMessage());
  }
  if (views.some(({ name }) => isSameName(name, attributes.name))) {
    throw conflict(nameTakenMessage(attributes.name));
  }
  return toSavedView(await client.create<SavedViewAttributes>(SAVED_VIEW_TYPE, attributes));
};

/**
 * Saves a view again under the same id, in place of what it kept: a filter taken off is gone, not
 * left in the old view. Its name is not another view's. The write is against the version that was
 * read, so a view that someone changed or deleted meanwhile is a conflict, not saved over or back.
 */
export const updateSavedView = async (
  client: SavedObjectsClientContract,
  id: string,
  attributes: SavedViewAttributes
): Promise<SavedView> => {
  const stored = await readStoredViews(client);
  const current = stored.find(({ view }) => view.id === id);
  if (!current) {
    throw notFound(notFoundMessage(id));
  }
  if (stored.some(({ view }) => view.id !== id && isSameName(view.name, attributes.name))) {
    throw conflict(nameTakenMessage(attributes.name));
  }
  try {
    return toSavedView(
      await client.create<SavedViewAttributes>(SAVED_VIEW_TYPE, attributes, {
        id,
        overwrite: true,
        version: current.version,
      })
    );
  } catch (error) {
    if (SavedObjectsErrorHelpers.isConflictError(error)) {
      throw conflict(changedMessage(id));
    }
    throw error;
  }
};

export const deleteSavedView = async (
  client: SavedObjectsClientContract,
  id: string
): Promise<void> => {
  try {
    await client.delete(SAVED_VIEW_TYPE, id);
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
      throw notFound(notFoundMessage(id));
    }
    throw error;
  }
};
