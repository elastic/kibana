/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiAvatar,
  EuiBadge,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EuiBadgeProps } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { InfoPanel } from './info_panel';
import { MetadataIconCard } from './metadata_icon_card';
import { SignificantEventDetailBody } from './significant_event_detail_body';
import type { RecommendationStep } from '.';

export type SigEventSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface SignificantEvent {
  id: string;
  label: string;
  subtitle: string;
  severityLabel: string;
  severityColor: EuiBadgeProps['color'];
}

export interface SignificantEventsFlyoutProps {
  onClose: () => void;
  events: SignificantEvent[];
  healthyEntities?: number;
  affectedSystems?: number;
  atRiskCount?: number;
  summaryDescription?: string;
  recommendationSteps?: RecommendationStep[];
  onAttachEvent?: (event: SignificantEvent) => void;
  onRemediate?: () => void;
  onOpenDetails?: () => void;
}

export function SignificantEventsFlyout({
  onClose,
  events,
  healthyEntities = 24,
  affectedSystems = 20,
  atRiskCount = 4,
  summaryDescription,
  recommendationSteps,
  onAttachEvent,
  onRemediate,
  onOpenDetails,
}: SignificantEventsFlyoutProps) {
  const { euiTheme } = useEuiTheme();
  const headingId = useGeneratedHtmlId({ prefix: 'sigEventsFlyout' });
  const childFlyoutHeadingId = useGeneratedHtmlId({ prefix: 'sigEventChildFlyoutHeading' });
  const [selectedEvent, setSelectedEvent] = useState<SignificantEvent | null>(null);

  const description =
    summaryDescription ??
    i18n.translate('xpack.observability.sigeventsOverview.sigEvents.summaryIntro', {
      defaultMessage:
        'Significant events highlight unusual patterns in your streams—spikes, drops, or rare combinations worth reviewing before they affect dependent services. The summary below reflects the same framing as Significant Events discovery: what changed, on which streams, and how severe the shift is relative to baseline.',
    });

  const ongoingLabel = i18n.translate(
    'xpack.observability.sigeventsOverview.sigEvents.ongoingStatusLabel',
    { defaultMessage: 'Ongoing' }
  );

  const toggleChildForEvent = useCallback((ev: SignificantEvent) => {
    setSelectedEvent((prev) => (prev?.id === ev.id ? null : ev));
  }, []);

  const closeChild = useCallback(() => {
    setSelectedEvent(null);
  }, []);

  return (
    <EuiFlyout
      type="push"
      side="right"
      size="m"
      onClose={onClose}
      paddingSize="m"
      aria-labelledby={headingId}
      data-test-subj="sigeventsOverviewSignificantEventsFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h2 id={headingId}>
                {i18n.translate('xpack.observability.sigeventsOverview.sigEvents.flyoutTitle', {
                  defaultMessage: 'Active significant events',
                })}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiFlexGroup direction="column" gutterSize="m">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" responsive={true} wrap>
              <EuiFlexItem grow={true}>
                <MetadataIconCard
                  title={i18n.translate(
                    'xpack.observability.sigeventsOverview.sigEvents.metaSeverity',
                    { defaultMessage: 'Healthy entities' }
                  )}
                  iconType="alert"
                  value={String(healthyEntities)}
                  color={euiTheme.colors.backgroundLightSuccess}
                  iconColor={euiTheme.colors.severity.success}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={true}>
                <MetadataIconCard
                  title={i18n.translate(
                    'xpack.observability.sigeventsOverview.sigEvents.metaStream',
                    { defaultMessage: 'Affected systems' }
                  )}
                  iconType="indexOpen"
                  value={String(affectedSystems)}
                  color={euiTheme.colors.backgroundLightDanger}
                  iconColor={euiTheme.colors.severity.danger}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={true}>
                <MetadataIconCard
                  title={i18n.translate(
                    'xpack.observability.sigeventsOverview.sigEvents.metaWindow',
                    { defaultMessage: 'At risk' }
                  )}
                  iconType="clock"
                  value={String(atRiskCount)}
                  color={euiTheme.colors.backgroundLightRisk}
                  iconColor={euiTheme.colors.severity.risk}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <InfoPanel
              title={i18n.translate(
                'xpack.observability.sigeventsOverview.sigEvents.detailsPanelTitle',
                { defaultMessage: 'Summary' }
              )}
            >
              <EuiText size="s">
                <p>{description}</p>
              </EuiText>
            </InfoPanel>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiTitle size="xxs">
              <h3>
                {i18n.translate(
                  'xpack.observability.sigeventsOverview.sigEvents.listHeadingWithTotal',
                  {
                    defaultMessage: 'Significant events ({total})',
                    values: { total: events.length },
                  }
                )}
              </h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiPanel
              hasBorder
              paddingSize="none"
              css={css`
                border-radius: 8px;
              `}
              data-test-subj="sigeventsOverviewSigEventsListPanel"
            >
              {events.map((ev, index) => {
                const isChildOpen = selectedEvent?.id === ev.id;
                return (
                  <React.Fragment key={ev.id}>
                    {index > 0 ? <EuiHorizontalRule margin="none" /> : null}
                    <div
                      css={css`
                        padding: ${euiTheme.size.s} ${euiTheme.size.m};
                      `}
                    >
                      <EuiFlexGroup
                        alignItems="center"
                        gutterSize="s"
                        responsive={false}
                        wrap={false}
                      >
                        <EuiFlexItem grow={false}>
                          <EuiButtonIcon
                            iconType={isChildOpen ? 'minimize' : 'maximize'}
                            display="empty"
                            size="xs"
                            color="text"
                            onClick={() => toggleChildForEvent(ev)}
                            aria-label={
                              isChildOpen
                                ? i18n.translate(
                                    'xpack.observability.sigeventsOverview.sigEvents.collapseDetailsAria',
                                    {
                                      defaultMessage: 'Collapse details for {name}',
                                      values: { name: ev.label },
                                    }
                                  )
                                : i18n.translate(
                                    'xpack.observability.sigeventsOverview.sigEvents.expandDetailsAria',
                                    {
                                      defaultMessage: 'Open details for {name}',
                                      values: { name: ev.label },
                                    }
                                  )
                            }
                            aria-expanded={isChildOpen}
                            data-test-subj={`sigeventsOverviewSigEventExpand-${ev.id}`}
                          />
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiAvatar
                            type="space"
                            size="s"
                            name={ongoingLabel}
                            iconType="play"
                            color={euiTheme.colors.backgroundLightAccent}
                            iconColor={euiTheme.colors.accentText}
                            aria-label={ongoingLabel}
                          />
                        </EuiFlexItem>
                        <EuiFlexItem grow={true}>
                          <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
                            <EuiFlexItem grow={false}>
                              <EuiText
                                size="xs"
                                css={css`
                                  font-weight: ${euiTheme.font.weight.medium};
                                `}
                              >
                                {ev.label}
                              </EuiText>
                            </EuiFlexItem>
                          </EuiFlexGroup>
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiBadge color={ev.severityColor}>{ev.severityLabel}</EuiBadge>
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiButtonIcon
                            data-test-subj="o11ySignificantEventsFlyoutButton"
                            iconType="paperClip"
                            display="empty"
                            size="xs"
                            color="text"
                            onClick={() => onAttachEvent?.(ev)}
                            aria-label={i18n.translate(
                              'xpack.observability.sigeventsOverview.sigEvents.attachAria',
                              {
                                defaultMessage: 'Attach context for {name}',
                                values: { name: ev.label },
                              }
                            )}
                          />
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiButtonIcon
                            data-test-subj="o11ySignificantEventsFlyoutButton"
                            iconType="boxesVertical"
                            display="empty"
                            size="xs"
                            color="text"
                            aria-label={i18n.translate(
                              'xpack.observability.sigeventsOverview.sigEvents.rowMenuAria',
                              {
                                defaultMessage: 'More actions for {name}',
                                values: { name: ev.label },
                              }
                            )}
                          />
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </div>
                  </React.Fragment>
                );
              })}
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutBody>

      {selectedEvent ? (
        <EuiFlyout
          type="push"
          side="right"
          size="s"
          onClose={closeChild}
          ownFocus={false}
          pushMinBreakpoint="xs"
          paddingSize="m"
          aria-labelledby={childFlyoutHeadingId}
          data-test-subj="sigeventsOverviewSignificantEventChildFlyout"
        >
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="xs">
              <h2 id={childFlyoutHeadingId}>{selectedEvent.label}</h2>
            </EuiTitle>
            <EuiSpacer size="xs" />
            <EuiText size="s" color="subdued">
              <p>
                {i18n.translate('xpack.observability.significantEventsFlyout.p.janLabel', {
                  defaultMessage: 'Jan 18, 2025 @ 14:12:31',
                })}
              </p>
            </EuiText>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <SignificantEventDetailBody
              event={selectedEvent}
              recommendationSteps={recommendationSteps}
              onRemediate={onRemediate}
              onOpenDetails={onOpenDetails}
            />
          </EuiFlyoutBody>
        </EuiFlyout>
      ) : null}
    </EuiFlyout>
  );
}
