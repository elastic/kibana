/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import { i18n } from '@kbn/i18n';
import type { Logger } from '@kbn/logging';
import { NotebookDefinition } from '@kbn/ipynb';

import {
  NotebookCatalog,
  NotebookCatalogResponse,
  NotebookInformation,
  NotebookSchema,
} from '../../common/types';

import type { SearchNotebooksConfig } from '../config';
import type { NotebooksCache, RemoteNotebookCatalog } from '../types';
import {
  cleanCachedNotebook,
  cleanNotebookMetadata,
  dateWithinTTL,
  notebookCatalogResponse,
  validateRemoteNotebookCatalog,
} from '../utils';

const NOTEBOOKS_DATA_DIR = '../data';
const FETCH_OPTIONS = {
  method: 'GET',
  headers: { 'Content-Type': 'application/json' },
};

export interface NotebookCatalogFetchOptions {
  cache: NotebooksCache;
  config: SearchNotebooksConfig;
  logger: Logger;
  notebookList?: string;
}

// Notebook catalog v1, leaving to ensure backward-compatibility
export const DEFAULT_NOTEBOOKS: NotebookCatalog = {
  notebooks: [
    {
      id: '00_quick_start',
      title: i18n.translate('xpack.searchNotebooks.notebooksCatalog.quickStart.title', {
        defaultMessage: 'Semantic search quick start',
      }),
      description: i18n.translate('xpack.searchNotebooks.notebooksCatalog.quickStart.description', {
        defaultMessage:
          'Learn how to create a simple hybrid search system that combines semantic search and lexical (keyword) search.',
      }),
    },
    {
      id: '01_keyword_querying_filtering',
      title: i18n.translate('xpack.searchNotebooks.notebooksCatalog.keywordQueryFiltering.title', {
        defaultMessage: 'Keyword querying and filtering',
      }),
      description: i18n.translate(
        'xpack.searchNotebooks.notebooksCatalog.keywordQueryFiltering.description',
        {
          defaultMessage: 'Learn the basics of Elasticsearch queries and filters.',
        }
      ),
    },
    {
      id: '02_hybrid_search',
      title: i18n.translate('xpack.searchNotebooks.notebooksCatalog.hybridSearch.title', {
        defaultMessage: 'Hybrid Search using RRF',
      }),
      description: i18n.translate(
        'xpack.searchNotebooks.notebooksCatalog.hybridSearch.description',
        {
          defaultMessage:
            'Learn how to use the reciprocal rank fusion algorithm to combine the results of BM25 and kNN semantic search.',
        }
      ),
    },
    {
      id: '03_elser',
      title: i18n.translate('xpack.searchNotebooks.notebooksCatalog.elser.title', {
        defaultMessage: 'Semantic Search using ELSER v2 text expansion',
      }),
      description: i18n.translate('xpack.searchNotebooks.notebooksCatalog.elser.description', {
        defaultMessage:
          "Learn how to use ELSER, Elastic's retrieval model for text expansion-powered semantic search that works out of the box.",
      }),
    },
    {
      id: '04_multilingual',
      title: i18n.translate('xpack.searchNotebooks.notebooksCatalog.multilingual.title', {
        defaultMessage: 'Multilingual semantic search',
      }),
      description: i18n.translate(
        'xpack.searchNotebooks.notebooksCatalog.multilingual.description',
        {
          defaultMessage:
            'Learn how to use a multilingual embedding model to search over a dataset of mixed language documents.',
        }
      ),
    },
  ],
};
// Notebook catalog v1.1 with lists for contextual notebooks
export const DEFAULT_NOTEBOOK_CATALOG: NotebookCatalog = {
  notebooks: [...DEFAULT_NOTEBOOKS.notebooks],
  lists: {
    default: [
      '00_quick_start',
      '01_keyword_querying_filtering',
      '02_hybrid_search',
      '03_elser',
      '04_multilingual',
    ],
  },
};
export const NOTEBOOKS_MAP: Record<string, NotebookInformation> =
  DEFAULT_NOTEBOOK_CATALOG.notebooks.reduce((nbMap, nb) => {
    nbMap[nb.id] = nb;
    return nbMap;
  }, {} as Record<string, NotebookInformation>);

const NOTEBOOK_IDS = DEFAULT_NOTEBOOK_CATALOG.notebooks.map(({ id }) => id);

export const getNotebookCatalog = async ({
  config,
  cache,
  logger,
  notebookList,
}: NotebookCatalogFetchOptions): Promise<NotebookCatalogResponse> => {
  if (config.catalog && config.catalog.url) {
    const catalog = await fetchNotebookCatalog(config.catalog, cache, logger, notebookList);
    if (catalog) {
      return catalog;
    }
  }
  return notebookCatalogResponse(DEFAULT_NOTEBOOK_CATALOG, notebookList);
};

export const getNotebook = async (
  notebookId: string,
  options: NotebookCatalogFetchOptions
): Promise<NotebookDefinition | undefined> => {
  const { cache, logger } = options;
  if (cache.catalog) {
    return fetchNotebook(notebookId, options);
  }
  // Only server pre-defined notebooks, since we're reading files from disk only allow IDs
  // for the known notebooks so that we aren't attempting to read any file from disk given user input
  if (!NOTEBOOK_IDS.includes(notebookId)) {
    logger.warn(`Unknown search notebook requested ${notebookId}`);
    throw new Error(
      i18n.translate('xpack.searchNotebooks.notebooksCatalog.errors.unknownId', {
        defaultMessage: 'Unknown Notebook ID',
      })
    );
  }

  const notebookPath = path.join(__dirname, NOTEBOOKS_DATA_DIR, `${notebookId}.json`);
  try {
    await fs.access(notebookPath, fs.constants.F_OK);
    const notebook = (await import(notebookPath)).default;
    return notebook;
  } catch (err) {
    logger.error(`Error reading search notebook ${notebookId}`, err);
    throw new Error(
      i18n.translate('xpack.searchNotebooks.notebooksCatalog.errors.notebookImportFailure', {
        defaultMessage: 'Failed to fetch notebook.',
      })
    );
  }
};

export const getNotebookMetadata = (id: string, cache: NotebooksCache) => {
  if (cache.catalog) {
    const nbInfo = cache.catalog.notebooks.find((nb) => nb.id === id);
    return nbInfo ? cleanNotebookMetadata(nbInfo) : undefined;
  }
  if (!Object.hasOwn(NOTEBOOKS_MAP, id)) {
    return undefined;
  }

  return NOTEBOOKS_MAP[id];
};

type CatalogConfig = Readonly<{
  url: string;
  ttl: number;
  errorTTL: number;
}>;

export const fetchNotebookCatalog = async (
  catalogConfig: CatalogConfig,
  cache: NotebooksCache,
  logger: Logger,
  notebookList?: string
): Promise<NotebookCatalogResponse | null> => {
  if (cache.catalog && dateWithinTTL(cache.catalog.timestamp, catalogConfig.ttl)) {
    return notebookCatalogResponse(cache.catalog, notebookList);
  }

  try {
    const resp = await fetch(catalogConfig.url, FETCH_OPTIONS);
    if (resp.ok) {
      const respJson = await resp.json();
      const catalog: RemoteNotebookCatalog = validateRemoteNotebookCatalog(respJson);
      cache.catalog = { ...catalog, timestamp: new Date() };
      return notebookCatalogResponse(cache.catalog, notebookList);
    } else {
      throw new Error(`Failed to fetch notebook ${resp.status} ${resp.statusText}`);
    }
  } catch (e) {
    logger.warn(
      `Failed to fetch search notebooks catalog from configured URL ${catalogConfig.url}.`
    );
    logger.warn(e);
    if (cache.catalog && dateWithinTTL(cache.catalog.timestamp, catalogConfig.errorTTL)) {
      // If we can't fetch the catalog but we have it cached and it's within the error TTL,
      // returned the cached value.
      return notebookCatalogResponse(cache.catalog, notebookList);
    }
  }

  return null;
};

export const fetchNotebook = async (
  id: string,
  { cache, config, logger }: NotebookCatalogFetchOptions
): Promise<NotebookDefinition | undefined> => {
  if (!cache.catalog || !config.catalog) return undefined;
  const catalogConfig = config.catalog;
  const nbInfo = cache.catalog.notebooks.find((nb) => nb.id === id);
  if (!nbInfo) return undefined;
  if (cache.notebooks[id] && dateWithinTTL(cache.notebooks[id].timestamp, catalogConfig.ttl)) {
    return cleanCachedNotebook(cache.notebooks[id]);
  }
  if (!nbInfo.url) return undefined;

  try {
    const resp = await fetch(nbInfo.url, FETCH_OPTIONS);
    if (resp.ok) {
      const respJSON = await resp.json();
      const notebook: NotebookDefinition = NotebookSchema.validate(respJSON);
      cache.notebooks[id] = { ...notebook, timestamp: new Date() };
      return notebook;
    } else {
      logger.warn(
        `Failed to fetch search notebook from URL ${nbInfo.url}\n${resp.status}: ${resp.statusText}`
      );
    }
  } catch (e) {
    logger.warn(`Failed to fetch search notebook from URL ${nbInfo.url}`);
    logger.warn(e);
  }
  return undefined;
};
