/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { RuleMigrationRule } from '../../../../../common/siem_migrations/model/rule_migration.gen';
import { NewAgentBuilderAttachment } from '../../../../agent_builder/components/new_agent_builder_attachment';
import type { AgentBuilderAddToChatTelemetry } from '../../../../agent_builder/hooks/use_report_add_to_chat';
import { useAgentBuilderAvailability } from '../../../../agent_builder/hooks/use_agent_builder_availability';
import { WithMissingPrivilegesTooltip } from '../../../common/components/missing_privileges';
import { AddToChatPlaceholderButton } from '../../../common/components/add_to_chat_placeholder_button';
import { useMigrationRuleAttachment } from './use_migration_rule_attachment';

const ADD_TO_CHAT_LABEL = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.addToChatButton.label',
  { defaultMessage: 'Add to chat' }
);

const AGENT_MODE_REQUIRED_TOOLTIP = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.addToChatButton.agentModeRequiredTooltip',
  { defaultMessage: 'Switch to Agent mode to use Add to Chat' }
);

const AGENT_BUILDER_NO_PRIVILEGE_TOOLTIP = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.addToChatButton.noPrivilegeTooltip',
  { defaultMessage: "You don't have permission to use Agent Builder" }
);

const ADD_TO_CHAT_TELEMETRY: AgentBuilderAddToChatTelemetry = {
  pathway: 'translated_rules_flyout',
  attachments: ['rule_migration_items'],
};

interface AddMigrationRuleToChatButtonInnerProps {
  isAuthorized: boolean;
  rule: RuleMigrationRule;
}

const AddMigrationRuleToChatButtonInner: React.FC<AddMigrationRuleToChatButtonInnerProps> = ({
  isAuthorized,
  rule,
}) => {
  const { hasAgentBuilderPrivilege, isAgentChatExperienceEnabled } = useAgentBuilderAvailability();
  const { openAgentBuilderFlyout } = useMigrationRuleAttachment(rule);

  if (!isAgentChatExperienceEnabled) {
    return (
      <AddToChatPlaceholderButton
        label={ADD_TO_CHAT_LABEL}
        tooltipContent={AGENT_MODE_REQUIRED_TOOLTIP}
      />
    );
  }

  if (!hasAgentBuilderPrivilege) {
    return (
      <AddToChatPlaceholderButton
        label={ADD_TO_CHAT_LABEL}
        tooltipContent={AGENT_BUILDER_NO_PRIVILEGE_TOOLTIP}
      />
    );
  }

  return (
    <NewAgentBuilderAttachment
      onClick={openAgentBuilderFlyout}
      disabled={!isAuthorized}
      telemetry={ADD_TO_CHAT_TELEMETRY}
    />
  );
};

export const AddMigrationRuleToChatButton = WithMissingPrivilegesTooltip(
  AddMigrationRuleToChatButtonInner,
  'rule',
  'minimum'
);
