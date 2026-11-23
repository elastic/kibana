/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  NIGHTSHIFT_AGENT_BUILDER_KNOWLEDGE_INDICATOR_CREATED_EVENT_TYPE,
  NIGHTSHIFT_AGENT_TOOL_EVENT_CREATE_EVENT_TYPE,
  NIGHTSHIFT_EVENT_STATUS_CHANGED_EVENT_TYPE,
  NIGHTSHIFT_AGENT_TOOL_KI_IDENTIFICATION_STARTED_EVENT_TYPE,
  NIGHTSHIFT_DETECTION_SCAN_EVENT_TYPE,
  NIGHTSHIFT_DISCOVERY_COMPLETED_EVENT_TYPE,
  NIGHTSHIFT_DISCOVERY_STARTED_EVENT_TYPE,
  NIGHTSHIFT_DISCOVERY_TRIGGERED_EVENT_TYPE,
  NIGHTSHIFT_FEATURES_IDENTIFIED_EVENT_TYPE,
  NIGHTSHIFT_ONBOARDING_SCHEDULED_EVENT_TYPE,
  NIGHTSHIFT_KNOWLEDGE_INDICATORS_QUERIES_GENERATED_EVENT_TYPE,
  NIGHTSHIFT_AGENT_TOOL_EVENT_WRITE_EVENT_TYPE,
  NIGHTSHIFT_AGENT_TOOL_EVENT_SEARCH_EVENT_TYPE,
  NIGHTSHIFT_AGENT_TOOL_FAILED_EVENT_TYPE,
  NIGHTSHIFT_KNOWLEDGE_INDICATORS_QUERIES_GENERATION_FAILED_EVENT_TYPE,
} from './constants';
import {
  agentToolFailedSchema,
  knowledgeIndicatorQueriesGenerationFailedSchema,
  agentBuilderKnowledgeIndicatorCreatedSchema,
  agentToolEventCreateSchema,
  agentToolEventSearchSchema,
  agentToolEventWriteSchema,
  agentToolKnowledgeIndicatorIdentificationStartedSchema,
  detectionScanSchema,
  discoveryCompletedSchema,
  discoveryStartedSchema,
  discoveryTriggeredSchema,
  eventStatusChangedSchema,
  knowledgeIndicatorFeaturesIdentifiedSchema,
  knowledgeIndicatorQueriesGeneratedSchema,
  onboardingScheduledSchema,
} from './schemas';

const knowledgeIndicatorEventsGeneratedEventType = {
  eventType: NIGHTSHIFT_KNOWLEDGE_INDICATORS_QUERIES_GENERATED_EVENT_TYPE,
  schema: knowledgeIndicatorQueriesGeneratedSchema,
};

const knowledgeIndicatorFeaturesIdentifiedEventType = {
  eventType: NIGHTSHIFT_FEATURES_IDENTIFIED_EVENT_TYPE,
  schema: knowledgeIndicatorFeaturesIdentifiedSchema,
};

const agentBuilderKnowledgeIndicatorCreatedEventType = {
  eventType: NIGHTSHIFT_AGENT_BUILDER_KNOWLEDGE_INDICATOR_CREATED_EVENT_TYPE,
  schema: agentBuilderKnowledgeIndicatorCreatedSchema,
};

const agentToolKiIdentificationStartedEventType = {
  eventType: NIGHTSHIFT_AGENT_TOOL_KI_IDENTIFICATION_STARTED_EVENT_TYPE,
  schema: agentToolKnowledgeIndicatorIdentificationStartedSchema,
};

const agentToolEventCreateEventType = {
  eventType: NIGHTSHIFT_AGENT_TOOL_EVENT_CREATE_EVENT_TYPE,
  schema: agentToolEventCreateSchema,
};

const discoveryStartedEventType = {
  eventType: NIGHTSHIFT_DISCOVERY_STARTED_EVENT_TYPE,
  schema: discoveryStartedSchema,
};

const discoveryCompletedEventType = {
  eventType: NIGHTSHIFT_DISCOVERY_COMPLETED_EVENT_TYPE,
  schema: discoveryCompletedSchema,
};

const eventStatusChangedEventType = {
  eventType: NIGHTSHIFT_EVENT_STATUS_CHANGED_EVENT_TYPE,
  schema: eventStatusChangedSchema,
};

const discoveryTriggeredEventType = {
  eventType: NIGHTSHIFT_DISCOVERY_TRIGGERED_EVENT_TYPE,
  schema: discoveryTriggeredSchema,
};

const detectionScanEventType = {
  eventType: NIGHTSHIFT_DETECTION_SCAN_EVENT_TYPE,
  schema: detectionScanSchema,
};

const onboardingScheduledEventType = {
  eventType: NIGHTSHIFT_ONBOARDING_SCHEDULED_EVENT_TYPE,
  schema: onboardingScheduledSchema,
};

const agentToolEventWriteEventType = {
  eventType: NIGHTSHIFT_AGENT_TOOL_EVENT_WRITE_EVENT_TYPE,
  schema: agentToolEventWriteSchema,
};

const agentToolEventSearchEventType = {
  eventType: NIGHTSHIFT_AGENT_TOOL_EVENT_SEARCH_EVENT_TYPE,
  schema: agentToolEventSearchSchema,
};

const agentToolFailedEventType = {
  eventType: NIGHTSHIFT_AGENT_TOOL_FAILED_EVENT_TYPE,
  schema: agentToolFailedSchema,
};

const knowledgeIndicatorQueriesGenerationFailedEventType = {
  eventType: NIGHTSHIFT_KNOWLEDGE_INDICATORS_QUERIES_GENERATION_FAILED_EVENT_TYPE,
  schema: knowledgeIndicatorQueriesGenerationFailedSchema,
};

export {
  agentToolFailedEventType,
  knowledgeIndicatorQueriesGenerationFailedEventType,
  agentBuilderKnowledgeIndicatorCreatedEventType,
  agentToolEventCreateEventType,
  agentToolEventSearchEventType,
  agentToolEventWriteEventType,
  agentToolKiIdentificationStartedEventType,
  detectionScanEventType,
  discoveryCompletedEventType,
  discoveryStartedEventType,
  discoveryTriggeredEventType,
  eventStatusChangedEventType,
  knowledgeIndicatorEventsGeneratedEventType,
  knowledgeIndicatorFeaturesIdentifiedEventType,
  onboardingScheduledEventType,
};
