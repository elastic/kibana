/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FetchedDocument } from '../fetch_source_documents';

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
  excludedDocumentIds: Record<string, Set<string>>;
  hasMvExpand: boolean;
  sourceDocuments: Record<string, FetchedDocument[]>;
  results: Array<Record<string, string>>;
  isRuleAggregating: boolean;
}): Record<string, Set<string>> => {
  // aggregating queries do not have event _id, so we will not exclude any documents
  if (isRuleAggregating) {
    return excludedDocumentIds;
  }
  const numberOfUniqueDocumentIds = Object.keys(sourceDocuments).length;

  if (!hasMvExpand || numberOfUniqueDocumentIds === 1) {
    addExcludedDocumentIds(excludedDocumentIds, sourceDocuments, results);
    return excludedDocumentIds;
  }

  addExcludedDocumentIds(
    excludedDocumentIds,
    sourceDocuments,
    results,
    // If some of the expanded results are not in the first page, the rest can be missed if we exclude event id in subsequent requests.
    // To mitigate this, the last id on a page won't be excluded in the next page request.
    results[results.length - 1]._id
  );

  return excludedDocumentIds;
};

const addExcludedDocumentIds = (
  excludedDocumentIds: Record<string, Set<string>>,
  sourceDocuments: Record<string, FetchedDocument[]>,
  results: Array<Record<string, string>>,
  idToSkip?: string | undefined
) => {
  results.forEach(({ _id, _index }) => {
    if (idToSkip === _id) {
      return;
    }
    const index = _index ?? sourceDocuments[_id]?.[0]?._index ?? '';

    if (!excludedDocumentIds[index]) {
      excludedDocumentIds[index] = new Set<string>();
    }

    excludedDocumentIds[index].add(_id);
  });
};
