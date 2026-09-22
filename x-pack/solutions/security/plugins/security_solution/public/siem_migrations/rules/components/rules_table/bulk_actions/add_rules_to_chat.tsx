/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiToolTip } from '@elastic/eui';
import { AiButton } from '@kbn/shared-ux-ai-components';
import { i18n } from '@kbn/i18n';
import type { RuleMigrationRule } from '../../../../../../common/siem_migrations/model/rule_migration.gen';
import type { RuleMigrationStats } from '../../../types';
import { useAgentBuilderAvailability } from '../../../../../agent_builder/hooks/use_agent_builder_availability';
import { useAgentBuilderAttachment } from '../../../../../agent_builder/hooks/use_agent_builder_attachment';
import { useReportAddToChat } from '../../../../../agent_builder/hooks/use_report_add_to_chat';
import { SecurityAgentBuilderAttachments } from '../../../../../../common/constants';
import { WithMissingPrivilegesTooltip } from '../../../../common/components/missing_privileges';

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
  const reportAddToChat = useReportAddToChat();

  const N = selectedRules.length;
  const migrationId = migrationStats.id;
  const vendor = selectedRules[0]?.original_rule?.vendor;

  const buttonLabel =
    N > 0
      ? i18n.translate(
        'xpack.securitySolution.siemMigrations.rules.bulkAddToChatButton.labelWithCount',
        { defaultMessage: 'Add to chat ({count})', values: { count: N } }
      )
      : i18n.translate('xpack.securitySolution.siemMigrations.rules.bulkAddToChatButton.label', {
        defaultMessage: 'Add to chat',
      });

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

  const handleClick = () => {
    reportAddToChat({
      pathway: 'translated_rules_bulk',
      attachments: ['rule_migration_items'],
      item_count: N > 0 ? N : migrationStats.items.total,
    });
    openAgentBuilderFlyout();
  };

  if (!isAgentChatExperienceEnabled) {
    return (
      <EuiToolTip content={AGENT_MODE_REQUIRED_TOOLTIP}>
        <AiButton variant="empty" iconType="productAgent" isDisabled>
          {buttonLabel}
        </AiButton>
      </EuiToolTip>
    );
  }

  if (!hasAgentBuilderPrivilege) {
    return (
      <EuiToolTip content={AGENT_BUILDER_NO_PRIVILEGE_TOOLTIP}>
        <AiButton variant="empty" iconType="productAgent" isDisabled>
          {buttonLabel}
        </AiButton>
      </EuiToolTip>
    );
  }

  return (
    <AiButton
      variant="empty"
      iconType="productAgent"
      onClick={handleClick}
      isDisabled={!isAuthorized}
    >
      {buttonLabel}
    </AiButton>
  );
};

export const AddRulesToChatButton = WithMissingPrivilegesTooltip(
  AddRulesToChatButtonInner,
  'rule',
  'minimum'
);
