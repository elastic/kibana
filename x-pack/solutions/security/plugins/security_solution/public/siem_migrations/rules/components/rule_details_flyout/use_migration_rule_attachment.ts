/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { RuleMigrationRule } from '../../../../../common/siem_migrations/model/rule_migration.gen';
import { SIEM_MIGRATION_RULE_ATTACHMENT_TYPE_ID } from '../../../../../common/constants';
import { useAgentBuilderAttachment } from '../../../../agent_builder/hooks/use_agent_builder_attachment';

export interface UseMigrationRuleAttachmentResult {
  /**
   * Function to open the agent builder flyout with migration rule attachment
   */
  openAgentBuilderFlyout: () => void;
}

/**
 * Hook to handle SIEM migration rule attachment functionality.
 * Opens a conversation flyout with the migration rule attachment and prompts the user
 * about what they want to do with the rule.
 */
export const useMigrationRuleAttachment = (
  migrationRule: RuleMigrationRule
): UseMigrationRuleAttachmentResult => {
  const attachmentData = useMemo(
    () => ({
      migration_id: migrationRule.migration_id,
      rule_id: migrationRule.id,
      attachmentLabel: `Migration Rule: ${migrationRule.original_rule.title}`,
    }),
    [migrationRule]
  );

  const attachmentPrompt = useMemo(
    () =>
      "I've attached a SIEM migration rule. What would you like to do with it?\n\n" +
      'For example:\n' +
      '- Help me understand the translation\n' +
      '- Explain the differences between the original and translated query\n' +
      '- Suggest improvements to the ES|QL query\n' +
      '- Help me modify the rule',
    []
  );

  const { openAgentBuilderFlyout } = useAgentBuilderAttachment({
    attachmentType: SIEM_MIGRATION_RULE_ATTACHMENT_TYPE_ID,
    attachmentData,
    attachmentPrompt,
  });

  return {
    openAgentBuilderFlyout,
  };
};
