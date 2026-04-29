/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const PLUGIN_ID = 'ecsDataQualityDashboard';
export const PLUGIN_NAME = 'ecsDataQualityDashboard';

export const BASE_PATH = '/internal/ecs_data_quality_dashboard';
export const GET_INDEX_STATS = `${BASE_PATH}/stats/{pattern}`;
export const GET_INDEX_MAPPINGS = `${BASE_PATH}/mappings/{pattern}`;
export const GET_UNALLOWED_FIELD_VALUES = `${BASE_PATH}/unallowed_field_values`;
export const GET_ILM_EXPLAIN = `${BASE_PATH}/ilm_explain/{pattern}`;
export const POST_INDEX_RESULTS = `${BASE_PATH}/results`;
export const GET_INDEX_RESULTS = `${BASE_PATH}/results/{pattern}`;
export const GET_INDEX_RESULTS_LATEST = `${BASE_PATH}/results_latest/{pattern}`;
export const INTERNAL_API_VERSION = '1';
