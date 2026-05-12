/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiBadge,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import {
  ActionButtonType,
  type AttachmentUIDefinition,
} from '@kbn/agent-builder-browser/attachments';
import type { FindingCardPayload } from '../../../common/attachment_payloads';
import type { SeverityLevel } from '../../../common/constants';

type FindingCardAttachment = Attachment<'threat-intel-finding-card', FindingCardPayload>;

const SEVERITY_COLOR: Record<SeverityLevel, 'success' | 'warning' | 'danger' | 'default'> = {
  low: 'default',
  medium: 'warning',
  high: 'danger',
  critical: 'danger',
};

/**
 * The Detection Engine rule create page does not (yet) accept a pre-filled
 * ES|QL body via URL state. The pragmatic handoff is: copy the body to the
 * user's clipboard, navigate to the create page, and surface a toast that
 * tells the analyst to paste. Once the platform supports a structured
 * prefill payload this handler is the only thing that needs to change.
 */
const SECURITY_APP_ID = 'securitySolutionUI' as const;
const RULES_CREATE_DEEP_LINK = 'rules-create' as const;
const CASES_CREATE_DEEP_LINK = 'cases_create' as const;

/**
 * `getActionButtons` handlers are zero-arg `() => void | Promise<void>`, so
 * the inline renderer publishes a small per-attachment "controller" on
 * `window` (keyed by attachment id). The action button handlers look up the
 * controller and call into it. Mirrors the bridge already used by
 * `subscription_confirmation.tsx`.
 */
interface FindingCardController {
  isDismissed: boolean;
  dismiss: () => void;
  unhide: () => void;
}

const controllerKey = (attachmentId: string): string => `__threatIntelFindingCard_${attachmentId}`;

const readController = (attachmentId: string): FindingCardController | undefined =>
  (window as unknown as Record<string, FindingCardController | undefined>)[
    controllerKey(attachmentId)
  ];

const FindingCardBody: React.FC<{
  attachment: FindingCardAttachment;
}> = ({ attachment }) => {
  const data = attachment.data;
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  useEffect(() => {
    const key = controllerKey(attachment.id);
    const controller: FindingCardController = {
      get isDismissed() {
        return isDismissed;
      },
      dismiss: () => setIsDismissed(true),
      unhide: () => setIsDismissed(false),
    };
    (window as unknown as Record<string, FindingCardController>)[key] = controller;
    return () => {
      delete (window as unknown as Record<string, FindingCardController | undefined>)[key];
    };
  }, [attachment.id, isDismissed]);

  if (isDismissed) {
    return (
      <EuiPanel hasBorder paddingSize="m" color="subdued">
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">
              {i18n.translate('xpack.threatIntelligence.attachments.findingCard.dismissedBadge', {
                defaultMessage: 'Dismissed',
              })}
            </EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="xs" color="subdued">
              {i18n.translate('xpack.threatIntelligence.attachments.findingCard.dismissedBody', {
                defaultMessage:
                  'Finding {techniqueId} ({techniqueName}) dismissed locally — no server state was changed.',
                values: {
                  techniqueId: data.technique_id,
                  techniqueName: data.technique_name,
                },
              })}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }

  return (
    <EuiPanel hasBorder paddingSize="m">
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiBadge color={SEVERITY_COLOR[data.severity]}>{data.severity}</EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">
            {i18n.translate('xpack.threatIntelligence.attachments.findingCard.confidenceBadge', {
              defaultMessage: 'confidence {confidence}',
              values: { confidence: data.confidence.toFixed(2) },
            })}
          </EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">
            {data.technique_id}
            {data.parent_technique_id ? ` · parent ${data.parent_technique_id}` : ''}
          </EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">
            {i18n.translate('xpack.threatIntelligence.attachments.findingCard.riskScore', {
              defaultMessage: 'risk {score}',
              values: { score: data.risk_score },
            })}
          </EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiTitle size="xs">
        <h4>{data.rule_name}</h4>
      </EuiTitle>
      <EuiText size="xs" color="subdued">
        {data.tactics.length > 0
          ? i18n.translate('xpack.threatIntelligence.attachments.findingCard.tacticsLine', {
              defaultMessage: 'Tactics: {tactics}',
              values: { tactics: data.tactics.join(', ') },
            })
          : i18n.translate('xpack.threatIntelligence.attachments.findingCard.tacticsUnmapped', {
              defaultMessage: 'Tactics: unmapped',
            })}
      </EuiText>
      <EuiSpacer size="s" />
      <EuiText size="s">
        <strong>
          {i18n.translate('xpack.threatIntelligence.attachments.findingCard.evidenceLabel', {
            defaultMessage: 'Evidence',
          })}
          :{' '}
        </strong>
        <em>“{data.evidence_quote}”</em>
      </EuiText>
      <EuiSpacer size="xs" />
      <EuiText size="xs" color="subdued">
        {i18n.translate('xpack.threatIntelligence.attachments.findingCard.sourceLine', {
          defaultMessage: 'Source: {sourceName} — {title}',
          values: { sourceName: data.report_source_name, title: data.report_title },
        })}
        {data.report_source_url ? (
          <>
            {' · '}
            <EuiLink href={data.report_source_url} target="_blank">
              {i18n.translate('xpack.threatIntelligence.attachments.findingCard.openReportLink', {
                defaultMessage: 'open report',
              })}
            </EuiLink>
          </>
        ) : null}
      </EuiText>
      <EuiHorizontalRule margin="s" />
      <EuiText size="xs" color="subdued">
        {i18n.translate('xpack.threatIntelligence.attachments.findingCard.proposedRuleLabel', {
          defaultMessage: 'Proposed ES|QL detection (refine before enabling):',
        })}
      </EuiText>
      <EuiSpacer size="xs" />
      <EuiCodeBlock language="esql" fontSize="s" paddingSize="s" isCopyable overflowHeight={180}>
        {data.proposed_esql_rule}
      </EuiCodeBlock>
    </EuiPanel>
  );
};

/**
 * Copies the ES|QL body to clipboard and navigates to the Detection Engine
 * rule create page. Falls back to a danger toast if the Clipboard API is
 * unavailable (e.g. insecure context) so the analyst doesn't lose the body
 * on a blind navigate.
 */
const copyEsqlToClipboard = async (esql: string): Promise<boolean> => {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
    return false;
  }
  try {
    await navigator.clipboard.writeText(esql);
    return true;
  } catch {
    return false;
  }
};

const buildCaseInitialPayload = (
  data: FindingCardPayload
): { title: string; description: string; tags: string[] } => ({
  title: i18n.translate('xpack.threatIntelligence.attachments.findingCard.caseTitle', {
    defaultMessage: 'Investigate {techniqueId}: {techniqueName} ({sourceName})',
    values: {
      techniqueId: data.technique_id,
      techniqueName: data.technique_name,
      sourceName: data.report_source_name,
    },
  }),
  description:
    `**Source report:** ${data.report_title}\n` +
    (data.report_source_url ? `**Source URL:** ${data.report_source_url}\n` : '') +
    `**Technique:** ${data.technique_id} — ${data.technique_name}` +
    (data.parent_technique_id ? ` (parent ${data.parent_technique_id})` : '') +
    `\n**Severity:** ${data.severity}  **Confidence:** ${data.confidence.toFixed(2)}\n\n` +
    `> ${data.evidence_quote}\n\n` +
    `Proposed ES|QL detection (refine before enabling):\n` +
    '```esql\n' +
    `${data.proposed_esql_rule}\n` +
    '```',
  tags: ['threat-intel', `mitre:${data.technique_id}`, `severity:${data.severity}`],
});

export const buildFindingCardUiDefinition = (
  core: CoreStart
): AttachmentUIDefinition<FindingCardAttachment> => {
  const handleDeploy = async (attachment: FindingCardAttachment) => {
    const copied = await copyEsqlToClipboard(attachment.data.proposed_esql_rule);
    if (copied) {
      core.notifications.toasts.addSuccess({
        title: i18n.translate('xpack.threatIntelligence.attachments.findingCard.deployToastTitle', {
          defaultMessage: 'ES|QL rule copied to clipboard',
        }),
        text: i18n.translate('xpack.threatIntelligence.attachments.findingCard.deployToastBody', {
          defaultMessage:
            'Paste it into the ES|QL editor on the rule creation page that just opened.',
        }),
      });
    } else {
      core.notifications.toasts.addWarning({
        title: i18n.translate(
          'xpack.threatIntelligence.attachments.findingCard.deployClipboardFailTitle',
          { defaultMessage: 'Clipboard unavailable' }
        ),
        text: i18n.translate(
          'xpack.threatIntelligence.attachments.findingCard.deployClipboardFailBody',
          {
            defaultMessage:
              'Copy the ES|QL body from the card and paste it on the rule creation page.',
          }
        ),
      });
    }
    await core.application.navigateToApp(SECURITY_APP_ID, {
      deepLinkId: RULES_CREATE_DEEP_LINK,
    });
  };

  const handleInvestigate = async (attachment: FindingCardAttachment) => {
    const initial = buildCaseInitialPayload(attachment.data);
    // The Cases plugin reads `state.initialValue` on the create page. If it's
    // unavailable on this build the page still opens — the analyst loses
    // the prefill but not the navigation. The state is forwarded
    // best-effort.
    await core.application.navigateToApp(SECURITY_APP_ID, {
      deepLinkId: CASES_CREATE_DEEP_LINK,
      state: { initialValue: initial },
    });
  };

  const handleDismiss = (attachment: FindingCardAttachment) => {
    const controller = readController(attachment.id);
    controller?.dismiss();
  };

  return {
    getLabel: (attachment) =>
      attachment.data?.attachmentLabel ??
      i18n.translate('xpack.threatIntelligence.attachments.findingCard.label', {
        defaultMessage: 'Finding · {techniqueId}',
        values: { techniqueId: attachment.data?.technique_id ?? '?' },
      }),
    getIcon: () => 'securityAnalyticsApp',
    renderInlineContent: ({ attachment }) => <FindingCardBody attachment={attachment} />,
    getActionButtons: ({ attachment }) => {
      const controller = readController(attachment.id);
      const dismissed = controller?.isDismissed === true;
      if (dismissed) {
        return [
          {
            label: i18n.translate(
              'xpack.threatIntelligence.attachments.findingCard.undoDismissAction',
              { defaultMessage: 'Undo dismiss' }
            ),
            type: ActionButtonType.SECONDARY,
            icon: 'refresh',
            handler: () => {
              const c = readController(attachment.id);
              c?.unhide();
            },
          },
        ];
      }
      return [
        {
          label: i18n.translate('xpack.threatIntelligence.attachments.findingCard.deployAction', {
            defaultMessage: 'Deploy',
          }),
          type: ActionButtonType.PRIMARY,
          icon: 'plusInCircle',
          handler: () => handleDeploy(attachment),
        },
        {
          label: i18n.translate(
            'xpack.threatIntelligence.attachments.findingCard.investigateAction',
            { defaultMessage: 'Investigate' }
          ),
          type: ActionButtonType.SECONDARY,
          icon: 'casesApp',
          handler: () => handleInvestigate(attachment),
        },
        {
          label: i18n.translate('xpack.threatIntelligence.attachments.findingCard.dismissAction', {
            defaultMessage: 'Dismiss',
          }),
          type: ActionButtonType.OVERFLOW,
          icon: 'cross',
          handler: () => handleDismiss(attachment),
        },
      ];
    },
  };
};
