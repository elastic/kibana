/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FetchedDocument } from '../fetch_source_documents';
import type { EsqlTable } from '../esql_request';
import type { ExcludedDocument } from '../types';

/**
 * Updates the list of excluded documents
 * If mv_expand not used, we update excludedDocuments with all source document ids.
 * When the `mv_expand` command is used, the last document ID in the multiple results is not excluded.
 * It is to ensure that in the next page we will be able to catch the rest of expanded values
 */
export const updateExcludedDocuments = ({
  excludedDocuments,
  hasMvExpand,
  sourceDocuments,
  results,
  isRuleAggregating,
}: {
  excludedDocuments: ExcludedDocument[];
  hasMvExpand: boolean;
  sourceDocuments: Record<string, FetchedDocument>;
  results: EsqlTable;
  isRuleAggregating: boolean;
}): ExcludedDocument[] => {
  // aggregating queries do not have event _id, so we will not exclude any documents
  if (isRuleAggregating) {
    return excludedDocuments;
  }
  const documentIds = Object.keys(sourceDocuments);

  if (!hasMvExpand || documentIds.length === 1) {
    addToExcludedDocuments(excludedDocuments, sourceDocuments, documentIds);
    return excludedDocuments;
  }

  const idColumnIndex = results.columns.findIndex((column) => column.name === '_id');
  const lastId = results.values[results.values.length - 1][idColumnIndex];

  addToExcludedDocuments(
    excludedDocuments,
    sourceDocuments,
    documentIds.filter((id) => id !== lastId)
  );

  return excludedDocuments;
};

const addToExcludedDocuments = (
  excludedDocuments: ExcludedDocument[],
  sourceDocuments: Record<string, FetchedDocument>,
  documentIds: string[]
): ExcludedDocument[] => {
  for (const documentId of documentIds) {
    const document = sourceDocuments[documentId];
    excludedDocuments.push({
      id: documentId,
      timestamp: document._source?.['@timestamp'],
    });
  }
  return excludedDocuments;
};
