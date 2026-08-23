/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  type AttachmentUIDefinition,
  type AttachmentServiceStartContract,
} from '@kbn/agent-builder-browser/attachments';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { AiRuleCreationService } from '../../../detection_engine/common/ai_rule_creation_store';
import {
  UserPrivilegesContext,
  initialUserPrivilegesState,
  type UserPrivilegesState,
} from '../../../common/components/user_privileges/user_privileges_context';
import { extractRulesCapabilities } from '../../../common/utils/rules_capabilities';
import { SecurityAgentBuilderAttachments } from '../../../../common/constants';
import { RuleInlineContent } from './rule_inline_content';
import { buildRuleActionButtons } from './rule_action_buttons';
import {
  type RuleAttachment,
  getRuleName,
  getRuleIdFromAttachment,
  getRuleAttachmentIntent,
  parseRuleFromAttachment,
} from './helpers';

export const registerRuleAttachment = ({
  attachments,
  application,
  aiRuleCreation,
  uiSettings,
}: {
  attachments: AttachmentServiceStartContract;
  application: ApplicationStart;
  aiRuleCreation: AiRuleCreationService;
  uiSettings: IUiSettingsClient;
}): void => {
  attachments.addAttachmentType(
    SecurityAgentBuilderAttachments.rule,
    createRuleAttachmentDefinition({ application, aiRuleCreation, uiSettings })
  );
};

export const createRuleAttachmentDefinition = ({
  application,
  aiRuleCreation,
  uiSettings,
}: {
  application: ApplicationStart;
  aiRuleCreation: AiRuleCreationService;
  uiSettings: IUiSettingsClient;
}): AttachmentUIDefinition<RuleAttachment> => {
  // `RuleInlineContent` only reads `rulesPrivileges.rules.read`, so derive privileges once from the
  // already-loaded capabilities instead of mounting the fetching `UserPrivilegesProvider` per card
  // (which fired duplicate privilege requests for every rendered attachment).
  const privileges: UserPrivilegesState = {
    ...initialUserPrivilegesState(),
    rulesPrivileges: extractRulesCapabilities(application.capabilities),
  };

  return {
    getLabel: (attachment) =>
      getRuleName(attachment) ??
      i18n.translate('xpack.securitySolution.agentBuilder.ruleAttachment.label', {
        defaultMessage: 'Security Rule',
      }),
    getIcon: () => 'securityApp',
    renderInlineContent: (props) => (
      <UserPrivilegesContext.Provider value={privileges}>
        <RuleInlineContent {...props} aiRuleCreation={aiRuleCreation} />
      </UserPrivilegesContext.Provider>
    ),
    // Runs outside the render boundary, so a parse throw here would take down the whole card.
    getActionButtons: ({ attachment, updateOrigin }) => {
      try {
        const intent = getRuleAttachmentIntent(attachment);
        const ruleId = getRuleIdFromAttachment(attachment) ?? undefined;
        return buildRuleActionButtons({
          rule: parseRuleFromAttachment(attachment),
          aiRuleCreation,
          application,
          uiSettings,
          intent,
          ruleId,
          attachmentId: attachment.id,
          updateOrigin,
        });
      } catch (error) {
        window.console.warn(
          'RuleAttachment.getActionButtons: failed to build rule action buttons',
          error
        );
        return [];
      }
    },
  };
};
