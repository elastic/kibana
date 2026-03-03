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
