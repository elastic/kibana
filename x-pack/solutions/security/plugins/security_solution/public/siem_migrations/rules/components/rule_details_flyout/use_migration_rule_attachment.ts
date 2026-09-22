/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleMigrationRule } from '../../../../../common/siem_migrations/model/rule_migration.gen';
import { SecurityAgentBuilderAttachments } from '../../../../../common/constants';
import { useAgentBuilderAttachment } from '../../../../agent_builder/hooks/use_agent_builder_attachment';

export function useMigrationRuleAttachment(rule: RuleMigrationRule) {
  return useAgentBuilderAttachment({
    attachmentType: SecurityAgentBuilderAttachments.ruleMigrationItems,
    attachmentData: {
      migration_id: rule.migration_id,
      rule_ids: [rule.id],
      attachmentLabel: `[${rule.original_rule.vendor}] ${rule.original_rule.title}`,
    },
    attachmentId: rule.id,
    attachmentPrompt: `Please help me with this Automatic migration rule: ${rule.original_rule.title}`,
    autoSendInitialMessage: true,
  });
}
