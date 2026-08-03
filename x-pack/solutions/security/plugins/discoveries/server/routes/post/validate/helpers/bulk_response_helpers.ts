/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkResponse } from '@elastic/elasticsearch/lib/api/types';

/**
 * Returns the ids of documents that were actually created this run (i.e. did not
 * already exist). Any candidate whose `_id` already exists produces a version
 * conflict instead of a `created` result, so it is excluded here.
 */
export const getCreatedDocumentIds = (bulkResponse: BulkResponse): string[] =>
  bulkResponse.items.flatMap((item) =>
    item.create?.result === 'created' ? item.create._id ?? [] : []
  );

/**
 * Returns the ids of documents that were dropped because they already existed,
 * i.e. the bulk `create` for that `_id` failed with a version conflict. This is
 * the accurate signal for "duplicates dropped".
 */
export const getVersionConflictDocumentIds = (bulkResponse: BulkResponse): string[] =>
  bulkResponse.items.flatMap((item) => {
    const error = item.create?.error;
    const id = item.create?._id;

    if (!error || !id) return [];

    return error.type === 'version_conflict_engine_exception' ? [id] : [];
  });

/**
 * Whether the bulk `create` response contains any error that is NOT an expected
 * duplicate. Version conflicts are the expected signal that a discovery already
 * exists (and was therefore dropped), so they are ignored.
 */
export const hasNonIdempotentBulkErrors = (bulkResponse: BulkResponse): boolean =>
  bulkResponse.items.some((item) => {
    const error = item.create?.error;
    if (!error) return false;

    return error.type !== 'version_conflict_engine_exception';
  });
