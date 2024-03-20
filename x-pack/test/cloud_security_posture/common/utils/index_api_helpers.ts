/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';

export const deleteIndices = async (es: Client, indices: string[]) => {
  Promise.all([
    ...indices.map((index) =>
      es.deleteByQuery({
        index,
        query: {
          match_all: {},
        },
        ignore_unavailable: true,
        refresh: true,
      })
    ),
  ]);
};

export const addIndexDocs = async <T>(es: Client, indexDocs: T[], indexName: string) => {
  await Promise.all([
    ...indexDocs.map((findingDoc) =>
      es.index({
        index: indexName,
        body: {
          ...findingDoc,
          '@timestamp': new Date().toISOString(),
        },
        refresh: true,
      })
    ),
  ]);
};

export const addIndexDocsWithoutTimestamp = async <T>(
  es: Client,
  indexDocs: T[],
  index: string
) => {
  await Promise.all(
    indexDocs.map((findingDoc) =>
      es.index({
        index,
        body: findingDoc,
        refresh: true,
      })
    )
  );
};

const insertOperation = (index: string, findingsMock: Array<Record<string, unknown>>) => {
  return findingsMock.flatMap((doc) => [{ index: { _index: index } }, doc]);
};

export const addIndexBulkDocs = async <T>(
  es: Client,
  indexDocs: Array<Record<string, unknown>>,
  indices: string[]
) => {
  await es.bulk({
    refresh: true,
    operations: indices.flatMap((index) => insertOperation(index, indexDocs)),
  });
};

export const deleteExistingIndex = async <T>(es: Client, indexName: string) => {
  const indexExists = await es.indices.exists({ index: indexName });

  if (indexExists) {
    await es.indices.delete({ index: indexName });
  }
};

export const deleteExistingIndexByQuery = async <T>(es: Client, index: string) => {
  const indexExists = await es.indices.exists({ index });

  if (indexExists) {
    es.deleteByQuery({
      index,
      query: { match_all: {} },
      refresh: true,
    });
  }
};
