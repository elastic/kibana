/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { RuleMigrationRule } from '../../../../../../common/siem_migrations/model/rule_migration.gen';
import type { RuleMigrationStats } from '../../../types';
import { useAgentBuilderAvailability } from '../../../../../agent_builder/hooks/use_agent_builder_availability';
import { useAgentBuilderAttachment } from '../../../../../agent_builder/hooks/use_agent_builder_attachment';
import { NewAgentBuilderAttachment } from '../../../../../agent_builder/components/new_agent_builder_attachment';
import type { AgentBuilderAddToChatTelemetry } from '../../../../../agent_builder/hooks/use_report_add_to_chat';
import { SecurityAgentBuilderAttachments } from '../../../../../../common/constants';
import { WithMissingPrivilegesTooltip } from '../../../../common/components/missing_privileges';
import { AddToChatPlaceholderButton } from '../../../../common/components/add_to_chat_placeholder_button';

const AGENT_MODE_REQUIRED_TOOLTIP = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.bulkAddToChatButton.agentModeRequiredTooltip',
  { defaultMessage: 'Switch to Agent mode to use Add to Chat' }
);

const AGENT_BUILDER_NO_PRIVILEGE_TOOLTIP = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.bulkAddToChatButton.noPrivilegeTooltip',
  { defaultMessage: "You don't have permission to use Agent Builder" }
);

interface AddRulesToChatButtonInnerProps {
  isAuthorized: boolean;
  migrationStats: RuleMigrationStats;
  selectedRules: RuleMigrationRule[];
}

const AddRulesToChatButtonInner: React.FC<AddRulesToChatButtonInnerProps> = ({
  isAuthorized,
  migrationStats,
  selectedRules,
}) => {
  const { hasAgentBuilderPrivilege, isAgentChatExperienceEnabled } = useAgentBuilderAvailability();

  const N = selectedRules.length;
  const migrationId = migrationStats.id;
  const vendor = selectedRules[0]?.original_rule?.vendor;

  const buttonLabel = i18n.translate(
    'xpack.securitySolution.siemMigrations.rules.bulkAddToChatButton.label',
    {
      defaultMessage: '{count, plural, =0 {Add to chat} other {Add to chat ({count})}}',
      values: { count: N },
    }
  );

  const attachmentLabel = vendor
    ? `[${vendor}] ${migrationStats.name} (${N > 0 ? `${N} rules` : 'all rules'})`
    : `${migrationStats.name} (${N > 0 ? `${N} rules` : 'all rules'})`;

  const attachmentPrompt =
    N > 0
      ? `I've attached ${N} Automatic migration rules. How can you help?`
      : `I've attached all rules in this Automatic migration. how can you help?`;

  const { openAgentBuilderFlyout } = useAgentBuilderAttachment({
    attachmentType: SecurityAgentBuilderAttachments.ruleMigrationItems,
    attachmentData: {
      migration_id: migrationId,
      rule_ids: selectedRules.map((r) => r.id),
      attachmentLabel,
    },
    attachmentId: `migration-${migrationId}`,
    attachmentPrompt,
    autoSendInitialMessage: true,
  });

  const telemetry = useMemo<AgentBuilderAddToChatTelemetry>(
    () => ({
      pathway: 'translated_rules_bulk',
      attachments: ['rule_migration_items'],
      item_count: N > 0 ? N : migrationStats.items.total,
    }),
    [N, migrationStats.items.total]
  );

  if (!isAgentChatExperienceEnabled) {
    return (
      <AddToChatPlaceholderButton
        label={buttonLabel}
        tooltipContent={AGENT_MODE_REQUIRED_TOOLTIP}
      />
    );
  }

  if (!hasAgentBuilderPrivilege) {
    return (
      <AddToChatPlaceholderButton
        label={buttonLabel}
        tooltipContent={AGENT_BUILDER_NO_PRIVILEGE_TOOLTIP}
      />
    );
  }

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
  AddRulesToChatButtonInner,
  'rule',
  'minimum'
);
