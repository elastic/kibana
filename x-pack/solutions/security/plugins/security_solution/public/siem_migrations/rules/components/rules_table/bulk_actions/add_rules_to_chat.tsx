/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { RuleMigrationRule } from '../../../../../../common/siem_migrations/model/rule_migration.gen';
import type { RuleMigrationStats } from '../../../types';
import { useAgentBuilderAttachment } from '../../../../../agent_builder/hooks/use_agent_builder_attachment';
import { NewAgentBuilderAttachment } from '../../../../../agent_builder/components/new_agent_builder_attachment';
import type { AgentBuilderAddToChatTelemetry } from '../../../../../agent_builder/hooks/use_report_add_to_chat';
import { SecurityAgentBuilderAttachments } from '../../../../../../common/constants';
import { WithMissingPrivilegesTooltip } from '../../../../common/components/missing_privileges';
import {
  ADD_TO_CHAT_BUTTON_LABEL,
  ADD_TO_CHAT_ATTACHMENT_LABEL,
  ADD_TO_CHAT_PROMPT_WITH_SELECTION,
  ADD_TO_CHAT_PROMPT_ALL_RULES,
} from './translations';

interface AddRulesToChatButtonProps {
  isAuthorized: boolean;
  migrationStats: RuleMigrationStats;
  selectedRules: RuleMigrationRule[];
}

const AddRulesToChatButtonComponent: React.FC<AddRulesToChatButtonProps> = ({
  isAuthorized,
  migrationStats,
  selectedRules,
}) => {
  const selectedCount = selectedRules.length;
  const migrationId = migrationStats.id;
  const vendor = selectedRules[0]?.original_rule?.vendor ?? migrationStats.vendor;

  const buttonLabel = ADD_TO_CHAT_BUTTON_LABEL(selectedCount);

  const countLabel = ADD_TO_CHAT_ATTACHMENT_LABEL(selectedCount);
  const attachmentLabel = `[${vendor}] ${migrationStats.name} (${countLabel})`;

  const attachmentPrompt =
    selectedCount > 0
      ? ADD_TO_CHAT_PROMPT_WITH_SELECTION(selectedCount)
      : ADD_TO_CHAT_PROMPT_ALL_RULES;

  const attachmentConfig = useMemo(
    () => ({
      attachmentType: SecurityAgentBuilderAttachments.ruleMigrationItems,
      attachmentData: {
        migration_id: migrationId,
        rule_ids: selectedRules.map((r) => r.id),
        attachmentLabel,
      },
      attachmentId: `migration-${migrationId}`,
      attachmentPrompt,
      autoSendInitialMessage: true as const,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [migrationId, selectedRules, attachmentLabel, attachmentPrompt]
  );

  const { openAgentBuilderFlyout } = useAgentBuilderAttachment(attachmentConfig);

  const telemetry = useMemo<AgentBuilderAddToChatTelemetry>(
    () => ({
      pathway: 'translated_rules_bulk',
      attachments: ['rule_migration_items'],
      item_count: selectedCount > 0 ? selectedCount : migrationStats.items.total,
    }),
    [selectedCount, migrationStats.items.total]
  );

  return (
    <NewAgentBuilderAttachment
      label={buttonLabel}
      onClick={openAgentBuilderFlyout}
      disabled={!isAuthorized}
      telemetry={telemetry}
    />
  );
};

export const AddRulesToChatButton = WithMissingPrivilegesTooltip(
  AddRulesToChatButtonComponent,
  'rule',
  'minimum'
);
