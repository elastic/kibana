/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DETECTION_ENGINE_SEARCH_UNIFIED_ALERTS_URL,
  DETECTION_ENGINE_SET_UNIFIED_ALERTS_WORKFLOW_STATUS_URL,
  DETECTION_ENGINE_SET_UNIFIED_ALERTS_TAGS_URL,
  DETECTION_ENGINE_SET_UNIFIED_ALERTS_ASSIGNEES_URL,
} from '../../../../../common/constants';

const ONE_MINUTE = 60000;

export const DEFAULT_QUERY_OPTIONS = {
  refetchIntervalInBackground: false,
  staleTime: ONE_MINUTE * 5,
};

export const SEARCH_UNIFIED_ALERTS_QUERY_KEY = ['GET', DETECTION_ENGINE_SEARCH_UNIFIED_ALERTS_URL];
export const SET_UNIFIED_ALERTS_WORKFLOW_STATUS_MUTATION_KEY = [
  'POST',
  DETECTION_ENGINE_SET_UNIFIED_ALERTS_WORKFLOW_STATUS_URL,
];
export const SET_UNIFIED_ALERTS_TAGS_MUTATION_KEY = [
  'POST',
  DETECTION_ENGINE_SET_UNIFIED_ALERTS_TAGS_URL,
];
export const SET_UNIFIED_ALERTS_ASSIGNEES_MUTATION_KEY = [
  'POST',
  DETECTION_ENGINE_SET_UNIFIED_ALERTS_ASSIGNEES_URL,
];
