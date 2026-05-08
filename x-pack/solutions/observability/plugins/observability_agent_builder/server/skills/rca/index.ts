/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { platformCoreTools, platformStreamsSigEventsTools } from '@kbn/agent-builder-common';
import { OBSERVABILITY_GET_LOGS_TOOL_ID } from '../../tools/get_logs/constants';
import { OBSERVABILITY_GET_INDEX_INFO_TOOL_ID } from '../../tools/get_index_info/tool';
import { OBSERVABILITY_RUN_LOG_RATE_ANALYSIS_TOOL_ID } from '../../tools/run_log_rate_analysis/tool';
import rcaSkillDescription from './description.text';
import rcaSkillContent from './skill.md.text';

const RCA_TOOL_IDS = [
  platformStreamsSigEventsTools.searchKnowledgeIndicators,
  platformCoreTools.executeEsql,
  platformCoreTools.generateEsql,
  OBSERVABILITY_GET_LOGS_TOOL_ID,
  OBSERVABILITY_RUN_LOG_RATE_ANALYSIS_TOOL_ID,
  OBSERVABILITY_GET_INDEX_INFO_TOOL_ID,
];

export const createRcaSkill = () =>
  defineSkillType({
    id: 'observability.rca',
    name: 'rca',
    basePath: 'skills/observability',
    description: rcaSkillDescription,
    content: rcaSkillContent,
    getRegistryTools: () => RCA_TOOL_IDS,
    experimental: true,
  });
