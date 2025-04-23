/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FetchedDocument } from '../fetch_source_documents';
import type { EsqlTable } from '../esql_request';

/**
 * Updates the list of excluded document ids
 * If mv_expand not used, we update excludedDocumentIds with all source document ids.
 * When the `mv_expand` command is used, the last document ID in the multiple results is not excluded.
 * It is to ensure that in the next page we will be able to catch the rest of expanded values
 */
export const updateExcludedIds = ({
  excludedDocumentIds,
  hasMvExpand,
  sourceDocuments,
  results,
  isRuleAggregating,
}: {
  excludedDocumentIds: string[];
  hasMvExpand: boolean;
  sourceDocuments: Record<string, FetchedDocument>;
  results: EsqlTable;
  isRuleAggregating: boolean;
}): string[] => {
  // aggregating queries do not have event _id, so we will not exclude any documents
  if (isRuleAggregating) {
    return excludedDocumentIds;
  }
  const documentIds = Object.keys(sourceDocuments);

  if (!hasMvExpand || documentIds.length === 1) {
    excludedDocumentIds.push(...documentIds);
    return excludedDocumentIds;
  }

  const idColumnIndex = results.columns.findIndex((column) => column.name === '_id');
  const lastId = results.values[results.values.length - 1][idColumnIndex];

  excludedDocumentIds.push(...documentIds.filter((id) => id !== lastId));

  return excludedDocumentIds;
};
