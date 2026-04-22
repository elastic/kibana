/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiBadge,
  EuiBadgeGroup,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiBadgeProps, EuiIconProps } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { SignificantEventsFlyout } from './significant_events_flyout';
import { BlastRadiusDonut } from './blast_radius_donut';
import { BlastRadiusEntityFlyout } from './blast_radius_entity_flyout';
import type { SignificantEvent, StreamMetricConfig, RemediationStep } from '.';

const CRITICAL_SCORE_THRESHOLD = 80;
const BLAST_RADIUS_CARD_BORDER_RADIUS = '16px';

export interface EntityRowConfig {
  id: string;
  title: string;
  iconType: EuiIconProps['type'];
  iconColor: EuiIconProps['color'];
  badgeLabel: string;
  badgeColor: EuiBadgeProps['color'];
}

export interface BlastRadiusSummaryPanelProps {
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

const DEFAULT_ENTITIES: EntityRowConfig[] = [
  {
    id: 'critical',
    title: 'Critically affected entities',
    iconType: 'errorFilled',
    iconColor: 'danger',
    badgeLabel: '6/48',
    badgeColor: 'danger',
  },
  {
    id: 'high',
    title: 'High risk entities',
    iconType: 'alert',
    iconColor: 'warning',
    badgeLabel: '6/48',
    badgeColor: 'warning',
  },
  {
    id: 'sig',
    title: 'Active significant events',
    iconType: 'errorFilled',
    iconColor: 'danger',
    badgeLabel: '24',
    badgeColor: 'danger',
  },
];

const DEFAULT_SIGNIFICANT_EVENTS: SignificantEvent[] = [
  {
    id: '1',
    label: 'Fleet Server Dependency Chain - Single Point of Failure',
    subtitle: 'logs · fleet-coordination',
    severityLabel: 'Critical',
    severityColor: 'danger',
  },
  {
    id: '2',
    label: 'Central Authentication Server - Outage Impact',
    subtitle: 'metrics · identity',
    severityLabel: 'High',
    severityColor: 'warning',
  },
  {
    id: '3',
    label: 'Payment Gateway Integration - Downtime Risk',
    subtitle: 'logs · checkout',
    severityLabel: 'Critical',
    severityColor: 'danger',
  },
];

export const BlastRadiusSummaryPanel: React.FC<BlastRadiusSummaryPanelProps> = ({
  blastRadiusScore = 85,
  criticalCount = 6,
  highCount = 7,
  significantEventsCount = 24,
  entities = DEFAULT_ENTITIES,
  significantEvents = DEFAULT_SIGNIFICANT_EVENTS,
  metrics,
  remediationSteps,
  onRemediate,
  onRunInBackground,
  onAttachEntity,
  onAttachEvent,
  onOpenConversation,
}) => {
  const { euiTheme } = useEuiTheme();
  const isCriticalBlast = blastRadiusScore > CRITICAL_SCORE_THRESHOLD;

  const [openEntityId, setOpenEntityId] = useState<string | null>(null);
  const openEntity = openEntityId ? entities.find((e) => e.id === openEntityId) : undefined;

  const closeFlyout = useCallback(() => setOpenEntityId(null), []);

  const outerCardCss = css`
    border: ${euiTheme.border.thin};
    border-radius: ${BLAST_RADIUS_CARD_BORDER_RADIUS};
    overflow: hidden;
    width: 100%;
    box-sizing: border-box;
  `;

  const topSectionCss = css`
    background: ${euiTheme.colors.backgroundBaseSubdued};
    padding: ${euiTheme.size.l};
  `;

  const bottomSectionCss = css`
    background: ${euiTheme.colors.backgroundBasePlain};
    padding: ${euiTheme.size.m} ${euiTheme.size.l} ${euiTheme.size.l} ${euiTheme.size.l};
  `;

  return (
    <>
      <div css={outerCardCss} data-test-subj="sigeventsOverviewBlastRadiusPanel">
        <div css={topSectionCss}>
          <EuiFlexGroup responsive={false} alignItems="flexStart" gutterSize="l">
            <EuiFlexItem grow={false}>
              <BlastRadiusDonut score={blastRadiusScore} isCritical={isCriticalBlast} />
            </EuiFlexItem>
            <EuiFlexItem grow={true}>
              <EuiFlexGroup
                responsive={false}
                alignItems="flexStart"
                justifyContent="spaceBetween"
                gutterSize="m"
              >
                <EuiFlexItem grow={false}>
                  <EuiText size="s" color="subdued">
                    {i18n.translate('xpack.observability.sigeventsOverview.blastRadiusLabel', {
                      defaultMessage: 'Blast radius score',
                    })}
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup responsive={false} alignItems="center" gutterSize="xs">
                    <EuiFlexItem grow={false}>
                      <EuiText size="xs" color="subdued">
                        {i18n.translate('xpack.observability.sigeventsOverview.scoreTimestamp', {
                          defaultMessage: '(5 minutes ago)',
                        })}
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiButtonIcon
                        data-test-subj="o11yBlastRadiusSummaryPanelButton"
                        iconType="refresh"
                        color="text"
                        display="empty"
                        size="xs"
                        aria-label={i18n.translate(
                          'xpack.observability.sigeventsOverview.refreshScoreAria',
                          { defaultMessage: 'Refresh blast radius score' }
                        )}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiButtonIcon
                        data-test-subj="o11yBlastRadiusSummaryPanelButton"
                        iconType="boxesVertical"
                        color="text"
                        display="empty"
                        size="xs"
                        aria-label={i18n.translate(
                          'xpack.observability.sigeventsOverview.scoreMoreActionsAria',
                          { defaultMessage: 'More blast radius score actions' }
                        )}
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiTitle
                size="m"
                css={{ color: euiTheme.colors.dangerText, marginTop: euiTheme.size.xs }}
              >
                <span css={{ color: euiTheme.colors.dangerText }}>
                  {i18n.translate('xpack.observability.sigeventsOverview.blastLevelHigh', {
                    defaultMessage: 'HIGH',
                  })}
                </span>
              </EuiTitle>
              <EuiSpacer size="s" />
              <EuiText size="s">
                <FormattedMessage
                  id="xpack.observability.sigeventsOverview.blastExplanation"
                  defaultMessage="The blast radius is measured high due to {criticalBadge} and {highBadge} severity impacted entities due to {eventsBadge} detected."
                  values={{
                    criticalBadge: (
                      <EuiBadge color="danger">
                        {criticalCount}{' '}
                        {i18n.translate(
                          'xpack.observability.blastRadiusSummaryPanel.criticalBadgeLabel',
                          { defaultMessage: 'Critical' }
                        )}
                      </EuiBadge>
                    ),
                    highBadge: (
                      <EuiBadge color="warning">
                        {highCount}{' '}
                        {i18n.translate(
                          'xpack.observability.blastRadiusSummaryPanel.highBadgeLabel',
                          { defaultMessage: 'High' }
                        )}
                      </EuiBadge>
                    ),
                    eventsBadge: (
                      <EuiBadge color="danger" iconType="layers">
                        {significantEventsCount}{' '}
                        {i18n.translate(
                          'xpack.observability.blastRadiusSummaryPanel.significantEventsBadgeLabel',
                          { defaultMessage: 'Significant events' }
                        )}
                      </EuiBadge>
                    ),
                  }}
                />
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="m" />

          <EuiPanel
            hasBorder
            paddingSize="none"
            borderRadius="m"
            color="plain"
            data-test-subj="sigeventsOverviewBlastRadiusEntityListPanel"
          >
            <EuiFlexGroup direction="column" gutterSize="none">
              {entities.map((entity, index) => (
                <React.Fragment key={entity.id}>
                  {index > 0 ? <EuiHorizontalRule margin="none" /> : null}
                  <EuiFlexGroup
                    responsive={false}
                    alignItems="center"
                    gutterSize="s"
                    css={css`
                      padding: ${euiTheme.size.s} ${euiTheme.size.m};
                    `}
                  >
                    <EuiFlexItem grow={false}>
                      <EuiButtonIcon
                        data-test-subj="o11yBlastRadiusSummaryPanelButton"
                        iconType="maximize"
                        display="empty"
                        size="xs"
                        color="text"
                        onClick={() => setOpenEntityId(entity.id)}
                        aria-label={i18n.translate(
                          'xpack.observability.sigeventsOverview.openEntityDetailsAria',
                          {
                            defaultMessage: 'Open details for {title}',
                            values: { title: entity.title },
                          }
                        )}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiIcon
                        type={entity.iconType}
                        color={entity.iconColor}
                        size="m"
                        aria-hidden
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={true}>
                      <EuiText size="s">{entity.title}</EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiBadgeGroup gutterSize="s">
                        <EuiBadge color={entity.badgeColor}>{entity.badgeLabel}</EuiBadge>
                      </EuiBadgeGroup>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiButtonIcon
                        data-test-subj="o11yBlastRadiusSummaryPanelButton"
                        iconType="paperClip"
                        display="empty"
                        size="xs"
                        color="text"
                        onClick={() => onAttachEntity?.(entity)}
                        aria-label={i18n.translate(
                          'xpack.observability.sigeventsOverview.attachContextAria',
                          {
                            defaultMessage: 'Attach context for {title}',
                            values: { title: entity.title },
                          }
                        )}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiButtonIcon
                        data-test-subj="o11yBlastRadiusSummaryPanelButton"
                        iconType="boxesVertical"
                        display="empty"
                        size="xs"
                        color="text"
                        aria-label={i18n.translate(
                          'xpack.observability.sigeventsOverview.entityMenuAria',
                          {
                            defaultMessage: 'More actions for {title}',
                            values: { title: entity.title },
                          }
                        )}
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </React.Fragment>
              ))}
            </EuiFlexGroup>
          </EuiPanel>
        </div>

        <div css={bottomSectionCss}>
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate('xpack.observability.sigeventsOverview.panelFooter.lead', {
                defaultMessage:
                  'You can start remediation now with Elastic Agent Builder and understand how to solve these system issues.',
              })}
            </p>
          </EuiText>
          <EuiSpacer size="s" />
          <EuiFlexGroup responsive={false} wrap gutterSize="xs">
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="o11yBlastRadiusSummaryPanelRemediateButton"
                size="s"
                iconType="sparkles"
                onClick={onRemediate}
              >
                {i18n.translate('xpack.observability.sigeventsOverview.remediate', {
                  defaultMessage: 'Remediate',
                })}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                data-test-subj="o11yBlastRadiusSummaryPanelRunInBackgroundButton"
                size="s"
                iconType="backgroundTask"
                color="primary"
                onClick={onRunInBackground}
              >
                {i18n.translate('xpack.observability.sigeventsOverview.runInBackground', {
                  defaultMessage: 'Run in background',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                data-test-subj="o11yBlastRadiusSummaryPanelButton"
                color="text"
                iconType="ellipsis"
                size="s"
                aria-label={i18n.translate(
                  'xpack.observability.blastRadiusSummaryPanel.euiButtonIcon.moreActionsLabel',
                  { defaultMessage: 'More actions' }
                )}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </div>

      {openEntity ? (
        openEntity.id === 'sig' ? (
          <SignificantEventsFlyout
            onClose={closeFlyout}
            events={significantEvents}
            metrics={metrics}
            remediationSteps={remediationSteps}
            onAttachEvent={onAttachEvent}
            onRemediate={onRemediate}
            onRunInBackground={onRunInBackground}
            onOpenConversation={onOpenConversation}
          />
        ) : (
          <BlastRadiusEntityFlyout title={openEntity.title} onClose={closeFlyout} />
        )
      ) : null}
    </>
  );
};
