/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Stub: real implementation lands in PR8 (Skills). FF-off safe.
import { ToolType } from '@kbn/agent-builder-common';
import type { SkillBoundedTool } from '@kbn/agent-builder-server/skills';

export const GET_DEFAULT_ESQL_QUERY_TOOL_ID =
  'security.attack-discovery.default_esql_query' as const;

export const getDefaultEsqlQueryTool = (): SkillBoundedTool =>
  ({ id: GET_DEFAULT_ESQL_QUERY_TOOL_ID, type: ToolType.builtin } as unknown as SkillBoundedTool);
