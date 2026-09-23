/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import type { Logger } from '@kbn/core/server';
import type { GetScopedClients } from '../../../routes/types';
import { createGetFeaturesTool } from './get_features/tool';
import { createValidateQueriesTool } from './validate_queries/tool';
import description from './description.text';
import content from './skill.md.text';

export const KI_QUERY_GENERATION_SKILL_ID = 'ki-query-generation' as const;

interface KiQueryGenerationSkillOptions {
  getScopedClients: GetScopedClients;
  logger: Logger;
}

export const createKIQueryGenerationSkill = ({
  getScopedClients,
  logger,
}: KiQueryGenerationSkillOptions) =>
  defineSkillType({
    id: KI_QUERY_GENERATION_SKILL_ID,
    name: 'ki-query-generation',
    basePath: 'skills/platform/streams',
    experimental: true,
    excludeFromElasticCapabilities: true,
    description,
    content,
    getInlineTools: (): BuiltinSkillBoundedTool[] => [
      createGetFeaturesTool({
        getScopedClients,
        logger: logger.get('ki_features_get_tool'),
      }),
      createValidateQueriesTool({
        getScopedClients,
        logger: logger.get('ki_queries_validate_tool'),
      }),
    ],
  });
