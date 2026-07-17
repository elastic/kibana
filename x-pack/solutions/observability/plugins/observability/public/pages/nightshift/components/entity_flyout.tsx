/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import React from 'react';
import {
  EuiBadge,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
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
import { upperFirst } from 'lodash';
import { getConfidenceColor } from '../get_confidence_color';

export interface EntityFlyoutProps {
  feature: Feature;
  onClose: () => void;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <EuiTitle size="xs">
      <h3>{children}</h3>
    </EuiTitle>
  );
}

const confidenceDotColor = (
  confidence: number,
  colors: ReturnType<typeof useEuiTheme>['euiTheme']['colors']
): string => {
  const level = getConfidenceColor(confidence);
  if (level === 'success') {
    return colors.success;
  }
  if (level === 'warning') {
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

export function EntityFlyout({ feature, onClose }: EntityFlyoutProps): React.ReactElement {
  const title = feature.title ?? feature.id;
  const typeLabel = upperFirst(feature.type);
  const subtypeLabel = feature.subtype ? upperFirst(feature.subtype) : undefined;
  const evidence = feature.evidence ?? [];

  return (
    <EuiFlyout
      onClose={onClose}
      size="s"
      session="inherit"
      aria-label={title}
      data-test-subj="nightshiftEntityFlyout"
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
          {subtypeLabel && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">{subtypeLabel}</EuiBadge>
            </EuiFlexItem>
          )}
          {!subtypeLabel && typeLabel !== 'Entity' && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">{typeLabel}</EuiBadge>
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
            <SectionTitle>
              {i18n.translate('xpack.observability.nightshift.entityFlyout.summaryTitle', {
                defaultMessage: 'Summary',
              })}
            </SectionTitle>
            <EuiSpacer size="s" />
            <EuiText size="s" data-test-subj="nightshiftEntityFlyoutSummary">
              <p>{feature.description}</p>
            </EuiText>
            <EuiSpacer size="l" />
          </>
        )}

        <SectionTitle>
          {i18n.translate('xpack.observability.nightshift.entityFlyout.evidenceTitle', {
            defaultMessage: 'Evidence',
          })}
        </SectionTitle>
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

        <SectionTitle>
          {i18n.translate('xpack.observability.nightshift.entityFlyout.rawDocumentTitle', {
            defaultMessage: 'Raw document',
          })}
        </SectionTitle>
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
    </EuiFlyout>
  );
}
