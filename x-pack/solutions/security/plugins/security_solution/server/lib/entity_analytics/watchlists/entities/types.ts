/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityType } from '@kbn/entity-store/common';

export interface WatchlistEntityDoc {
  '@timestamp'?: string;
  entity: {
    id: string;
    name?: string;
    type: EntityType;
  };
  labels?: {
    sources?: string[];
    source_ids?: string[];
  };
}
