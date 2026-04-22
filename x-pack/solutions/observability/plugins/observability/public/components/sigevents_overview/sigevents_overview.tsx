/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { BlastRadiusSummaryPanel } from './blast_radius_summary_panel';
import type { EntityRowConfig, SignificantEvent, StreamMetricConfig, RemediationStep } from '.';

export type SigEventSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface SigeventsOverviewProps {
  state?: 'critical' | 'warning' | 'healthy';
  blastRadiusScore?: number;
  criticalCount?: number;
  highCount?: number;
  significantEventsCount?: number;
  entities?: EntityRowConfig[];
  significantEvents?: SignificantEvent[];
  metrics?: StreamMetricConfig[];
  remediationSteps?: RemediationStep[];
  onRemediate?: () => void;
  onRunInBackground?: () => void;
  onAttachEntity?: (entity: EntityRowConfig) => void;
  onAttachEvent?: (event: SignificantEvent) => void;
  onOpenConversation?: () => void;
}

export const SigeventsOverview: React.FC<SigeventsOverviewProps> = ({
  state = 'critical',
  blastRadiusScore,
  criticalCount,
  highCount,
  significantEventsCount,
  entities,
  significantEvents,
  metrics,
  remediationSteps,
  onRemediate,
  onRunInBackground,
  onAttachEntity,
  onAttachEvent,
  onOpenConversation,
}) => {
  const { euiTheme } = useEuiTheme();

  if (state !== 'critical') {
    return null;
  }

  return (
    <div
      data-test-subj="sigeventsOverview"
      css={css`
        width: 100%;
        box-sizing: border-box;
        padding: ${euiTheme.size.l};
      `}
    >
      <EuiFlexGroup direction="column" alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiBadge iconType="moon" color="hollow">
            {i18n.translate('xpack.observability.sigeventsOverview.modeBadge', {
              defaultMessage: 'SIGNIFICANT EVENTS',
            })}
          </EuiBadge>
        </EuiFlexItem>
        <EuiSpacer size="s" />
        <EuiFlexItem grow={false}>
          <EuiFlexGroup
            responsive={false}
            alignItems="center"
            gutterSize="m"
            justifyContent="center"
          >
            <EuiFlexItem grow={false}>
              <EuiIcon type="radar" size="l" color="danger" aria-hidden />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiTitle size="m">
                <h2
                  css={css`
                    color: ${euiTheme.colors.dangerText};
                  `}
                >
                  {i18n.translate('xpack.observability.sigeventsOverview.mainHeading', {
                    defaultMessage: 'Your system requires attention',
                  })}
                </h2>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText
            size="xs"
            color="subdued"
            textAlign="center"
            css={css`
              max-width: 640px;
            `}
          >
            <p>
              {i18n.translate('xpack.observability.sigeventsOverview.introDescription', {
                defaultMessage:
                  'Our system is detecting more unusual behaviour than normal, review your Blast radius summary and initiate actions.',
              })}
            </p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="l" />

      <BlastRadiusSummaryPanel
        blastRadiusScore={blastRadiusScore}
        criticalCount={criticalCount}
        highCount={highCount}
        significantEventsCount={significantEventsCount}
        entities={entities}
        significantEvents={significantEvents}
        metrics={metrics}
        remediationSteps={remediationSteps}
        onRemediate={onRemediate}
        onRunInBackground={onRunInBackground}
        onAttachEntity={onAttachEntity}
        onAttachEvent={onAttachEvent}
        onOpenConversation={onOpenConversation}
      />
    </div>
  );
};
