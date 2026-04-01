/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SkillDefinition } from '@kbn/agent-builder-server/skills/type_definition';

import { buildSkillConfigurationOverrides } from '.';

const createMockSkill = (overrides: Partial<SkillDefinition> = {}): SkillDefinition => ({
  basePath: 'skills/security/attack-discovery' as never,
  content: 'Test skill content',
  description: 'Test skill description',
  id: 'test-skill',
  name: 'test-skill' as never,
  ...overrides,
});

describe('buildSkillConfigurationOverrides', () => {
  it('includes the skill content in instructions', async () => {
    const skill = createMockSkill({ content: 'Custom skill instructions' });

    const result = await buildSkillConfigurationOverrides(skill);

    expect(result.instructions).toContain('Custom skill instructions');
  });

  it('appends referenced content to instructions', async () => {
    const skill = createMockSkill({
      content: 'Main skill content',
      referencedContent: [
        {
          content: 'Reference content 1',
          name: 'ref-1',
          relativePath: '.',
        },
        {
          content: 'Reference content 2',
          name: 'ref-2',
          relativePath: './workflows',
        },
      ],
    });

    const result = await buildSkillConfigurationOverrides(skill);

    expect(result.instructions).toContain('Main skill content');
    expect(result.instructions).toContain('Referenced Content: ref-1');
    expect(result.instructions).toContain('Reference content 1');
    expect(result.instructions).toContain('Referenced Content: ref-2');
    expect(result.instructions).toContain('Reference content 2');
  });

  it('does not append referenced content section when referencedContent is empty', async () => {
    const skill = createMockSkill({
      content: 'Skill content only',
      referencedContent: [],
    });

    const result = await buildSkillConfigurationOverrides(skill);

    expect(result.instructions).toBe('Skill content only');
  });

  it('does not append referenced content section when referencedContent is undefined', async () => {
    const skill = createMockSkill({
      content: 'Skill content only',
      referencedContent: undefined,
    });

    const result = await buildSkillConfigurationOverrides(skill);

    expect(result.instructions).toBe('Skill content only');
  });

  it('includes allowed tools when getRegistryTools is defined', async () => {
    const skill = createMockSkill({
      getRegistryTools: () => ['platform.core.generate_esql', 'platform.core.execute_esql'],
    });

    const result = await buildSkillConfigurationOverrides(skill);

    expect(result.tools).toEqual([
      { tool_ids: ['platform.core.generate_esql', 'platform.core.execute_esql'] },
    ]);
  });

  it('does not include tools when getRegistryTools is undefined', async () => {
    const skill = createMockSkill({
      getRegistryTools: undefined,
    });

    const result = await buildSkillConfigurationOverrides(skill);

    expect(result.tools).toBeUndefined();
  });

  it('works with the alertRetrievalBuilderSkill', async () => {
    const { alertRetrievalBuilderSkill } = await import(
      '../../../../../skills/alert_retrieval_builder_skill'
    );

    const result = await buildSkillConfigurationOverrides(alertRetrievalBuilderSkill);

    expect(result.instructions).toContain('Attack Discovery Alerts ES|QL Query Builder');
    expect(result.instructions).toContain('example-esql-queries');
    expect(result.tools).toEqual([
      { tool_ids: ['platform.core.generate_esql', 'platform.core.execute_esql'] },
    ]);
  });
});
