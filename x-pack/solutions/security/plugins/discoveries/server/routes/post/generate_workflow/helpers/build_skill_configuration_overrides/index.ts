/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentConfigurationOverrides, ToolSelection } from '@kbn/agent-builder-common';
import type { SkillDefinition } from '@kbn/agent-builder-server/skills/type_definition';

/**
 * Builds AgentConfigurationOverrides from a skill definition, combining the
 * skill's content and referenced content into `instructions`, and the skill's
 * registry tools into `tools`.
 *
 * This ensures the agent receives the skill's guidance as system-level
 * instructions rather than user-level messages, which produces significantly
 * better results.
 */
export const buildSkillConfigurationOverrides = async (
  skill: SkillDefinition
): Promise<AgentConfigurationOverrides> => {
  const referencedParts =
    skill.referencedContent != null && skill.referencedContent.length > 0
      ? skill.referencedContent.map(
          (ref) => `\n## Referenced Content: ${ref.name}\n\n${ref.content}`
        )
      : [];

  const instructionParts = [skill.content, ...referencedParts];

  const tools: ToolSelection[] | undefined =
    skill.getRegistryTools != null ? [{ tool_ids: await skill.getRegistryTools() }] : undefined;

  return {
    instructions: instructionParts.join('\n'),
    ...(tools != null && { tools }),
  };
};
