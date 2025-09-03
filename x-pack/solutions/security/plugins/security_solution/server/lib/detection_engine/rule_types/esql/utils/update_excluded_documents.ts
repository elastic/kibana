/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FetchedDocument } from '../fetch_source_documents';
import type { ExcludedDocument } from '../types';

/**
 * Updates the list of excluded documents
 * The last document ID in the multiple results is not excluded to avoid missing alerts in case of mv_expand usage or reaching max_signals limit
 * It is to ensure that in the next page we will be able to catch the rest of expanded values or alerts not created when reached max_signals limit
 */
export const updateExcludedDocuments = ({
  excludedDocuments,
  sourceDocuments,
  results,
  isRuleAggregating,
  aggregatableTimestampField,
  searchExhausted,
}: {
  excludedDocuments: Record<string, ExcludedDocument[]>;
  sourceDocuments: Record<string, FetchedDocument[]>;
  results: Array<Record<string, string>>;
  isRuleAggregating: boolean;
  aggregatableTimestampField: string;
  searchExhausted: boolean;
}): void => {
  // aggregating queries do not have event _id, so we will not exclude any documents
  if (isRuleAggregating) {
    return;
  }

  const totalSourceDocuments = Object.keys(sourceDocuments).reduce(
    (acc, index) => acc + sourceDocuments[index].length,
    0
  );

  const documentIds = Object.keys(sourceDocuments);

  if (totalSourceDocuments !== 1 && !searchExhausted) {
    const lastId = results.at(-1)?._id;
    const lastIndex = results.at(-1)?._index;

    // if single document is returned(same id, same index across all results), we will exclude it
    const excludeSingleDocument =
      documentIds.length === 1 &&
      results.reduce((acc, doc) => {
        acc.add(doc._index);
        return acc;
      }, new Set()).size === 1;

    if (lastId) {
      if (lastIndex === undefined) {
        sourceDocuments[lastId]?.pop();
      } else {
        sourceDocuments[lastId] = sourceDocuments[lastId].filter((doc) => {
          return excludeSingleDocument ? doc._index === lastIndex : doc._index !== lastIndex;
        });
      }
    }
  }

  addToExcludedDocuments(
    excludedDocuments,
    sourceDocuments,
    documentIds,
    aggregatableTimestampField
  );
};

const addToExcludedDocuments = (
  excludedDocuments: Record<string, ExcludedDocument[]>,
  sourceDocuments: Record<string, FetchedDocument[]>,
  documentIds: string[],
  aggregatableTimestampField: string
): void => {
  for (const documentId of documentIds) {
    const documents = sourceDocuments[documentId];

    documents.forEach((document) => {
      if (!excludedDocuments[document._index]) {
        excludedDocuments[document._index] = [];
      }

      excludedDocuments[document._index].push({
        id: documentId,
        timestamp: document.fields?.[aggregatableTimestampField]?.[0],
      });
    });
  }
};
