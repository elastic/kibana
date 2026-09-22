/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  AttachmentRenderProps,
  AttachmentServiceStartContract,
  AttachmentUIDefinition,
} from '@kbn/agent-builder-browser/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';

import { SecurityAgentBuilderAttachments } from '../../../../common/constants';
import { AttackDiscoveryMarkdownFormatter } from '../../../attack_discovery/pages/results/attack_discovery_markdown_formatter';

/**
 * Conversation-scoped so field-pill flyouts opened from an Investigation do not
 * collide with the Attacks table (`TableId.alertsOnAttacksPage`).
 */
export const ATTACK_DISCOVERY_INLINE_SCOPE_ID = 'agent-builder-investigation-attack-discovery';

export const ATTACK_DISCOVERY_INLINE_CONTENT_TEST_ID = 'attackDiscoveryInlineContent';
export const ATTACK_DISCOVERY_INLINE_SUMMARY_TEST_ID = 'attackDiscoveryInlineSummary';
export const ATTACK_DISCOVERY_INLINE_DETAILS_TEST_ID = 'attackDiscoveryInlineDetails';

/**
 * Resolved Attack Discovery attachment payload. Matches the discoveries server
 * projection (`attackDiscoveryAttachmentDataSchema`); duplicated here so this
 * plugin does not import discoveries.
 */
export interface AttackDiscoveryAttachmentData {
  alert_ids?: string[];
  details_markdown?: string;
  id?: string;
  summary_markdown?: string;
  title?: string;
}

export type AttackDiscoveryAttachment = Attachment<
  typeof SecurityAgentBuilderAttachments.attackDiscovery,
  AttackDiscoveryAttachmentData
>;

const DEFAULT_LABEL = i18n.translate(
  'xpack.securitySolution.agentBuilder.attackDiscoveryAttachment.label',
  {
    defaultMessage: 'Attack Discovery',
  }
);

const DETAILS_TITLE = i18n.translate(
  'xpack.securitySolution.agentBuilder.attackDiscoveryAttachment.detailsTitle',
  {
    defaultMessage: 'Details',
  }
);

export const AttackDiscoveryInlineContent = ({
  attachment,
}: AttachmentRenderProps<AttackDiscoveryAttachment>) => {
  const alertIds = attachment.data?.alert_ids;
  const detailsMarkdown = attachment.data?.details_markdown ?? '';
  const summaryMarkdown = attachment.data?.summary_markdown ?? '';

  return (
    <div data-test-subj={ATTACK_DISCOVERY_INLINE_CONTENT_TEST_ID}>
      <div data-test-subj={ATTACK_DISCOVERY_INLINE_SUMMARY_TEST_ID}>
        <AttackDiscoveryMarkdownFormatter
          alertIds={alertIds}
          disableActions={false}
          markdown={summaryMarkdown}
          scopeId={ATTACK_DISCOVERY_INLINE_SCOPE_ID}
        />
      </div>
      <EuiSpacer size="s" />
      <EuiTitle size="xs">
        <h2>{DETAILS_TITLE}</h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <div data-test-subj={ATTACK_DISCOVERY_INLINE_DETAILS_TEST_ID}>
        <AttackDiscoveryMarkdownFormatter
          alertIds={alertIds}
          disableActions={false}
          markdown={detailsMarkdown}
          scopeId={ATTACK_DISCOVERY_INLINE_SCOPE_ID}
        />
      </div>
    </div>
  );
};

export const createAttackDiscoveryAttachmentDefinition =
  (): AttachmentUIDefinition<AttackDiscoveryAttachment> => ({
    getIcon: () => 'sparkles',
    getLabel: (attachment) => attachment.data?.title ?? DEFAULT_LABEL,
    renderInlineContent: (props) => <AttackDiscoveryInlineContent {...props} />,
  });

export const registerAttackDiscoveryAttachment = ({
  attachments,
}: {
  attachments: AttachmentServiceStartContract;
}): void => {
  attachments.addAttachmentType(
    SecurityAgentBuilderAttachments.attackDiscovery,
    createAttackDiscoveryAttachmentDefinition()
  );
};
