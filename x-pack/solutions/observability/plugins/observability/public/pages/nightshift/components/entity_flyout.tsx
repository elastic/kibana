/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React, { useCallback } from 'react';
import {
  EuiBadge,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Feature } from '@kbn/significant-events-schema';
import {
  encodeFeatureAttachmentOrigin,
  KI_FEATURE_ATTACHMENT_TYPE,
} from '@kbn/significant-events-plugin/common';
import { AiButton } from '@kbn/shared-ux-ai-components';
import { useKibana } from '../../../utils/kibana_react';
import { formatChatAttachmentDescription } from '../chat_attachment_description';
import { FlyoutSectionTitle } from './flyout_section_title';
import { TruncatableSummary } from './truncatable_summary';

export interface EntityFlyoutProps {
  feature: Feature;
  onClose: () => void;
  enableChatAttachment?: boolean;
}

const confidenceDotColor = (
  confidence: number,
  colors: ReturnType<typeof useEuiTheme>['euiTheme']['colors']
): string => {
  if (confidence >= 70) {
    return colors.success;
  }
  if (confidence >= 40) {
    return colors.warning;
  }
  return colors.danger;
};

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const { euiTheme } = useEuiTheme();
  const confidenceLabel = i18n.translate(
    'xpack.observability.nightshift.entityFlyout.confidenceBadge',
    {
      defaultMessage: '{confidence}% confidence',
      values: { confidence },
    }
  );

  return (
    <EuiToolTip
      title={confidenceLabel}
      content={i18n.translate('xpack.observability.nightshift.entityFlyout.confidenceTooltip', {
        defaultMessage:
          'How confident Nightshift is that this is a real, distinct entity in your system — based on observation frequency, data consistency, and cross-source corroboration.',
      })}
    >
      <EuiBadge color="hollow" tabIndex={0}>
        <span
          css={css`
            align-items: center;
            display: inline-flex;
            gap: ${euiTheme.size.xs};
          `}
        >
          <span
            aria-hidden
            css={css`
              background: ${confidenceDotColor(confidence, euiTheme.colors)};
              border-radius: 50%;
              flex-shrink: 0;
              height: ${euiTheme.size.s};
              width: ${euiTheme.size.s};
            `}
          />
          {confidenceLabel}
        </span>
      </EuiBadge>
    </EuiToolTip>
  );
}

function EvidenceList({ evidence }: { evidence: string[] }) {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="none"
      data-test-subj="nightshiftEntityFlyoutEvidenceList"
    >
      {evidence.map((item, index) => (
        <EuiText
          key={`${item}-${index}`}
          size="s"
          data-test-subj="nightshiftEntityFlyoutEvidenceItem"
          css={css`
            background: ${index % 2 === 0
              ? euiTheme.colors.backgroundBasePlain
              : euiTheme.colors.backgroundBaseSubdued};
            font-family: ${euiTheme.font.familyCode};
            margin: 0;
            padding: ${euiTheme.size.s} ${euiTheme.size.m};

            &:first-of-type {
              border-top-left-radius: ${euiTheme.border.radius.medium};
              border-top-right-radius: ${euiTheme.border.radius.medium};
            }

            &:last-of-type {
              border-bottom-left-radius: ${euiTheme.border.radius.medium};
              border-bottom-right-radius: ${euiTheme.border.radius.medium};
            }
          `}
        >
          <code>{item}</code>
        </EuiText>
      ))}
    </EuiPanel>
  );
}

export function EntityFlyout({
  feature,
  onClose,
  enableChatAttachment = true,
}: EntityFlyoutProps): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const { agentBuilder } = useKibana().services;
  const title = feature.title ?? feature.id;
  const evidence = feature.evidence ?? [];
  const isServiceEntity = feature.subtype === 'service';

  const handleOpenInChat = useCallback(() => {
    agentBuilder?.openChat({
      newConversation: true,
      autoSendInitialMessage: true,
      initialMessage: i18n.translate('xpack.observability.nightshift.entityFlyout.chatPrompt', {
        defaultMessage: 'Tell me about {entityName}',
        values: { entityName: title },
      }),
      attachments: [
        {
          id: feature.uuid,
          type: KI_FEATURE_ATTACHMENT_TYPE,
          origin: encodeFeatureAttachmentOrigin(feature.stream_name, feature.id),
          description: formatChatAttachmentDescription('Entity', title),
          data: feature,
        },
      ],
    });
  }, [agentBuilder, feature, title]);

  return (
    <EuiFlyout
      onClose={onClose}
      size="s"
      session="inherit"
      aria-label={title}
      data-test-subj="nightshiftEntityFlyout"
      type="push"
      hasAnimation={false}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2>{title}</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="xs" wrap responsive={false} alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiBadge color="default">
              {i18n.translate('xpack.observability.nightshift.entityFlyout.entityBadge', {
                defaultMessage: 'Entity',
              })}
            </EuiBadge>
          </EuiFlexItem>
          {isServiceEntity && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">
                {i18n.translate('xpack.observability.nightshift.entityFlyout.serviceBadge', {
                  defaultMessage: 'Service',
                })}
              </EuiBadge>
            </EuiFlexItem>
          )}
          {feature.confidence > 0 && (
            <EuiFlexItem grow={false}>
              <ConfidenceBadge confidence={feature.confidence} />
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow" iconType="productStreamsClassic" iconSide="left">
              {feature.stream_name}
            </EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {feature.description && (
          <>
            <FlyoutSectionTitle>
              {i18n.translate('xpack.observability.nightshift.entityFlyout.summaryTitle', {
                defaultMessage: 'Summary',
              })}
            </FlyoutSectionTitle>
            <EuiSpacer size="s" />
            <TruncatableSummary
              summary={feature.description}
              testSubj="nightshiftEntityFlyoutSummary"
              toggleTestSubj="nightshiftEntityFlyoutSummaryToggle"
            />
            <EuiSpacer size="l" />
          </>
        )}

        <FlyoutSectionTitle>
          {i18n.translate('xpack.observability.nightshift.entityFlyout.evidenceTitle', {
            defaultMessage: 'Evidence',
          })}
        </FlyoutSectionTitle>
        <EuiSpacer size="s" />
        {evidence.length > 0 ? (
          <EvidenceList evidence={evidence} />
        ) : (
          <EuiText size="s" color="subdued">
            {i18n.translate('xpack.observability.nightshift.entityFlyout.noEvidenceDescription', {
              defaultMessage: 'No evidence available for this entity.',
            })}
          </EuiText>
        )}

        <EuiSpacer size="l" />

        <FlyoutSectionTitle>
          {i18n.translate('xpack.observability.nightshift.entityFlyout.rawDocumentTitle', {
            defaultMessage: 'Raw document',
          })}
        </FlyoutSectionTitle>
        <EuiSpacer size="s" />
        <EuiCodeBlock
          language="json"
          fontSize="s"
          paddingSize="m"
          isCopyable
          overflowHeight={260}
          data-test-subj="nightshiftEntityFlyoutRawDocument"
        >
          {JSON.stringify(feature, null, 2)}
        </EuiCodeBlock>
      </EuiFlyoutBody>

      {agentBuilder && enableChatAttachment && (
        <EuiFlyoutFooter
          css={css`
            background: ${euiTheme.colors.backgroundBasePlain};
            border-top: ${euiTheme.border.thin};
          `}
        >
          <EuiFlexGroup justifyContent="flexEnd" responsive={false}>
            <EuiFlexItem grow={false}>
              <AiButton
                variant="empty"
                size="s"
                iconType="productAgent"
                iconSide="left"
                data-test-subj="nightshiftEntityFlyoutChatButton"
                onClick={handleOpenInChat}
              >
                {i18n.translate(
                  'xpack.observability.nightshift.entityFlyout.openInChatButtonLabel',
                  {
                    defaultMessage: 'Open in chat',
                  }
                )}
              </AiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      )}
    </EuiFlyout>
  );
}
