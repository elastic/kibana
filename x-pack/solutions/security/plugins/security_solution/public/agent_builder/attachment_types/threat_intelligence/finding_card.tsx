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
import type { FindingCardPayload, SeverityLevel } from '../../../../common/threat_intelligence/hub';
import { deployEsqlRule } from '../../../threat_intelligence/modules/intelligence_hub/lib/deploy_esql_rule';

type FindingCardAttachment = Attachment<'threat-intel-finding-card', FindingCardPayload>;

const SEVERITY_COLOR: Record<SeverityLevel, 'success' | 'warning' | 'danger' | 'default'> = {
  low: 'default',
  medium: 'warning',
  high: 'danger',
  critical: 'danger',
};

const SECURITY_APP_ID = 'securitySolutionUI' as const;
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
              {i18n.translate(
                'xpack.securitySolution.threatIntelligence.attachments.findingCard.dismissedBadge',
                {
                  defaultMessage: 'Dismissed',
                }
              )}
            </EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="xs" color="subdued">
              {i18n.translate(
                'xpack.securitySolution.threatIntelligence.attachments.findingCard.dismissedBody',
                {
                  defaultMessage:
                    'Finding {techniqueId} ({techniqueName}) dismissed locally — no server state was changed.',
                  values: {
                    techniqueId: data.technique_id,
                    techniqueName: data.technique_name,
                  },
                }
              )}
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
            {i18n.translate(
              'xpack.securitySolution.threatIntelligence.attachments.findingCard.confidenceBadge',
              {
                defaultMessage: 'confidence {confidence}',
                values: { confidence: data.confidence.toFixed(2) },
              }
            )}
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
            {i18n.translate(
              'xpack.securitySolution.threatIntelligence.attachments.findingCard.riskScore',
              {
                defaultMessage: 'risk {score}',
                values: { score: data.risk_score },
              }
            )}
          </EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiTitle size="xs">
        <h4>{data.rule_name}</h4>
      </EuiTitle>
      <EuiText size="xs" color="subdued">
        {data.tactics.length > 0
          ? i18n.translate(
              'xpack.securitySolution.threatIntelligence.attachments.findingCard.tacticsLine',
              {
                defaultMessage: 'Tactics: {tactics}',
                values: { tactics: data.tactics.join(', ') },
              }
            )
          : i18n.translate(
              'xpack.securitySolution.threatIntelligence.attachments.findingCard.tacticsUnmapped',
              {
                defaultMessage: 'Tactics: unmapped',
              }
            )}
      </EuiText>
      <EuiSpacer size="s" />
      <EuiText size="s">
        <strong>
          {i18n.translate(
            'xpack.securitySolution.threatIntelligence.attachments.findingCard.evidenceLabel',
            {
              defaultMessage: 'Evidence:',
            }
          )}{' '}
        </strong>
        <em>
          {'“'}
          {data.evidence_quote}
          {'”'}
        </em>
      </EuiText>
      {data.hypothesis_rationale ? (
        <>
          <EuiSpacer size="xs" />
          <EuiText size="xs" color="subdued">
            {data.hypothesis_rationale}
          </EuiText>
        </>
      ) : null}
      <EuiSpacer size="xs" />
      <EuiText size="xs" color="subdued">
        {i18n.translate(
          'xpack.securitySolution.threatIntelligence.attachments.findingCard.sourceLine',
          {
            defaultMessage: 'Source: {sourceName} — {title}',
            values: { sourceName: data.report_source_name, title: data.report_title },
          }
        )}
        {data.report_source_url ? (
          <>
            {' · '}
            <EuiLink href={data.report_source_url} target="_blank">
              {i18n.translate(
                'xpack.securitySolution.threatIntelligence.attachments.findingCard.openReportLink',
                {
                  defaultMessage: 'open report',
                }
              )}
            </EuiLink>
          </>
        ) : null}
      </EuiText>
      <EuiHorizontalRule margin="s" />
      <EuiText size="xs" color="subdued">
        {i18n.translate(
          'xpack.securitySolution.threatIntelligence.attachments.findingCard.proposedRuleLabel',
          {
            defaultMessage: 'Proposed ES|QL detection (refine before enabling):',
          }
        )}
      </EuiText>
      <EuiSpacer size="xs" />
      <EuiCodeBlock language="esql" fontSize="s" paddingSize="s" isCopyable overflowHeight={180}>
        {data.proposed_esql_rule}
      </EuiCodeBlock>
    </EuiPanel>
  );
};

const buildCaseInitialPayload = (
  data: FindingCardPayload
): { title: string; description: string; tags: string[] } => ({
  title: i18n.translate(
    'xpack.securitySolution.threatIntelligence.attachments.findingCard.caseTitle',
    {
      defaultMessage: 'Investigate {techniqueId}: {techniqueName} ({sourceName})',
      values: {
        techniqueId: data.technique_id,
        techniqueName: data.technique_name,
        sourceName: data.report_source_name,
      },
    }
  ),
  description:
    `**Source report:** ${data.report_title}\n${
      data.report_source_url ? `**Source URL:** ${data.report_source_url}\n` : ''
    }**Technique:** ${data.technique_id} — ${data.technique_name}${
      data.parent_technique_id ? ` (parent ${data.parent_technique_id})` : ''
    }\n**Severity:** ${data.severity}  **Confidence:** ${data.confidence.toFixed(2)}\n\n` +
    `> ${data.evidence_quote}\n\n` +
    `Proposed ES|QL detection (refine before enabling):\n` +
    `\`\`\`esql\n` +
    `${data.proposed_esql_rule}\n` +
    `\`\`\``,
  tags: ['threat-intel', `mitre:${data.technique_id}`, `severity:${data.severity}`],
});

export const buildFindingCardUiDefinition = (
  core: CoreStart
): AttachmentUIDefinition<FindingCardAttachment> => {
  const handleCreateRule = async (attachment: FindingCardAttachment) => {
    const data = attachment.data;
    try {
      const result = await deployEsqlRule(core.http, {
        name: data.rule_name || `TI hunt: ${data.technique_id} ${data.technique_name}`,
        description:
          data.evidence_quote ||
          `Created from threat intel finding for ${data.technique_id} (${data.report_title}).`,
        query: data.proposed_esql_rule,
        severity: data.severity,
        riskScore: data.risk_score,
        tags: ['threat-intel', `mitre:${data.technique_id}`],
      });
      core.notifications.toasts.addSuccess({
        title: i18n.translate(
          'xpack.securitySolution.threatIntelligence.attachments.findingCard.createRuleToastTitle',
          {
            defaultMessage: 'Detection rule created (disabled)',
          }
        ),
        text: i18n.translate(
          'xpack.securitySolution.threatIntelligence.attachments.findingCard.createRuleToastBody',
          {
            defaultMessage: 'Rule "{name}" is ready to review before enabling.',
            values: { name: result.ruleName },
          }
        ),
      });
      await core.application.navigateToApp(SECURITY_APP_ID, {
        deepLinkId: 'rules',
        path: `/id/${result.ruleId}`,
      });
    } catch (err) {
      core.notifications.toasts.addError(err as Error, {
        title: i18n.translate(
          'xpack.securitySolution.threatIntelligence.attachments.findingCard.createRuleErrorTitle',
          { defaultMessage: 'Failed to create detection rule' }
        ),
      });
      // Keep copy-ES|QL as a secondary fallback when create fails.
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(data.proposed_esql_rule);
        } catch {
          // ignore clipboard failures
        }
      }
    }
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
      i18n.translate('xpack.securitySolution.threatIntelligence.attachments.findingCard.label', {
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
              'xpack.securitySolution.threatIntelligence.attachments.findingCard.undoDismissAction',
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
          label: i18n.translate(
            'xpack.securitySolution.threatIntelligence.attachments.findingCard.createRuleAction',
            {
              defaultMessage: 'Create rule',
            }
          ),
          type: ActionButtonType.PRIMARY,
          icon: 'plusInCircle',
          handler: () => handleCreateRule(attachment),
        },
        {
          label: i18n.translate(
            'xpack.securitySolution.threatIntelligence.attachments.findingCard.investigateAction',
            { defaultMessage: 'Investigate' }
          ),
          type: ActionButtonType.SECONDARY,
          icon: 'casesApp',
          handler: () => handleInvestigate(attachment),
        },
        {
          label: i18n.translate(
            'xpack.securitySolution.threatIntelligence.attachments.findingCard.dismissAction',
            {
              defaultMessage: 'Dismiss',
            }
          ),
          type: ActionButtonType.OVERFLOW,
          icon: 'cross',
          handler: () => handleDismiss(attachment),
        },
      ];
    },
  };
};
