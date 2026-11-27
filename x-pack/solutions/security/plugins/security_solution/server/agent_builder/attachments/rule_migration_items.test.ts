/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RULE_MIGRATION_SKILLS } from '../skills/siem_migration/rules/skill_catalog';
import { createRuleMigrationItemsAttachmentType } from './rule_migration_items';

describe('createRuleMigrationItemsAttachmentType', () => {
  it('should describe every Automatic Rule Migration skill to the agent', () => {
    const agentDescription = createRuleMigrationItemsAttachmentType().getAgentDescription!();

    for (const { id, description } of Object.values(RULE_MIGRATION_SKILLS)) {
      expect(agentDescription).toContain(`- **${id}**`);
      for (const line of description.split('\n').filter(Boolean)) {
        expect(agentDescription).toContain(line);
      }
    }
  });
});
