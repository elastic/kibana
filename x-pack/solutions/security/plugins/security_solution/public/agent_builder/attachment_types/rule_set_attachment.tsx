/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, lazy } from 'react';
import { EuiSkeletonText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  AttachmentServiceStartContract,
  AttachmentUIDefinition,
} from '@kbn/agent-builder-browser';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { ApplicationStart, HttpStart } from '@kbn/core/public';
import { RULES_UI_EDIT_PRIVILEGE } from '@kbn/security-solution-features/constants';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';
import { hasCapabilities } from '../../common/lib/capabilities';
import type { RuleSetSuggestion } from './rule_set_card';

type RuleSetAttachment = Attachment<string, RuleSetSuggestion & { attachmentLabel?: string }>;

// The card is loaded only when a conversation shows a suggestion, not with the plugin.
const RuleSetCard = lazy(() =>
  import('./rule_set_card').then(({ RuleSetCard: Card }) => ({ default: Card }))
);

const LABEL = i18n.translate('xpack.securitySolution.agentBuilder.ruleSetAttachment.label', {
  defaultMessage: 'Suggested rule set',
});

export const registerRuleSetAttachment = ({
  attachments,
  application,
  http,
}: {
  attachments: AttachmentServiceStartContract;
  application: ApplicationStart;
  http: HttpStart;
}): void => {
  const definition: AttachmentUIDefinition<RuleSetAttachment> = {
    getLabel: (attachment) => attachment.data?.name ?? LABEL,
    getIcon: () => 'folder',
    renderInlineContent: ({ attachment }) =>
      attachment.data?.conditions ? (
        <Suspense fallback={<EuiSkeletonText lines={3} />}>
          <RuleSetCard
            suggestion={attachment.data}
            http={http}
            application={application}
            canEditRules={hasCapabilities(application.capabilities, RULES_UI_EDIT_PRIVILEGE)}
          />
        </Suspense>
      ) : null,
  };
  attachments.addAttachmentType(SecurityAgentBuilderAttachments.ruleSet, definition);
};
