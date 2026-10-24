/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { RUM_UX_SKILL_IDS, RUM_UX_TOOL_IDS } from '../../../../common/rum_agent';
import rumSlowPagesDescription from './description.text';
import rumSlowPagesContent from './skill.md.text';

export const createRumSlowPagesSkill = () =>
  defineSkillType({
    id: RUM_UX_SKILL_IDS.slowPages,
    name: 'rum-slow-pages',
    basePath: 'skills/observability',
    description: rumSlowPagesDescription,
    content: rumSlowPagesContent,
    getRegistryTools: () => [RUM_UX_TOOL_IDS.getPages, RUM_UX_TOOL_IDS.getOverview],
    excludeFromElasticCapabilities: true,
  });
