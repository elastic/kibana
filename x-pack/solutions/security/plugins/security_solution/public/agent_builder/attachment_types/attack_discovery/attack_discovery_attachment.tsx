/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer, EuiTitle, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type {
  ActionButton,
  AttachmentRenderProps,
  AttachmentServiceStartContract,
  AttachmentUIDefinition,
  HeaderData,
} from '@kbn/agent-builder-browser/attachments';
import { ActionButtonType } from '@kbn/agent-builder-browser/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { ApplicationStart } from '@kbn/core-application-browser';
import {
  replaceAnonymizedValuesWithOriginalValues,
  type Replacements,
} from '@kbn/elastic-assistant-common';
import type { SecurityCanvasEmbeddedBundle } from '../../components/security_redux_embedded_provider';
import { AttackPill } from './attack_pill';

import {
  APP_UI_ID,
  ATTACK_DISCOVERY_PATH,
  SecurityAgentBuilderAttachments,
} from '../../../../common/constants';
import { AttackDiscoveryMarkdownFormatter } from '../../../attack_discovery/pages/results/attack_discovery_markdown_formatter';

/**
 * Conversation-scoped, so field-pill flyouts opened from a conversation would not collide
 * with the Attacks table (`TableId.alertsOnAttacksPage`). Field-pill actions are disabled in
 * Agent Builder today; this scope, and the `alertIds` passed with it, are reserved for when
 * they are re-enabled.
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
  timestamp?: string;
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

const ATTACK_PILL_LABEL = i18n.translate(
  'xpack.securitySolution.agentBuilder.attackDiscoveryAttachment.pillLabel',
  { defaultMessage: '1 attack' }
);

const DETAILS_TITLE = i18n.translate(
  'xpack.securitySolution.agentBuilder.attackDiscoveryAttachment.detailsTitle',
  {
    defaultMessage: 'Details',
  }
);

const OPEN_IN_ATTACKS = i18n.translate(
  'xpack.securitySolution.agentBuilder.attackDiscoveryAttachment.openInAttacks',
  {
    defaultMessage: 'Open in Attacks',
  }
);

const ICON = 'sparkles';

/**
 * The attachment's label: the discovery title, with the original values from `replacements`
 * inserted, or a generic label when it has none.
 */
export const getAttackDiscoveryLabel = (attachment: AttackDiscoveryAttachment): string =>
  attachment.data?.title != null
    ? withOriginalValues({
        maxLength: MAX_TITLE_LENGTH,
        replacements: attachment.data.replacements,
        text: attachment.data.title,
      })
    : DEFAULT_LABEL;

/** Header metadata for the attachment card. */
export const getAttackDiscoveryHeader = (): HeaderData => ({ icon: ICON });

/**
 * The card's "Open in Attacks" link, or none when the discovery has no id.
 *
 * The `/attack_discovery?id=` deep link opens the discovery's flyout from either Attack Discovery
 * index of the active space. Its `timestamp` sets the Attacks page's time range to include the
 * discovery; without it, the page keeps its default range, which can exclude an older one. A new
 * tab keeps the conversation, and the sidebar showing it, in place. Defining an action also makes
 * Agent Builder render the card's header, which it omits for a type without actions.
 */
export const getAttackDiscoveryActionButtons = ({
  attachment,
  getUrlForApp,
}: {
  attachment: AttackDiscoveryAttachment;
  getUrlForApp: ApplicationStart['getUrlForApp'];
}): ActionButton[] => {
  const id = attachment.data?.id;
  if (id == null || id === '') {
    return [];
  }

  const timestamp = attachment.data?.timestamp;
  const query = new URLSearchParams({
    id,
    ...(timestamp != null && timestamp !== '' ? { timestamp } : {}),
  });

  return [
    {
      handler: () => undefined,
      href: getUrlForApp(APP_UI_ID, { path: `${ATTACK_DISCOVERY_PATH}?${query.toString()}` }),
      icon: 'external',
      label: OPEN_IN_ATTACKS,
      openInNewTab: true,
      type: ActionButtonType.SECONDARY,
    },
  ];
};

export const AttackDiscoveryInlineContent = ({
  attachment,
}: AttachmentRenderProps<AttackDiscoveryAttachment>) => {
  const { euiTheme } = useEuiTheme();
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
    <div
      css={css`
        min-width: 0;
        overflow-wrap: anywhere;
        padding: ${euiTheme.size.m};
      `}
      data-test-subj={ATTACK_DISCOVERY_INLINE_CONTENT_TEST_ID}
    >
      <div data-test-subj={ATTACK_DISCOVERY_INLINE_SUMMARY_TEST_ID}>
        <AttackDiscoveryMarkdownFormatter
          alertIds={alertIds}
          disableActions={true}
          markdown={summaryMarkdown}
          scopeId={ATTACK_DISCOVERY_INLINE_SCOPE_ID}
          wrapFieldValues={true}
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
          disableActions={true}
          markdown={detailsMarkdown}
          scopeId={ATTACK_DISCOVERY_INLINE_SCOPE_ID}
          wrapFieldValues={true}
        />
      </div>
    </div>
  );
};

export const createAttackDiscoveryAttachmentDefinition = ({
  getUrlForApp,
  getSpaceId,
  resolveSecurityCanvasContext,
}: {
  getUrlForApp: ApplicationStart['getUrlForApp'];
  getSpaceId: () => Promise<string>;
  resolveSecurityCanvasContext: () => Promise<SecurityCanvasEmbeddedBundle>;
}): AttachmentUIDefinition<AttackDiscoveryAttachment> => ({
  getActionButtons: ({ attachment }) =>
    getAttackDiscoveryActionButtons({ attachment, getUrlForApp }),
  getHeader: () => getAttackDiscoveryHeader(),
  getIcon: () => ICON,
  getLabel: getAttackDiscoveryLabel,
  renderInlineContent: (props) => <AttackDiscoveryInlineContent {...props} />,
  renderConversationDetailsContent: ({ attachment }) => (
    <AttackPill
      attachment={attachment}
      getSpaceId={getSpaceId}
      label={ATTACK_PILL_LABEL}
      resolveSecurityCanvasContext={resolveSecurityCanvasContext}
    />
  ),
});

export const registerAttackDiscoveryAttachment = ({
  attachments,
  getUrlForApp,
  getSpaceId,
  resolveSecurityCanvasContext,
}: {
  attachments: AttachmentServiceStartContract;
  getUrlForApp: ApplicationStart['getUrlForApp'];
  getSpaceId: () => Promise<string>;
  resolveSecurityCanvasContext: () => Promise<SecurityCanvasEmbeddedBundle>;
}): void => {
  attachments.addAttachmentType(
    SecurityAgentBuilderAttachments.attackDiscovery,
    createAttackDiscoveryAttachmentDefinition({
      getUrlForApp,
      getSpaceId,
      resolveSecurityCanvasContext,
    })
  );
};
