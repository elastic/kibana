/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { RUM_UX_SKILL_IDS, RUM_UX_TOOL_IDS } from '../../../../common/rum_agent';
import rumSlowUsersDescription from './description.text';
import rumSlowUsersContent from './skill.md.text';

export const createRumSlowUsersSkill = () =>
  defineSkillType({
    id: RUM_UX_SKILL_IDS.slowUsers,
    name: 'rum-slow-users',
    basePath: 'skills/observability',
    description: rumSlowUsersDescription,
    content: rumSlowUsersContent,
    getRegistryTools: () => [RUM_UX_TOOL_IDS.findSessions, RUM_UX_TOOL_IDS.getOverview],
    excludeFromElasticCapabilities: true,
  });
