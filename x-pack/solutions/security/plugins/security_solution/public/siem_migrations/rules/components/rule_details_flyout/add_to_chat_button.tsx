/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { RuleMigrationRule } from '../../../../../common/siem_migrations/model/rule_migration.gen';
import { NewAgentBuilderAttachment } from '../../../../agent_builder/components/new_agent_builder_attachment';
import type { AgentBuilderAddToChatTelemetry } from '../../../../agent_builder/hooks/use_report_add_to_chat';
import { WithMissingPrivilegesTooltip } from '../../../common/components/missing_privileges';
import { useMigrationRuleAttachment } from './use_migration_rule_attachment';

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
  const { openAgentBuilderFlyout } = useMigrationRuleAttachment(rule);

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
