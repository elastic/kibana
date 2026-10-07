/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiToolTip } from '@elastic/eui';
import type { RuleMigrationRule } from '../../../../../common/siem_migrations/model/rule_migration.gen';
import { SecurityAgentBuilderAttachments } from '../../../../../common/constants';
import { NewAgentBuilderAttachment } from '../../../../agent_builder/components/new_agent_builder_attachment';
import type { AgentBuilderAddToChatTelemetry } from '../../../../agent_builder/hooks/use_report_add_to_chat';
import { useAgentBuilderAttachment } from '../../../../agent_builder/hooks/use_agent_builder_attachment';
import { WithMissingPrivilegesTooltip } from '../../../common/components/missing_privileges';
import { ADD_TO_CHAT_PROMPT } from './translations';
import { useKibana } from '../../../../common/lib/kibana';
import {
  REQUIRED_UI_SETTING_IDS,
  RequiredUiSettingsTooltipContent,
} from '../../../common/components/required_ui_settings';

const ADD_TO_CHAT_TELEMETRY: AgentBuilderAddToChatTelemetry = {
  pathway: 'translated_rules_flyout',
  attachments: ['rule_migration_items'],
};

const TOOLTIP_ANCHOR_PROPS = {
  style: { width: 'fit-content' },
  'data-test-subj': 'requiredAgentBuilderSettingsTooltipAnchor',
};

interface AddMigrationRuleToChatButtonProps {
  isAuthorized: boolean;
  rule: RuleMigrationRule;
}

const AddMigrationRuleToChatButtonComponent: React.FC<AddMigrationRuleToChatButtonProps> = ({
  isAuthorized,
  rule,
}) => {
  const attachment = useMemo(
    () => ({
      attachmentType: SecurityAgentBuilderAttachments.ruleMigrationItems,
      attachmentData: {
        migration_id: rule.migration_id,
        rule_ids: [rule.id],
        attachmentLabel: `[${rule.original_rule.vendor}] ${rule.original_rule.title}`,
      },
      attachmentId: rule.id,
      attachmentPrompt: ADD_TO_CHAT_PROMPT(rule.original_rule.title),
      autoSendInitialMessage: true,
    }),
    [rule]
  );
  const { openAgentBuilderFlyout } = useAgentBuilderAttachment(attachment);

  const {
    services: { uiSettings },
  } = useKibana();

  const disabledSettings = useMemo(
    () =>
      REQUIRED_UI_SETTING_IDS.filter(
        (id) => !uiSettings.isDeclared(id) || uiSettings.get<boolean>(id, false) !== true
      ).map((id) => uiSettings.getAll()[id]?.name ?? id),
    [uiSettings]
  );

  const button = (
    <NewAgentBuilderAttachment
      onClick={openAgentBuilderFlyout}
      disabled={!isAuthorized || disabledSettings.length > 0}
      telemetry={ADD_TO_CHAT_TELEMETRY}
    />
  );

  if (disabledSettings.length === 0) {
    return button;
  }

  return (
    <EuiToolTip
      data-test-subj="requiredAgentBuilderSettingsTooltip"
      anchorProps={TOOLTIP_ANCHOR_PROPS}
      content={<RequiredUiSettingsTooltipContent settingNames={disabledSettings} />}
    >
      {button}
    </EuiToolTip>
  );
};

export const AddMigrationRuleToChatButton = WithMissingPrivilegesTooltip(
  AddMigrationRuleToChatButtonComponent,
  'rule',
  'minimum'
);
