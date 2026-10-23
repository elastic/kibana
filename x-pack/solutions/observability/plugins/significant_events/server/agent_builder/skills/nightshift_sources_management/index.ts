/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import {
  NIGHTSHIFT_SOURCE_CREATE_TOOL_ID,
  NIGHTSHIFT_SOURCE_DELETE_TOOL_ID,
  NIGHTSHIFT_SOURCE_GET_TOOL_ID,
  NIGHTSHIFT_SOURCE_LIST_TOOL_ID,
  NIGHTSHIFT_SOURCE_UPDATE_TOOL_ID,
} from '../../tools/tool_ids';
import description from './description.text';
import content from './skill.md.text';

export const NIGHTSHIFT_SOURCES_MANAGEMENT_SKILL_ID = 'nightshift-sources-management' as const;

export const nightshiftSourcesManagementSkill = defineSkillType({
  id: NIGHTSHIFT_SOURCES_MANAGEMENT_SKILL_ID,
  name: 'nightshift-sources-management',
  basePath: 'skills/observability/nightshift',
  description,
  content,
  getRegistryTools: () => [
    NIGHTSHIFT_SOURCE_LIST_TOOL_ID,
    NIGHTSHIFT_SOURCE_GET_TOOL_ID,
    NIGHTSHIFT_SOURCE_CREATE_TOOL_ID,
    NIGHTSHIFT_SOURCE_UPDATE_TOOL_ID,
    NIGHTSHIFT_SOURCE_DELETE_TOOL_ID,
  ],
});
