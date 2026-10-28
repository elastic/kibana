/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchResponse } from '@kbn/search-types';
import type { Maybe, TimelineEdges } from '@kbn/securitysolution-timeline-common';
import type { Inspect, PaginationInputPaginated } from '../../../common';

export interface TimelineEventsAllStrategyResponse extends IEsSearchResponse {
  consumers: Record<string, number>;
  edges: TimelineEdges[];
  totalCount: number;
  pageInfo: Pick<PaginationInputPaginated, 'activePage' | 'querySize'>;
  inspect?: Maybe<Inspect>;
}
