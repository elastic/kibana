/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  observabilityNightshiftSourceTools,
  platformSignificantEventsTools,
} from '@kbn/agent-builder-common';

export const SIGNIFICANT_EVENTS_KNOWLEDGE_INDICATOR_CREATE_FEATURE_TOOL_ID =
  platformSignificantEventsTools.createFeatureKnowledgeIndicator;
export const SIGNIFICANT_EVENTS_KNOWLEDGE_INDICATOR_CREATE_QUERY_TOOL_ID =
  platformSignificantEventsTools.createQueryKnowledgeIndicator;
export const SIGNIFICANT_EVENTS_KNOWLEDGE_INDICATORS_SEARCH_TOOL_ID =
  platformSignificantEventsTools.searchKnowledgeIndicators;
export const SIGNIFICANT_EVENTS_FEATURE_SIMILARITY_SEARCH_TOOL_ID =
  platformSignificantEventsTools.searchSimilarFeatures;
export const SIGNIFICANT_EVENTS_EVENT_CREATE_TOOL_ID = platformSignificantEventsTools.createEvent;
export const SIGNIFICANT_EVENTS_EVENT_STATUS_UPDATE_TOOL_ID =
  platformSignificantEventsTools.updateEventStatus;
export const SIGNIFICANT_EVENTS_SEARCH_EVENTS_TOOL_ID = platformSignificantEventsTools.searchEvent;
export const NIGHTSHIFT_SOURCE_LIST_TOOL_ID = observabilityNightshiftSourceTools.listSources;
export const NIGHTSHIFT_SOURCE_GET_TOOL_ID = observabilityNightshiftSourceTools.getSource;
export const NIGHTSHIFT_SOURCE_CREATE_TOOL_ID = observabilityNightshiftSourceTools.createSource;
export const NIGHTSHIFT_SOURCE_UPDATE_TOOL_ID = observabilityNightshiftSourceTools.updateSource;
export const NIGHTSHIFT_SOURCE_DELETE_TOOL_ID = observabilityNightshiftSourceTools.deleteSource;
export const SIGNIFICANT_EVENTS_EVENT_INVESTIGATION_ATTACH_TOOL_ID =
  platformSignificantEventsTools.attachInvestigation;
