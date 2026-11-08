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
import {
  SAVED_VIEW_TYPE,
  SAVED_VIEWS_MAX,
  type SavedView,
  type SavedViewAttributes,
} from '../../../common/saved_views';

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

const toSavedView = ({
  id,
  attributes,
  updated_at: updatedAt,
}: SavedObject<SavedViewAttributes>): SavedView => ({ id, ...attributes, updatedAt });

const byName = (a: SavedView, b: SavedView) =>
  a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });

/** Names are told apart by their letters, not their case or the spaces around them. */
const isSameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** The views of the client's space, by name. */
export const listSavedViews = async (client: SavedObjectsClientContract): Promise<SavedView[]> => {
  const { saved_objects: views } = await client.find<SavedViewAttributes>({
    type: SAVED_VIEW_TYPE,
    perPage: SAVED_VIEWS_MAX,
  });
  return views.map(toSavedView).sort(byName);
};

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
 * left in the old view. Its name is not another view's.
 */
export const updateSavedView = async (
  client: SavedObjectsClientContract,
  id: string,
  attributes: SavedViewAttributes
): Promise<SavedView> => {
  const views = await listSavedViews(client);
  if (!views.some((view) => view.id === id)) {
    throw notFound(notFoundMessage(id));
  }
  if (views.some((view) => view.id !== id && isSameName(view.name, attributes.name))) {
    throw conflict(nameTakenMessage(attributes.name));
  }
  return toSavedView(
    await client.create<SavedViewAttributes>(SAVED_VIEW_TYPE, attributes, { id, overwrite: true })
  );
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
