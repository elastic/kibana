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
import { SecurityAgentBuilderAttachments } from '../../../../common/constants';
import { RuleInlineContent } from './rule_inline_content';
import { type RuleAttachment, getRuleName } from './helpers';

export { isOnRuleFormPage } from './helpers';

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
}): AttachmentUIDefinition<RuleAttachment> => ({
  getLabel: (attachment) =>
    getRuleName(attachment) ??
    i18n.translate('xpack.securitySolution.agentBuilder.ruleAttachment.label', {
      defaultMessage: 'Security Rule',
    }),
  getIcon: () => 'securityApp',
  renderInlineContent: (props, callbacks) => (
    <RuleInlineContent
      {...props}
      aiRuleCreation={aiRuleCreation}
      application={application}
      uiSettings={uiSettings}
      callbacks={callbacks}
    />
  ),
  // All action buttons are registered dynamically from RuleInlineContent so they respect
  // the per-card "is current attachment" check and the "agent is busy" state. Returning
  // static buttons here would bypass those gates and cause buttons to appear on stale cards.
});
