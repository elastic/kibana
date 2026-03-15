/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AccessesIntegrationConfig } from '../types';
import { getIndexPattern } from './constants';
import { buildCompositeAggQuery, buildBucketUserFilter } from './build_composite_agg';
import { buildEsqlQuery } from './build_esql_query';

export const elasticDefendIntegration: AccessesIntegrationConfig = {
  id: 'elastic_defend',
  name: 'Elastic Defend',
  getIndexPattern,
  buildCompositeAggQuery,
  buildBucketUserFilter,
  buildEsqlQuery,
};
