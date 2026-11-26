/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesIndexState } from '@elastic/elasticsearch/lib/api/types';
import type { Connector } from '@kbn/search-connectors/types/connectors';

export interface FetchIndexResult {
  index: IndicesIndexState & {
    connector?: Connector;
    count: number;
  };
}
