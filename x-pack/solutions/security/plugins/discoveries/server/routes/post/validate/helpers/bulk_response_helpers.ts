/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkResponse } from '@elastic/elasticsearch/lib/api/types';

export const getCreatedDocumentIds = (bulkResponse: BulkResponse): string[] =>
  bulkResponse.items.flatMap((item) =>
    item.create?.result === 'created' ? item.create._id ?? [] : []
  );

export const getVersionConflictDocumentIds = (bulkResponse: BulkResponse): string[] =>
  bulkResponse.items.flatMap((item) => {
    const error = item.create?.error;
    const id = item.create?._id;

    if (!error || !id) return [];

    return error.type === 'version_conflict_engine_exception' ? [id] : [];
  });

export const hasNonIdempotentBulkErrors = (bulkResponse: BulkResponse): boolean =>
  bulkResponse.items.some((item) => {
    const error = item.create?.error;
    if (!error) return false;

    return error.type !== 'version_conflict_engine_exception';
  });
