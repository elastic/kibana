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
import { useAgentBuilderAttachment } from '../../../../../agent_builder/hooks/use_agent_builder_attachment';
import { NewAgentBuilderAttachment } from '../../../../../agent_builder/components/new_agent_builder_attachment';
import type { AgentBuilderAddToChatTelemetry } from '../../../../../agent_builder/hooks/use_report_add_to_chat';
import { SecurityAgentBuilderAttachments } from '../../../../../../common/constants';
import { WithMissingPrivilegesTooltip } from '../../../../common/components/missing_privileges';

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
