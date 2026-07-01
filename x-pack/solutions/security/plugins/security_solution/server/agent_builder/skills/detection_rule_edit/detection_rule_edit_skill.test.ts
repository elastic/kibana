/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isAllowedBuiltinSkill } from '@kbn/agent-builder-server/allow_lists';
import { getDetectionRuleEditSkill } from '.';

describe('detectionRuleEditSkill', () => {
  const skill = getDetectionRuleEditSkill();

  it('has stable metadata', () => {
    expect(skill.id).toBe('detection-rule-edit');
    expect(skill.name).toBe('detection-rule-edit');
    expect(skill.basePath).toBe('skills/security/rules');
  });

  it('uses an allow-listed built-in skill id', () => {
    expect(isAllowedBuiltinSkill(skill.id)).toBe(true);
  });

  it('description excludes read-only rule inventory (routes to find-security-rules)', () => {
    expect(skill.description).toMatch(/find-security-rules/i);
    expect(skill.description).toMatch(/list.*count.*filter/i);
    expect(skill.description).not.toMatch(/Use when the user asks to list/i);
  });

  it('content redirects MITRE list/inventory questions to find-security-rules', () => {
    expect(skill.content).toMatch(/When NOT to Use/i);
    expect(skill.content).toMatch(/find-security-rules/);
    expect(skill.content).toMatch(/List all enabled detection rules tagged with MITRE/);
  });

  it('description stays under 1024 characters', () => {
    expect(skill.description.length).toBeLessThanOrEqual(1024);
  });
});
