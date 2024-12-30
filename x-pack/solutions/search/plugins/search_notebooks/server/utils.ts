/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NotebookDefinition } from '@kbn/ipynb';
import {
  NotebookCatalog,
  NotebookCatalogResponse,
  NotebookCatalogSchema,
  NotebookInformation,
} from '../common/types';
import type {
  CachedNotebook,
  CachedNotebookCatalog,
  NotebooksCache,
  RemoteNotebookCatalog,
  RemoteNotebookInformation,
} from './types';

export function createNotebooksCache(): NotebooksCache {
  return {
    notebooks: {},
  };
}

export function dateWithinTTL(value: Date, ttl: number) {
  return (Date.now() - value.getTime()) / 1000 <= ttl;
}

export function cleanCachedNotebookCatalog(
  notebooks: Array<RemoteNotebookInformation | NotebookInformation>
): NotebookCatalogResponse {
  const cleanedNotebooks = notebooks.map(cleanNotebookMetadata);
  return {
    notebooks: cleanedNotebooks,
  };
}
export function cleanCachedNotebook(notebook: CachedNotebook): NotebookDefinition {
  const { timestamp, ...result } = notebook;
  return result;
}

export function cleanNotebookMetadata(
  nb: RemoteNotebookInformation | NotebookInformation
): NotebookInformation {
  const { id, title, description, link } = nb;
  return {
    description,
    id,
    link,
    title,
  };
}

export function isCachedNotebookCatalog(
  catalog: CachedNotebookCatalog | NotebookCatalog
): catalog is CachedNotebookCatalog {
  return 'timestamp' in catalog;
}

const DEFAULT_NOTEBOOK_LIST_KEY = 'default';
export function notebookCatalogResponse(
  catalog: CachedNotebookCatalog | NotebookCatalog,
  list: string = DEFAULT_NOTEBOOK_LIST_KEY
): NotebookCatalogResponse {
  if (!catalog.lists) {
    return isCachedNotebookCatalog(catalog)
      ? cleanCachedNotebookCatalog(catalog.notebooks)
      : catalog;
  }

  const listOfNotebookIds = getListOfNotebookIds(catalog.lists, list);
  const notebookIndexMap = (catalog.notebooks as NotebookInformation[]).reduce(
    (indexMap, nb, i) => {
      indexMap[nb.id] = i;
      return indexMap;
    },
    {} as Record<string, number | undefined>
  );
  const notebooks = listOfNotebookIds
    .map((id) => {
      const nbIndex = notebookIndexMap[id];
      if (nbIndex === undefined) return undefined;
      return catalog.notebooks[nbIndex] ?? undefined;
    })
    .filter(
      (nbInfo): nbInfo is RemoteNotebookInformation | NotebookInformation => nbInfo !== undefined
    );
  return cleanCachedNotebookCatalog(notebooks);
}

function getListOfNotebookIds(
  catalogLists: NonNullable<NotebookCatalog['lists']>,
  list: string
): string[] {
  if (list in catalogLists && catalogLists[list]) return catalogLists[list]!;
  if (DEFAULT_NOTEBOOK_LIST_KEY in catalogLists && catalogLists[DEFAULT_NOTEBOOK_LIST_KEY])
    return catalogLists[DEFAULT_NOTEBOOK_LIST_KEY];

  // This should not happen as we should not load a catalog with lists thats missing the default list as valid,
  // but handling this case for code completeness.
  throw new Error('Notebook catalog has lists, but is missing default list'); // TODO: ?translate
}

export function validateRemoteNotebookCatalog(respJson: any): RemoteNotebookCatalog {
  const catalog: RemoteNotebookCatalog = NotebookCatalogSchema.validate(respJson);
  if (catalog.lists && !(DEFAULT_NOTEBOOK_LIST_KEY in catalog.lists)) {
    // TODO: translate error message
    throw new Error(
      'Invalid remote notebook catalog. Catalog defines lists, but is missing the default list.'
    );
  }
  return catalog;
}
