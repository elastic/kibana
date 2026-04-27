/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, useEuiTheme } from '@elastic/eui';
import type { EuiAvatarProps } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { StatusHeader } from './status_header';
import { MainSignificantEvent } from './main_significant_event';
import type { ImpactedService } from './main_significant_event';
import { ImpactedCard } from './impacted_card';
import type { ImpactedCardProps } from './impacted_card';
import { MetadataIconCard } from './metadata_icon_card';
import { LowerPriorityVerdicts } from './lower_priority_verdicts';
import type { VerdictDocument } from '../../hooks/use_fetch_system_overview';

// Re-export VerdictDocument for convenience
export type { VerdictDocument };

export type SigEventSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface ImpactedCardItem extends ImpactedCardProps {
  id: string;
}

export interface HealthyMetricCardItem {
  id: string;
  label: string;
  value: React.ReactNode;
  iconType?: NonNullable<EuiAvatarProps['iconType']>;
  iconBackground?: EuiAvatarProps['color'];
  iconColor?: EuiAvatarProps['iconColor'];
}

const DEFAULT_IMPACTED_CARDS: ImpactedCardItem[] = [
  { id: 'payment', label: 'Service', value: 'payment', iconType: 'package' },
  { id: 'checkout', label: 'Service', value: 'checkout', iconType: 'package' },
];

export interface SigeventsOverviewProps {
  state?: 'critical' | 'warning' | 'healthy';
  blastRadiusScore?: number;
  title?: string;
  description?: string;
  mainEventTitle?: string;
  mainEventDescription?: string;
  severityLabel?: string;
  severityColor?: 'danger' | 'warning' | 'primary' | 'subdued';
  impactedServices?: ImpactedService[];
  impactedCards?: ImpactedCardItem[];
  healthyMetrics?: HealthyMetricCardItem[];
  lowerPriorityVerdicts?: VerdictDocument[];
  lastUpdatedLabel?: React.ReactNode;
  onRemediate?: () => void;
  onViewDetails?: () => void;
}

export function SigeventsOverview({
  state = 'critical',
  blastRadiusScore,
  title,
  description,
  mainEventTitle,
  mainEventDescription,
  severityLabel,
  severityColor,
  impactedServices,
  impactedCards = DEFAULT_IMPACTED_CARDS,
  healthyMetrics,
  lowerPriorityVerdicts,
  lastUpdatedLabel,
  onRemediate,
  onViewDetails,
}: SigeventsOverviewProps) {
  const { euiTheme } = useEuiTheme();

  const containerCss = css`
    width: 100%;
    max-width: 800px;
    align-self: center;
    box-sizing: border-box;
    padding: ${euiTheme.size.l};
  `;

  const bigValueCss = css`
    font-size: ${euiTheme.size.base};
    font-weight: ${euiTheme.font.weight.semiBold};
    color: ${euiTheme.colors.textHeading};
  `;

  const successValueCss = css`
    font-size: ${euiTheme.size.base};
    font-weight: ${euiTheme.font.weight.semiBold};
    color: ${euiTheme.colors.severity.success};
  `;

  const accentValueCss = css`
    font-size: ${euiTheme.size.base};
    font-weight: ${euiTheme.font.weight.semiBold};
    color: ${euiTheme.colors.textAccent};
  `;

  const defaultHealthyMetrics: HealthyMetricCardItem[] = [
    {
      id: 'services',
      label: i18n.translate('xpack.observability.sigeventsOverview.healthy.services', {
        defaultMessage: 'Services',
      }),
      value: <span css={bigValueCss}>48</span>,
      iconType: 'package',
      iconBackground: euiTheme.colors.backgroundBaseSubdued,
      iconColor: euiTheme.colors.textParagraph,
    },
    {
      id: 'dependencies',
      label: i18n.translate('xpack.observability.sigeventsOverview.healthy.dependencies', {
        defaultMessage: 'Dependencies',
      }),
      value: <span css={bigValueCss}>4</span>,
      iconType: 'submodule',
      iconBackground: euiTheme.colors.backgroundBaseSubdued,
      iconColor: euiTheme.colors.textParagraph,
    },
    {
      id: 'technologies',
      label: i18n.translate('xpack.observability.sigeventsOverview.healthy.technologies', {
        defaultMessage: 'Technologies',
      }),
      value: <span css={bigValueCss}>8</span>,
      iconType: 'desktop',
      iconBackground: euiTheme.colors.backgroundBaseSubdued,
      iconColor: euiTheme.colors.textParagraph,
    },
    {
      id: 'criticalRisk',
      label: i18n.translate('xpack.observability.sigeventsOverview.healthy.criticalRisk', {
        defaultMessage: 'Critical risk',
      }),
      value: <span css={successValueCss}>0</span>,
      iconType: 'minusInCircle',
      iconBackground: euiTheme.colors.backgroundLightSuccess,
      iconColor: euiTheme.colors.severity.success,
    },
    {
      id: 'mediumRisk',
      label: i18n.translate('xpack.observability.sigeventsOverview.healthy.mediumRisk', {
        defaultMessage: 'Medium risk',
      }),
      value: <span css={accentValueCss}>1</span>,
      iconType: 'search',
      iconBackground: euiTheme.colors.backgroundLightAccent,
      iconColor: euiTheme.colors.textAccent,
    },
  ];

  const resolvedHealthyMetrics = healthyMetrics ?? defaultHealthyMetrics;
  const hasLowerPriorityVerdicts = lowerPriorityVerdicts && lowerPriorityVerdicts.length > 0;

  if (state === 'healthy') {
    return (
      <div data-test-subj="sigeventsOverview" css={containerCss}>
        <StatusHeader variant="noCriticalEvents" title={title} description={description} />

        <EuiSpacer size="l" />

        <EuiFlexGroup
          gutterSize="s"
          responsive={true}
          wrap
          data-test-subj="sigeventsOverviewHealthyMetrics"
        >
          {resolvedHealthyMetrics.map(
            ({ id, label, value, iconType, iconBackground, iconColor }) => (
              <EuiFlexItem key={id} grow={1}>
                <MetadataIconCard
                  title={label}
                  value={value}
                  iconType={iconType}
                  color={iconBackground}
                  iconColor={iconColor}
                />
              </EuiFlexItem>
            )
          )}
        </EuiFlexGroup>

        {hasLowerPriorityVerdicts && (
          <>
            <EuiSpacer size="l" />
            <LowerPriorityVerdicts verdicts={lowerPriorityVerdicts} />
          </>
        )}
      </div>
    );
  }

  if (state !== 'critical') {
    return null;
  }

  return (
    <div data-test-subj="sigeventsOverview" css={containerCss}>
      <StatusHeader title={title} description={description} />

      <EuiSpacer size="l" />

      {impactedCards.length > 0 && (
        <>
          <EuiFlexGroup
            direction="column"
            gutterSize="xs"
            data-test-subj="sigeventsOverviewImpactedCards"
          >
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {i18n.translate('xpack.observability.sigeventsOverview.impactedSectionLabel', {
                  defaultMessage: 'Impacted',
                })}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s" responsive={false} wrap>
                {impactedCards.map(({ id, ...card }) => (
                  <EuiFlexItem key={id}>
                    <ImpactedCard {...card} />
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="s" />
        </>
      )}

      <MainSignificantEvent
        blastRadiusScore={blastRadiusScore}
        title={mainEventTitle}
        description={mainEventDescription}
        severityLabel={severityLabel}
        severityColor={severityColor}
        impactedServices={impactedServices}
        lastUpdatedLabel={lastUpdatedLabel}
        onRemediate={onRemediate}
        onViewDetails={onViewDetails}
      />
    </div>
  );
}
