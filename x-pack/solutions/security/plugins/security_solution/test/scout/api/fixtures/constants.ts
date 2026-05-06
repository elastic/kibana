/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-security';

const BASE_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'Content-Type': 'application/json;charset=UTF-8',
};

/**
 * Headers for public APIs (versioned with 2023-10-31)
 */
export const PUBLIC_HEADERS = {
  ...BASE_HEADERS,
  'elastic-api-version': '2023-10-31',
};

/**
 * Headers for internal APIs
 */
export const INTERNAL_HEADERS = {
  ...BASE_HEADERS,
  'x-elastic-internal-origin': 'kibana',
  'elastic-api-version': '1',
};

/**
 * Third-party API routes (owned by other teams)
 * These are the APIs that SIEM Readiness depends on.
 * Tests verify that these APIs return the expected structure.
 */
export const THIRD_PARTY_ROUTES = {
  /** Fleet team - GET packages with status and policy info */
  FLEET_PACKAGES: '/api/fleet/epm/packages',
  /** Detection Engine team - GET rules with related_integrations and MITRE threat data */
  DETECTION_RULES_FIND: '/api/detection_engine/rules/_find',
  /** ECS Data Quality team - GET data quality check results */
  ECS_DATA_QUALITY_LATEST: '/internal/ecs_data_quality_dashboard/results_latest',
  /** Cases team - POST search for case counts */
  CASES_SEARCH: '/internal/cases/_search',
};

/**
 * SIEM Readiness routes (our endpoints)
 */
export const SIEM_READINESS_ROUTES = {
  GET_CATEGORIES: '/api/siem_readiness/get_categories',
  GET_RETENTION: '/api/siem_readiness/get_retention',
  GET_PIPELINES: '/api/siem_readiness/get_pipelines',
  MITRE_DOC_COUNTS: '/api/siem_readiness/mitre_data_indices_docs_count',
};

/**
 * Tags for running tests on different deployment types
 */
export const SIEM_READINESS_TAGS = [...tags.stateful.classic, ...tags.serverless.security.complete];

/**
 * ES archives path for SIEM Readiness test data
 */
export const SIEM_READINESS_ES_ARCHIVE =
  'x-pack/solutions/security/plugins/security_solution/test/scout/api/es_archives/siem_readiness';
