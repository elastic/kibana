/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { OBSERVABILITY_TOOL_IDS } from '../../tools/register_tools';
import investigationSkillDescription from './description.text';
import investigationSkillContent from './skill.md.text';

export const createInvestigationSkill = () =>
  defineSkillType({
    id: 'observability.investigation',
    name: 'investigation',
    basePath: 'skills/observability',
    description: investigationSkillDescription,
    content: investigationSkillContent,
    getRegistryTools: () => OBSERVABILITY_TOOL_IDS,
    experimental: false,
  });
