/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer, EuiTitle, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { IconType } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  AttachmentRenderProps,
  AttachmentServiceStartContract,
  AttachmentUIDefinition,
  HeaderData,
} from '@kbn/agent-builder-browser/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';

import { SecurityAgentBuilderAttachments } from '../../../../common/constants';
import { AttackDiscoveryMarkdownFormatter } from '../../../attack_discovery/pages/results/attack_discovery_markdown_formatter';
import { InlineAttachmentTitle } from '../inline_attachment_title';

/**
 * Conversation-scoped, and distinct from the discovery attachment's scope so a field-pill
 * flyout opened from the verdict would not collide with one opened from the evidence.
 * Field-pill actions are disabled in Agent Builder today; this scope is reserved for when
 * they are re-enabled.
 */
export const ATTACK_DISCOVERY_VERDICT_INLINE_SCOPE_ID =
  'agent-builder-investigation-attack-discovery-verdict';

export const ATTACK_DISCOVERY_VERDICT_INLINE_CONTENT_TEST_ID =
  'attackDiscoveryVerdictInlineContent';
export const ATTACK_DISCOVERY_VERDICT_INLINE_TITLE_TEST_ID = 'attackDiscoveryVerdictInlineTitle';
export const ATTACK_DISCOVERY_VERDICT_INLINE_SUMMARY_TEST_ID =
  'attackDiscoveryVerdictInlineSummary';
export const ATTACK_DISCOVERY_VERDICT_INLINE_RATIONALE_TEST_ID =
  'attackDiscoveryVerdictInlineRationale';

/**
 * FP/TP verdict attachment payload. Matches the discoveries server schema
 * (`attackDiscoveryVerdictAttachmentDataSchema`); duplicated here so this plugin does
 * not import discoveries.
 */
export interface AttackDiscoveryVerdictAttachmentData {
  rationale_markdown?: string;
  summary_markdown?: string;
  verdict?: string;
}

export type AttackDiscoveryVerdictAttachment = Attachment<
  typeof SecurityAgentBuilderAttachments.attackDiscoveryVerdict,
  AttackDiscoveryVerdictAttachmentData
>;

const DEFAULT_LABEL = i18n.translate(
  'xpack.securitySolution.agentBuilder.attackDiscoveryVerdictAttachment.label',
  {
    defaultMessage: 'Analysis verdict',
  }
);

const SUBTITLE = i18n.translate(
  'xpack.securitySolution.agentBuilder.attackDiscoveryVerdictAttachment.subtitle',
  {
    defaultMessage: 'False positive / true positive analysis',
  }
);

const RATIONALE_TITLE = i18n.translate(
  'xpack.securitySolution.agentBuilder.attackDiscoveryVerdictAttachment.rationaleTitle',
  {
    defaultMessage: 'Rationale',
  }
);

/** Translated labels for what the analysis concluded. */
const VERDICT_BADGE_LABELS: Record<string, string> = {
  failed: i18n.translate(
    'xpack.securitySolution.agentBuilder.attackDiscoveryVerdictAttachment.failedBadgeLabel',
    { defaultMessage: 'Analysis failed' }
  ),
  false_positive: i18n.translate(
    'xpack.securitySolution.agentBuilder.attackDiscoveryVerdictAttachment.falsePositiveBadgeLabel',
    { defaultMessage: 'False positive' }
  ),
  inconclusive: i18n.translate(
    'xpack.securitySolution.agentBuilder.attackDiscoveryVerdictAttachment.inconclusiveBadgeLabel',
    { defaultMessage: 'Inconclusive' }
  ),
  true_positive: i18n.translate(
    'xpack.securitySolution.agentBuilder.attackDiscoveryVerdictAttachment.truePositiveBadgeLabel',
    { defaultMessage: 'True positive' }
  ),
};

const VERDICT_BADGE_COLORS: Record<string, string> = {
  failed: 'default',
  false_positive: 'success',
  inconclusive: 'warning',
  true_positive: 'danger',
};

const VERDICT_ICONS: Record<string, IconType> = {
  failed: 'error',
  false_positive: 'checkCircleFill',
  inconclusive: 'question',
  true_positive: 'warning',
};

/** Header icon for a verdict this client does not recognize, and for the pre-send pill. */
const DEFAULT_ICON: IconType = 'document';

/**
 * Returns the analyst-facing label for a verdict, falling back to the generic label for a
 * verdict this client does not know. `failed` names the failure rather than a conclusion,
 * because a failed analysis produces no classification.
 */
export const getVerdictLabel = (verdict: string | undefined): string =>
  (verdict != null ? VERDICT_BADGE_LABELS[verdict] : undefined) ?? DEFAULT_LABEL;

/**
 * Header metadata for the attachment card: the verdict's icon and badge. A missing or
 * unrecognized verdict gets no badge, because its only label would be the generic title.
 */
export const getVerdictHeader = (attachment: AttackDiscoveryVerdictAttachment): HeaderData => {
  const { verdict } = attachment.data ?? {};

  return {
    icon: (verdict != null ? VERDICT_ICONS[verdict] : undefined) ?? DEFAULT_ICON,
    subtitle: SUBTITLE,
    ...(verdict != null && Object.hasOwn(VERDICT_BADGE_LABELS, verdict)
      ? {
          badges: [
            {
              color: VERDICT_BADGE_COLORS[verdict] ?? 'default',
              label: getVerdictLabel(verdict),
            },
          ],
        }
      : {}),
  };
};

export const AttackDiscoveryVerdictInlineContent = ({
  attachment,
}: AttachmentRenderProps<AttackDiscoveryVerdictAttachment>) => {
  const { euiTheme } = useEuiTheme();
  const rationaleMarkdown = attachment.data?.rationale_markdown;
  const summaryMarkdown = attachment.data?.summary_markdown ?? '';

  return (
    <div
      css={css`
        min-width: 0;
        overflow-wrap: anywhere;
        padding: ${euiTheme.size.m};
      `}
      data-test-subj={ATTACK_DISCOVERY_VERDICT_INLINE_CONTENT_TEST_ID}
    >
      {/* The generic title, because the verdict is already the header badge. */}
      <InlineAttachmentTitle
        {...getVerdictHeader(attachment)}
        data-test-subj={ATTACK_DISCOVERY_VERDICT_INLINE_TITLE_TEST_ID}
        title={DEFAULT_LABEL}
      />
      <EuiSpacer size="s" />
      <div data-test-subj={ATTACK_DISCOVERY_VERDICT_INLINE_SUMMARY_TEST_ID}>
        <AttackDiscoveryMarkdownFormatter
          disableActions={true}
          markdown={summaryMarkdown}
          scopeId={ATTACK_DISCOVERY_VERDICT_INLINE_SCOPE_ID}
          wrapFieldValues={true}
        />
      </div>
      {rationaleMarkdown != null && (
        <>
          <EuiSpacer size="s" />
          <EuiTitle size="xs">
            <h2>{RATIONALE_TITLE}</h2>
          </EuiTitle>
          <EuiSpacer size="s" />
          <div data-test-subj={ATTACK_DISCOVERY_VERDICT_INLINE_RATIONALE_TEST_ID}>
            <AttackDiscoveryMarkdownFormatter
              disableActions={true}
              markdown={rationaleMarkdown}
              scopeId={ATTACK_DISCOVERY_VERDICT_INLINE_SCOPE_ID}
              wrapFieldValues={true}
            />
          </div>
        </>
      )}
    </div>
  );
};

export const createAttackDiscoveryVerdictAttachmentDefinition =
  (): AttachmentUIDefinition<AttackDiscoveryVerdictAttachment> => ({
    // `getIcon` takes no attachment, so the pill icon cannot vary by verdict. The
    // verdict-specific icon and badge go on the header below.
    getIcon: () => DEFAULT_ICON,

    getLabel: (attachment) => getVerdictLabel(attachment.data?.verdict),

    getHeader: ({ attachment }) => getVerdictHeader(attachment),

    renderInlineContent: (props) => <AttackDiscoveryVerdictInlineContent {...props} />,
  });

export const registerAttackDiscoveryVerdictAttachment = ({
  attachments,
}: {
  attachments: AttachmentServiceStartContract;
}): void => {
  attachments.addAttachmentType(
    SecurityAgentBuilderAttachments.attackDiscoveryVerdict,
    createAttackDiscoveryVerdictAttachmentDefinition()
  );
};
