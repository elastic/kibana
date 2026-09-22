/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import {
  SIGNIFICANT_EVENTS_EVENT_CREATE_TOOL_ID,
  SIGNIFICANT_EVENTS_EVENT_STATUS_UPDATE_TOOL_ID,
  SIGNIFICANT_EVENTS_SEARCH_EVENTS_TOOL_ID,
  SIGNIFICANT_EVENTS_KNOWLEDGE_INDICATORS_SEARCH_TOOL_ID,
} from '../../tools/register_tools';
import description from './description.text';
import content from './skill.md.text';

export const SIGNIFICANT_EVENTS_MANAGEMENT_SKILL_ID = 'significant-events-management' as const;

export const significantEventsManagementSkill = defineSkillType({
  id: SIGNIFICANT_EVENTS_MANAGEMENT_SKILL_ID,
  name: 'significant-events-management',
  basePath: 'skills/platform/streams',
  description,
  selectorInstructions:
    'Use to search, create, or update significant events in Streams — notable infrastructure occurrences tracked with lifecycle state. ' +
    'Also use when querying what the system has recorded about an infrastructure component, its event history, baseline behavior patterns, or normal operational state.',
  content,
  getRegistryTools: () => [
    SIGNIFICANT_EVENTS_EVENT_CREATE_TOOL_ID,
    SIGNIFICANT_EVENTS_EVENT_STATUS_UPDATE_TOOL_ID,
    SIGNIFICANT_EVENTS_SEARCH_EVENTS_TOOL_ID,
    SIGNIFICANT_EVENTS_KNOWLEDGE_INDICATORS_SEARCH_TOOL_ID,
  ],
});
