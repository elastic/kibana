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
}: {
  excludedDocuments: ExcludedDocument[];
  sourceDocuments: Record<string, FetchedDocument>;
  results: Array<Record<string, string>>;
  isRuleAggregating: boolean;
  aggregatableTimestampField: string;
}): void => {
  // aggregating queries do not have event _id, so we will not exclude any documents
  if (isRuleAggregating) {
    return;
  }
  const documentIds = Object.keys(sourceDocuments);
  const lastId = results.at(-1)?._id;

  addToExcludedDocuments(
    excludedDocuments,
    sourceDocuments,
    documentIds.length === 1 ? documentIds : documentIds.filter((id) => id !== lastId),
    aggregatableTimestampField
  );
};

const addToExcludedDocuments = (
  excludedDocuments: ExcludedDocument[],
  sourceDocuments: Record<string, FetchedDocument>,
  documentIds: string[],
  aggregatableTimestampField: string
): void => {
  for (const documentId of documentIds) {
    const document = sourceDocuments[documentId];

    excludedDocuments.push({
      id: documentId,
      timestamp: document.fields?.[aggregatableTimestampField]?.[0],
    });
  }
};
