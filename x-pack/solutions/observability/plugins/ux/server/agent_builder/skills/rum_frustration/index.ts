/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { RUM_UX_SKILL_IDS, RUM_UX_TOOL_IDS } from '../../../../common/rum_agent';
import rumFrustrationDescription from './description.text';
import rumFrustrationContent from './skill.md.text';

export const createRumFrustrationSkill = () =>
  defineSkillType({
    id: RUM_UX_SKILL_IDS.frustration,
    name: 'rum-frustration',
    basePath: 'skills/observability',
    description: rumFrustrationDescription,
    content: rumFrustrationContent,
    getRegistryTools: () => [RUM_UX_TOOL_IDS.getOverview, RUM_UX_TOOL_IDS.findSessions],
    excludeFromElasticCapabilities: true,
  });
