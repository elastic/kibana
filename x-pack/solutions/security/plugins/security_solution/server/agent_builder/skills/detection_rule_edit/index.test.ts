/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateSkillDefinition } from '@kbn/agent-builder-server/skills/type_definition';
import { getDetectionRuleEditSkill } from '.';

describe('detection-rule-edit', () => {
  describe.each([true, false])('with rulePreviewEnabled=%s', (rulePreviewEnabled) => {
    const skill = getDetectionRuleEditSkill({ rulePreviewEnabled });

    it('validates as a skill definition', async () => {
      await expect(validateSkillDefinition(skill)).resolves.toBeDefined();
    });

    it('has a description within the 1024 char limit', () => {
      expect(skill.description.length).toBeLessThanOrEqual(1024);
    });
  });

  // Gap statements must have a single owner in skill descriptions, or the skill router splits them.
  describe('gap statements', () => {
    const skill = getDetectionRuleEditSkill({ rulePreviewEnabled: false });

    it('hands gap statements to detection-coverage in its description', () => {
      expect(skill.description).toMatch(/NOT for gap statements.*detection-coverage/s);
    });

    it('lists gap statements under "Do NOT use this skill"', () => {
      expect(skill.content).toMatch(/States a gap and wants it closed.*detection-coverage/s);
    });
  });
});
