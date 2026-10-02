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
import {
  replaceAnonymizedValuesWithOriginalValues,
  type Replacements,
} from '@kbn/elastic-assistant-common';
import type { ISearchGeneric } from '@kbn/search-types';
import type { SecurityCanvasEmbeddedBundle } from '../../components/security_redux_embedded_provider';

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
 *
 * The title and markdown are anonymized. When `replacements` is present, the original values
 * are inserted for display, from the same source the agent reads.
 */
export interface AttackDiscoveryAttachmentData {
  alert_ids?: string[];
  details_markdown?: string;
  id?: string;
  replacements?: Replacements;
  summary_markdown?: string;
  title?: string;
}

// The server's bounds for these fields. Original values can be longer than the UUIDs they
// replace, and the markdown parser slows down sharply on long input, so the de-anonymized text
// is truncated to them before it is rendered.
const MAX_TITLE_LENGTH = 1024;
const MAX_SUMMARY_LENGTH = 8000;
const MAX_DETAILS_LENGTH = 50_000;

const withOriginalValues = ({
  maxLength,
  replacements,
  text,
}: {
  maxLength: number;
  replacements?: Replacements;
  text: string;
}): string => {
  const deAnonymized = replaceAnonymizedValuesWithOriginalValues({
    messageContent: text,
    replacements,
  });

  return deAnonymized.length > maxLength ? `${deAnonymized.slice(0, maxLength)}…` : deAnonymized;
};

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
  const replacements = attachment.data?.replacements;
  const detailsMarkdown = withOriginalValues({
    maxLength: MAX_DETAILS_LENGTH,
    replacements,
    text: attachment.data?.details_markdown ?? '',
  });
  const summaryMarkdown = withOriginalValues({
    maxLength: MAX_SUMMARY_LENGTH,
    replacements,
    text: attachment.data?.summary_markdown ?? '',
  });

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

export const createAttackDiscoveryAttachmentDefinition = ({
  getSpaceId,
  search,
  resolveSecurityCanvasContext,
}: {
  getSpaceId: () => Promise<string>;
  search: ISearchGeneric;
  resolveSecurityCanvasContext: () => Promise<SecurityCanvasEmbeddedBundle>;
}): AttachmentUIDefinition<AttackDiscoveryAttachment> => {
  const LazyAttackPill = React.lazy(() =>
    import(
      /* webpackChunkName: "security_conversation_details_attack_pill" */
      '../conversation_details/attack_pill'
    ).then((m) => ({ default: m.AttackPill }))
  );

  return {
    getIcon: () => 'sparkles',
    getLabel: (attachment) =>
      attachment.data?.title != null
        ? withOriginalValues({
            maxLength: MAX_TITLE_LENGTH,
            replacements: attachment.data.replacements,
            text: attachment.data.title,
          })
        : DEFAULT_LABEL,
    renderInlineContent: (props) => <AttackDiscoveryInlineContent {...props} />,
    renderConversationDetailsContent: ({ attachment }) => (
      <React.Suspense fallback={null}>
        <LazyAttackPill
          attachment={attachment}
          getSpaceId={getSpaceId}
          search={search}
          resolveSecurityCanvasContext={resolveSecurityCanvasContext}
        />
      </React.Suspense>
    ),
  };
};

export const registerAttackDiscoveryAttachment = ({
  attachments,
  getSpaceId,
  search,
  resolveSecurityCanvasContext,
}: {
  attachments: AttachmentServiceStartContract;
  getSpaceId: () => Promise<string>;
  search: ISearchGeneric;
  resolveSecurityCanvasContext: () => Promise<SecurityCanvasEmbeddedBundle>;
}): void => {
  attachments.addAttachmentType(
    SecurityAgentBuilderAttachments.attackDiscovery,
    createAttackDiscoveryAttachmentDefinition({ getSpaceId, search, resolveSecurityCanvasContext })
  );
};
