/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiLoadingSpinner,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedRelativeTime } from '@kbn/i18n-react';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useKibana } from '../../utils/kibana_react';
import { useFetchLatestSignificantEvent } from '../../hooks/use_fetch_latest_significant_event';
import { useFetchSystemOverview } from '../../hooks/use_fetch_system_overview';
import { SigeventsOverview } from '../../components/sigevents_overview';
import type { HealthyMetricCardItem } from '../../components/sigevents_overview';
import { SignificantEventDetailBody } from '../../components/sigevents_overview/significant_event_detail_body';
import { SignificantEventDetailHeader } from '../../components/sigevents_overview/significant_event_detail_header';

const MAX_CONTENT_WIDTH = 900;

const containerStyles = css`
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  min-height: 0;
`;

const contentColumnStyles = css`
  width: 100%;
  max-width: ${MAX_CONTENT_WIDTH}px;
  height: 100%;
  min-height: 0;
`;

const embeddableConversationWrapperStyles = css`
  [data-test-subj='agentBuilderEmbeddableConversation'] {
    background: transparent;
  }
`;

export function SigeventsOverviewPage() {
  const { ObservabilityPageTemplate } = usePluginContext();
  const { services } = useKibana();
  const { agentBuilder } = services;
  const { euiTheme } = useEuiTheme();

  const { loading, error, data: eventData, otherPromotedEvents } = useFetchLatestSignificantEvent();
  const { loading: overviewLoading, data: overviewData } = useFetchSystemOverview();

  const [isDetailFlyoutOpen, setIsDetailFlyoutOpen] = useState(false);
  const [remediationPrompt, setRemediationPrompt] = useState<string | undefined>(undefined);
  const flyoutHeadingId = useGeneratedHtmlId({ prefix: 'sigeventsDetailFlyout' });

  const openDetailFlyout = useCallback(() => setIsDetailFlyoutOpen(true), []);
  const closeDetailFlyout = useCallback(() => setIsDetailFlyoutOpen(false), []);

  const handleRemediate = useCallback(() => {
    const eventTitle = eventData?.mainEventTitle ?? 'the significant event';
    setRemediationPrompt(
      i18n.translate('xpack.observability.sigeventsOverview.remediationPrompt', {
        defaultMessage:
          'Help me remediate: {eventTitle}. What are the possible root causes and recommended next steps?',
        values: { eventTitle },
      })
    );
  }, [eventData?.mainEventTitle]);

  const handleFlyoutRemediate = useCallback(() => {
    handleRemediate();
    closeDetailFlyout();
  }, [handleRemediate, closeDetailFlyout]);

  const handleRemediateVerdict = useCallback((eventTitle: string) => {
    setRemediationPrompt(
      i18n.translate('xpack.observability.sigeventsOverview.remediationPrompt', {
        defaultMessage:
          'Help me remediate: {eventTitle}. What are the possible root causes and recommended next steps?',
        values: { eventTitle },
      })
    );
  }, []);

  const EmbeddableConversation = useMemo(
    () => agentBuilder?.getEmbeddableConversation(),
    [agentBuilder]
  );

  const detailFields = eventData?.detailFields;

  const lastUpdatedLabel = useMemo(() => {
    if (!eventData?.timestamp) {
      return undefined;
    }
    const timestampMs = new Date(eventData.timestamp).getTime();
    const nowMs = Date.now();
    const diffSeconds = Math.round((timestampMs - nowMs) / 1000);
    return (
      <>
        (<FormattedRelativeTime value={diffSeconds} numeric="auto" updateIntervalInSeconds={60} />)
      </>
    );
  }, [eventData?.timestamp]);

  const healthyMetrics: HealthyMetricCardItem[] | undefined = useMemo(() => {
    if (!overviewData) {
      return undefined;
    }

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

    const serviceCount = overviewData.services.length;

    const getRiskCardStyling = (count: number) => {
      const hasValue = count > 0;
      return {
        valueCss: hasValue ? accentValueCss : successValueCss,
        iconBackground: hasValue
          ? euiTheme.colors.backgroundLightAccent
          : euiTheme.colors.backgroundLightSuccess,
        iconColor: hasValue ? euiTheme.colors.textAccent : euiTheme.colors.severity.success,
      };
    };

    const highStyling = getRiskCardStyling(overviewData.highCount);
    const mediumStyling = getRiskCardStyling(overviewData.mediumCount);
    const lowStyling = getRiskCardStyling(overviewData.lowCount);

    return [
      {
        id: 'services',
        label: i18n.translate('xpack.observability.sigeventsOverviewPage.services', {
          defaultMessage: 'Services',
        }),
        value: <span css={bigValueCss}>{serviceCount}</span>,
        iconType: 'package',
        iconBackground: euiTheme.colors.backgroundBaseSubdued,
        iconColor: euiTheme.colors.textParagraph,
      },
      {
        id: 'detections',
        label: i18n.translate('xpack.observability.sigeventsOverviewPage.detections', {
          defaultMessage: 'Detections',
        }),
        value: <span css={bigValueCss}>{overviewData.detectionCount}</span>,
        iconType: 'eye',
        iconBackground: euiTheme.colors.backgroundBaseSubdued,
        iconColor: euiTheme.colors.textParagraph,
      },
      {
        id: 'highRisk',
        label: i18n.translate('xpack.observability.sigeventsOverviewPage.high', {
          defaultMessage: 'High',
        }),
        value: <span css={highStyling.valueCss}>{overviewData.highCount}</span>,
        iconType: 'warning',
        iconBackground: highStyling.iconBackground,
        iconColor: highStyling.iconColor,
      },
      {
        id: 'mediumRisk',
        label: i18n.translate('xpack.observability.sigeventsOverviewPage.medium', {
          defaultMessage: 'Medium',
        }),
        value: <span css={mediumStyling.valueCss}>{overviewData.mediumCount}</span>,
        iconType: 'warning',
        iconBackground: mediumStyling.iconBackground,
        iconColor: mediumStyling.iconColor,
      },
      {
        id: 'lowRisk',
        label: i18n.translate('xpack.observability.sigeventsOverviewPage.low', {
          defaultMessage: 'Low',
        }),
        value: <span css={lowStyling.valueCss}>{overviewData.lowCount}</span>,
        iconType: 'eye',
        iconBackground: lowStyling.iconBackground,
        iconColor: lowStyling.iconColor,
      },
    ];
  }, [overviewData, euiTheme]);

  return (
    <ObservabilityPageTemplate
      isPageDataLoaded={!loading && !overviewLoading}
      data-test-subj="obltSigeventsOverviewPageHeader"
      pageSectionProps={{
        grow: true,
        contentProps: {
          style: {
            display: 'flex',
            flexDirection: 'column',
            flexGrow: 1,
          },
        },
      }}
    >
      <div css={containerStyles}>
        <div css={contentColumnStyles}>
          <EuiFlexGroup
            direction="column"
            gutterSize="m"
            style={{ height: '100%', minHeight: 0 }}
            data-test-subj="obltSigeventsConversation"
          >
            <EuiFlexItem grow={false}>
              {loading || overviewLoading ? (
                <EuiEmptyPrompt
                  icon={<EuiLoadingSpinner size="xl" />}
                  title={
                    <h2>
                      {i18n.translate('xpack.observability.sigeventsOverview.loadingTitle', {
                        defaultMessage: 'Loading significant events...',
                      })}
                    </h2>
                  }
                />
              ) : error ? (
                <EuiEmptyPrompt
                  iconType="warning"
                  color="danger"
                  title={
                    <h2>
                      {i18n.translate('xpack.observability.sigeventsOverview.errorTitle', {
                        defaultMessage: 'Unable to load significant events',
                      })}
                    </h2>
                  }
                  body={<p>{error.message}</p>}
                />
              ) : eventData ? (
                <SigeventsOverview
                  state={eventData.state}
                  blastRadiusScore={eventData.blastRadiusScore}
                  mainEventTitle={eventData.mainEventTitle}
                  mainEventDescription={eventData.description}
                  severityLabel={eventData.severityLabel}
                  severityColor={eventData.severityColor}
                  impactedServices={eventData.impactedServices}
                  impactedCards={eventData.impactedCards}
                  healthyMetrics={healthyMetrics}
                  otherPromotedEvents={otherPromotedEvents}
                  lowerPriorityVerdicts={overviewData?.verdicts}
                  lastUpdatedLabel={lastUpdatedLabel}
                  onViewDetails={openDetailFlyout}
                  onRemediate={handleRemediate}
                  onRemediateVerdict={handleRemediateVerdict}
                />
              ) : (
                <SigeventsOverview
                  state="healthy"
                  healthyMetrics={healthyMetrics}
                  lowerPriorityVerdicts={overviewData?.verdicts}
                  onViewDetails={openDetailFlyout}
                  onRemediateVerdict={handleRemediateVerdict}
                />
              )}
            </EuiFlexItem>

            {EmbeddableConversation && (
              <EuiFlexItem
                grow={true}
                css={embeddableConversationWrapperStyles}
                style={{ minHeight: 0 }}
              >
                <EmbeddableConversation
                  sessionTag="sigevents"
                  hideWelcomeTitle
                  hideCloseButton
                  initialTitle="Systems overview"
                  initialMessage={remediationPrompt}
                  autoSendInitialMessage={!!remediationPrompt}
                  autoFocus={false}
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </div>
      </div>

      {isDetailFlyoutOpen && detailFields ? (
        <EuiFlyout
          type="push"
          side="right"
          size={620}
          paddingSize="m"
          onClose={closeDetailFlyout}
          aria-labelledby={flyoutHeadingId}
          data-test-subj="obltSigeventsDetailFlyout"
        >
          <EuiFlyoutHeader hasBorder>
            <div id={flyoutHeadingId}>
              <SignificantEventDetailHeader
                title={detailFields.label}
                severityLabel={detailFields.severityLabel}
                severityColor={detailFields.severityColor}
              />
            </div>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <SignificantEventDetailBody
              event={detailFields}
              hideHeader
              onRemediate={handleFlyoutRemediate}
            />
          </EuiFlyoutBody>
        </EuiFlyout>
      ) : null}
    </ObservabilityPageTemplate>
  );
}
