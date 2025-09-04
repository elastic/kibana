/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FetchedDocument } from '../fetch_source_documents';

/**
 * Retrieves a source document by matching the provided `_id` and `_index`.
 */
export const getSourceDocument = (
  sourceDocuments: Record<string, FetchedDocument[]>,
  id: string,
  index: string
): FetchedDocument | undefined => {
  const documents = sourceDocuments[id];
  if (!documents) {
    return undefined;
  }
  if (documents.length === 1) {
    return documents[0];
  }

  return documents.find((doc) => doc._index === index);
};
