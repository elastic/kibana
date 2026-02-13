/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MainCategories } from './types';

export const GET_SIEM_READINESS_CATEGORIES_API_PATH = '/api/siem_readiness/get_categories';
export const GET_SIEM_READINESS_PIPELINES_API_PATH = '/api/siem_readiness/get_pipelines';
export const GET_INDEX_RESULTS_LATEST_API_PATH =
  '/internal/ecs_data_quality_dashboard/results_latest';
export const CATEGORY_ORDER = ['Endpoint', 'Identity', 'Network', 'Cloud', 'Application/SaaS'];
export const ALL_CATEGORIES = CATEGORY_ORDER as MainCategories[];
