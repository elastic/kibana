/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer, EuiTitle } from '@elastic/eui';
import type { IconType } from '@elastic/eui';
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
 * Conversation-scoped, and distinct from the discovery attachment's scope so a field-pill
 * flyout opened from the verdict does not collide with one opened from the evidence.
 */
export const ATTACK_DISCOVERY_VERDICT_INLINE_SCOPE_ID =
  'agent-builder-investigation-attack-discovery-verdict';

export const ATTACK_DISCOVERY_VERDICT_INLINE_CONTENT_TEST_ID =
  'attackDiscoveryVerdictInlineContent';
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

export const AttackDiscoveryVerdictInlineContent = ({
  attachment,
}: AttachmentRenderProps<AttackDiscoveryVerdictAttachment>) => {
  const rationaleMarkdown = attachment.data?.rationale_markdown;
  const summaryMarkdown = attachment.data?.summary_markdown ?? '';

  return (
    <div data-test-subj={ATTACK_DISCOVERY_VERDICT_INLINE_CONTENT_TEST_ID}>
      <div data-test-subj={ATTACK_DISCOVERY_VERDICT_INLINE_SUMMARY_TEST_ID}>
        <AttackDiscoveryMarkdownFormatter
          disableActions={false}
          markdown={summaryMarkdown}
          scopeId={ATTACK_DISCOVERY_VERDICT_INLINE_SCOPE_ID}
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
              disableActions={false}
              markdown={rationaleMarkdown}
              scopeId={ATTACK_DISCOVERY_VERDICT_INLINE_SCOPE_ID}
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

    getHeader: ({ attachment }) => {
      const { verdict } = attachment.data ?? {};

      return {
        icon: (verdict != null ? VERDICT_ICONS[verdict] : undefined) ?? DEFAULT_ICON,
        subtitle: SUBTITLE,
        badges: [
          {
            color: (verdict != null ? VERDICT_BADGE_COLORS[verdict] : undefined) ?? 'default',
            label: getVerdictLabel(verdict),
          },
        ],
      };
    },

    renderConversationDetailsContent: ({ attachment }) => (
      <AttackDiscoveryVerdictInlineContent attachment={attachment} isSidebar={false} />
    ),
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
