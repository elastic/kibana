/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { platformCoreTools } from '@kbn/agent-builder-common';
import { ALERTING_V2_TOOL_IDS } from '../../tools/alerting_v2_tool_ids';
import description from './description.text';
import content from './skill.md.text';

const EPISODE_VISUALIZATION_TOOL_IDS = [
  ...ALERTING_V2_TOOL_IDS,
  platformCoreTools.getIndexMapping,
  platformCoreTools.createVisualization,
  platformCoreTools.executeEsql,
  platformCoreTools.generateEsql,
];

export const createEpisodeVisualizationSkill = () =>
  defineSkillType({
    id: 'observability.episode-visualization',
    name: 'episode-visualization',
    basePath: 'skills/observability',
    description,
    content,
    getRegistryTools: () => EPISODE_VISUALIZATION_TOOL_IDS,
    experimental: true,
  });
