/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import serviceMapDescription from './description.text';
import serviceMapContent from './skill.md.text';

const SERVICE_MAP_TOOL_IDS = ['observability.get_service_topology', 'observability.get_services'];

export const createServiceMapSkill = () =>
  defineSkillType({
    id: 'observability.service-map',
    name: 'service-map',
    basePath: 'skills/observability',
    description: serviceMapDescription,
    content: serviceMapContent,
    getRegistryTools: () => SERVICE_MAP_TOOL_IDS,
  });
