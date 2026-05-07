/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
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
import {
  useFetchLatestSignificantEvent,
  useFetchSystemOverview,
  useFlyoutFocusManagement,
  SigeventsOverview,
  SignificantEventDetailBody,
  SignificantEventDetailHeader,
  StatusHeaderBanner,
  SIGEVENTS_INDEX,
} from '@kbn/sigevents';
import type { EmbeddableConversationProps } from '@kbn/agent-builder-plugin/public';
import type { HealthyMetricCardItem } from '@kbn/sigevents';
import { OBSERVABILITY_SIGNIFICANT_EVENT_ATTACHMENT_TYPE_ID } from '@kbn/observability-agent-builder-plugin/public';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useKibana } from '../../utils/kibana_react';

const MAX_CONTENT_WIDTH = 900;

const containerStyles = css`
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1 1 auto;
  min-height: 0;
`;

const contentColumnStyles = css`
  position: relative;
  width: 100%;
  max-width: ${MAX_CONTENT_WIDTH}px;
  height: 100%;
  min-height: 0;
`;

// The page section wraps its children with `paddingSize="l"` (24px) on every
// side. The banner needs to span the full width of the page, so we cancel out
// that horizontal padding with negative margins. Pulling the top up by the same
// amount lets the banner sit flush with the top of the section while still
// allowing `top: 0` to stick to the scroll container's top edge.
const stickyBannerStyles = (paddingSize: string) => css`
  position: sticky;
  top: 0;
  z-index: 2;
  margin: -${paddingSize} -${paddingSize} 0;
`;

const embeddableConversationWrapperStyles = css`
  [data-test-subj='agentBuilderEmbeddableConversation'] {
    background: transparent;
  }

  /* Hide all spinners so they don't cause layout shift */
  .euiLoadingSpinner {
    display: none;
  }
`;

interface EvidenceReviewResponse {
  status: 'healthy' | 'failing' | 'resolved';
  recommendation: string;
  significantEventId: string;
  trendRange: {
    from: string;
    to: string;
    bucketMinutes: number;
  };
  evidenceItems: ReadonlyArray<{
    ruleName: string;
    lastSeen: string | null;
    trend:
      | { success: true; lensVisualization: Record<string, unknown> }
      | { success: false; error: string };
  }>;
  signals: {
    evidenceRowHits: number;
    eligibleEvidenceCount: number;
    evidenceQueriesWithMatches: number;
  };
}

export function SigeventsOverviewPage() {
  const { ObservabilityPageTemplate } = usePluginContext();
  const { services } = useKibana();
  const { agentBuilder } = services;
  const { euiTheme } = useEuiTheme();
  const history = useHistory();
  const location = useLocation();

  // Strip time range params from the URL — this page does not use a time range
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const hasTimeParams =
      params.has('rangeFrom') ||
      params.has('rangeTo') ||
      params.has('refreshInterval') ||
      params.has('refreshPaused');
    if (hasTimeParams) {
      params.delete('rangeFrom');
      params.delete('rangeTo');
      params.delete('refreshInterval');
      params.delete('refreshPaused');
      history.replace({ ...location, search: params.toString() });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { loading, error, data: eventData, otherPromotedEvents } = useFetchLatestSignificantEvent();
  const {
    loading: overviewLoading,
    error: overviewError,
    data: overviewData,
  } = useFetchSystemOverview();

  const [isDetailFlyoutOpen, setIsDetailFlyoutOpen] = useState(false);
  const [remediationPrompt, setRemediationPrompt] = useState<string | undefined>(undefined);
  const [conversationKey, setConversationKey] = useState(0);
  const [attachments, setAttachments] = useState<EmbeddableConversationProps['attachments']>([]);
  const [isBannerVisible, setIsBannerVisible] = useState(false);
  const [remediationStatus, setRemediationStatus] = useState<EvidenceReviewResponse | undefined>();
  const [isCheckingRemediation, setIsCheckingRemediation] = useState(false);
  const [remediationError, setRemediationError] = useState<string | undefined>();
  const flyoutHeadingId = useGeneratedHtmlId({ prefix: 'sigeventsDetailFlyout' });
  const overviewRef = useRef<HTMLDivElement | null>(null);

  const closeDetailFlyout = useCallback(() => {
    setIsDetailFlyoutOpen(false);
  }, []);

  const { open: openFlyoutFocus } = useFlyoutFocusManagement({
    isOpen: isDetailFlyoutOpen,
    onClose: closeDetailFlyout,
    flyoutTestSubj: 'obltSigeventsDetailFlyout',
  });

  const openDetailFlyout = useCallback(() => {
    openFlyoutFocus();
    setIsDetailFlyoutOpen(true);
  }, [openFlyoutFocus]);

  const buildRemediationPrompt = useCallback((eventTitle: string) => {
    return i18n.translate('xpack.observability.sigeventsOverview.remediationPrompt', {
      defaultMessage:
        'Help me with: {eventTitle}. Use the significant event attachment, validate with live telemetry, and use Review evidence on the overview when you need to re-run ES|QL checks and load trend charts for every rule in one step.',
      values: { eventTitle },
    });
  }, []);

  // Show the sticky banner once the user has scrolled past the centered status
  // header inside the overview. We use a scroll listener (in capture phase) so it
  // works regardless of which ancestor is the actual scroll container, and we
  // measure `getBoundingClientRect` on the StatusHeader element itself so the
  // trigger is reliable on slow incremental scrolls (where IntersectionObserver
  // can miss threshold crossings if the surrounding overview is taller than the
  // viewport).
  useEffect(() => {
    const overviewEl = overviewRef.current;
    if (!overviewEl) {
      return;
    }

    let rafId: number | null = null;

    const compute = () => {
      rafId = null;
      const headerEl = overviewEl.querySelector<HTMLElement>(
        '[data-test-subj="sigeventsOverviewStatusHeader"]'
      );
      if (!headerEl) {
        setIsBannerVisible(false);
        return;
      }
      const rect = headerEl.getBoundingClientRect();
      setIsBannerVisible(rect.bottom <= 0);
    };

    const onScrollOrResize = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(compute);
    };

    compute();

    window.addEventListener('scroll', onScrollOrResize, { capture: true, passive: true });
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScrollOrResize, {
        capture: true,
      } as EventListenerOptions);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [eventData, overviewLoading, loading, error, overviewError]);

  const handleRemediate = useCallback(() => {
    const eventTitle = eventData?.mainEventTitle ?? 'the significant event';
    if (eventData?.raw.event_id) {
      setAttachments([
        {
          type: OBSERVABILITY_SIGNIFICANT_EVENT_ATTACHMENT_TYPE_ID,
          data: {
            index: SIGEVENTS_INDEX,
            eventId: eventData.raw.event_id,
          },
        },
      ]);
    }
    setRemediationPrompt(buildRemediationPrompt(eventTitle));
    setConversationKey((prev) => prev + 1);
  }, [eventData?.mainEventTitle, eventData?.raw.event_id, buildRemediationPrompt]);

  const handleFlyoutRemediate = useCallback(() => {
    handleRemediate();
  }, [handleRemediate]);

  const handleRemediateEvent = useCallback(
    (eventTitle: string, eventId: string) => {
      setAttachments([
        {
          type: OBSERVABILITY_SIGNIFICANT_EVENT_ATTACHMENT_TYPE_ID,
          data: {
            index: SIGEVENTS_INDEX,
            eventId,
          },
        },
      ]);
      setRemediationPrompt(buildRemediationPrompt(eventTitle));
      setConversationKey((prev) => prev + 1);
    },
    [buildRemediationPrompt]
  );

  const EmbeddableConversation = useMemo(
    () => agentBuilder?.getEmbeddableConversation(),
    [agentBuilder]
  );

  useEffect(() => {
    setRemediationStatus(undefined);
    setRemediationError(undefined);
  }, [eventData?.raw.event_id]);

  const detailFields = eventData?.detailFields;

  const runEvidenceReview = useCallback(async () => {
    if (!eventData?.raw.event_id) {
      return;
    }

    setIsCheckingRemediation(true);
    setRemediationError(undefined);
    try {
      const response = await services.http.post<EvidenceReviewResponse>(
        '/internal/observability_agent_builder/significant_events/evidence_review',
        {
          body: JSON.stringify({
            significantEventId: eventData.raw.event_id,
            significantEventsIndex: SIGEVENTS_INDEX,
          }),
        }
      );
      setRemediationStatus(response);
    } catch (err) {
      setRemediationError((err as Error).message);
    } finally {
      setIsCheckingRemediation(false);
    }
  }, [eventData?.raw.event_id, services.http]);

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

    const dangerValueCss = css`
      font-size: ${euiTheme.size.base};
      font-weight: ${euiTheme.font.weight.semiBold};
      color: ${euiTheme.colors.severity.danger};
    `;

    const getSigEventStyling = (
      count: number,
      priority: 'critical' | 'high' | 'medium' | 'low'
    ) => {
      if (count === 0) {
        return {
          valueCss: successValueCss,
          iconType: 'checkInCircleFilled' as const,
          iconBackground: euiTheme.colors.backgroundLightSuccess,
          iconColor: euiTheme.colors.severity.success,
        };
      }
      if (priority === 'critical') {
        return {
          valueCss: dangerValueCss,
          iconType: 'warning' as const,
          iconBackground: euiTheme.colors.backgroundLightDanger,
          iconColor: euiTheme.colors.severity.danger,
        };
      }
      return {
        valueCss: accentValueCss,
        iconType: priority === 'low' ? 'eye' : 'warning',
        iconBackground: euiTheme.colors.backgroundLightAccent,
        iconColor: euiTheme.colors.textAccent,
      };
    };

    const { sigEventsByPriority } = overviewData;
    const criticalStyling = getSigEventStyling(sigEventsByPriority.critical.open, 'critical');
    const highStyling = getSigEventStyling(sigEventsByPriority.high.open, 'high');
    const mediumStyling = getSigEventStyling(sigEventsByPriority.medium.open, 'medium');
    const lowStyling = getSigEventStyling(sigEventsByPriority.low.open, 'low');

    return [
      {
        id: 'services',
        label: i18n.translate('xpack.observability.sigeventsOverviewPage.services', {
          defaultMessage: 'Services',
        }),
        value: <span css={bigValueCss}>{overviewData.serviceCount}</span>,
        iconType: 'layers',
        iconBackground: euiTheme.colors.backgroundBaseSubdued,
        iconColor: euiTheme.colors.textParagraph,
      },
      {
        id: 'entities',
        label: i18n.translate('xpack.observability.sigeventsOverviewPage.entities', {
          defaultMessage: 'Entities',
        }),
        value: <span css={bigValueCss}>{overviewData.entityCount}</span>,
        iconType: 'submodule',
        iconBackground: euiTheme.colors.backgroundBaseSubdued,
        iconColor: euiTheme.colors.textParagraph,
      },
      {
        id: 'technologies',
        label: i18n.translate('xpack.observability.sigeventsOverviewPage.technologies', {
          defaultMessage: 'Technologies',
        }),
        value: <span css={bigValueCss}>{overviewData.technologyCount}</span>,
        iconType: 'desktop',
        iconBackground: euiTheme.colors.backgroundBaseSubdued,
        iconColor: euiTheme.colors.textParagraph,
      },
      {
        id: 'criticalSigEvents',
        label: i18n.translate('xpack.observability.sigeventsOverviewPage.critical', {
          defaultMessage: 'Critical',
        }),
        value: <span css={criticalStyling.valueCss}>{sigEventsByPriority.critical.open}</span>,
        iconType: criticalStyling.iconType,
        iconBackground: criticalStyling.iconBackground,
        iconColor: criticalStyling.iconColor,
      },
      {
        id: 'highSigEvents',
        label: i18n.translate('xpack.observability.sigeventsOverviewPage.high', {
          defaultMessage: 'High',
        }),
        value: <span css={highStyling.valueCss}>{sigEventsByPriority.high.open}</span>,
        iconType: highStyling.iconType,
        iconBackground: highStyling.iconBackground,
        iconColor: highStyling.iconColor,
      },
      {
        id: 'mediumSigEvents',
        label: i18n.translate('xpack.observability.sigeventsOverviewPage.medium', {
          defaultMessage: 'Medium',
        }),
        value: <span css={mediumStyling.valueCss}>{sigEventsByPriority.medium.open}</span>,
        iconType: mediumStyling.iconType,
        iconBackground: mediumStyling.iconBackground,
        iconColor: mediumStyling.iconColor,
      },
      {
        id: 'lowSigEvents',
        label: i18n.translate('xpack.observability.sigeventsOverviewPage.low', {
          defaultMessage: 'Low',
        }),
        value: <span css={lowStyling.valueCss}>{sigEventsByPriority.low.open}</span>,
        iconType: lowStyling.iconType,
        iconBackground: lowStyling.iconBackground,
        iconColor: lowStyling.iconColor,
      },
    ];
  }, [overviewData, euiTheme]);

  return (
    <ObservabilityPageTemplate
      isPageDataLoaded={true}
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
      {isBannerVisible && !loading && !overviewLoading && !error && !overviewError && (
        <div css={stickyBannerStyles(euiTheme.size.l)}>
          <StatusHeaderBanner
            variant={eventData ? 'critical' : 'noCriticalEvents'}
            timestamp={lastUpdatedLabel}
            contentMaxWidth={MAX_CONTENT_WIDTH}
          />
        </div>
      )}
      <div css={containerStyles}>
        <div css={contentColumnStyles}>
          <EuiFlexGroup
            direction="column"
            gutterSize="m"
            style={{ height: '100%', minHeight: 0 }}
            data-test-subj="obltSigeventsConversation"
          >
            <EuiFlexItem grow={false}>
              <div ref={overviewRef}>
                {loading || overviewLoading ? (
                  <EuiFlexGroup
                    direction="column"
                    alignItems="center"
                    gutterSize="s"
                    responsive={false}
                    css={css`
                      padding: ${euiTheme.size.l};
                    `}
                  >
                    <EuiFlexItem grow={false}>
                      <EuiLoadingSpinner size="l" />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                ) : error || overviewError ? (
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
                    body={<p>{(error ?? overviewError)!.message}</p>}
                  />
                ) : eventData ? (
                  <SigeventsOverview
                    state={eventData.state}
                    blastRadiusScore={eventData.blastRadiusScore}
                    mainEventTitle={eventData.mainEventTitle}
                    mainEventDescription={eventData.description}
                    impactedServices={eventData.impactedServices}
                    impactedCards={eventData.impactedCards}
                    healthyMetrics={healthyMetrics}
                    otherPromotedEvents={otherPromotedEvents}
                    lowerPriorityEvents={overviewData?.acknowledgedEvents}
                    lastUpdatedLabel={lastUpdatedLabel}
                    onViewDetails={openDetailFlyout}
                    onRemediate={handleRemediate}
                    onRemediateEvent={handleRemediateEvent}
                  />
                ) : (
                  <SigeventsOverview
                    state="healthy"
                    healthyMetrics={healthyMetrics}
                    lowerPriorityEvents={overviewData?.acknowledgedEvents}
                    onViewDetails={openDetailFlyout}
                    onRemediateEvent={handleRemediateEvent}
                  />
                )}
              </div>
            </EuiFlexItem>

            {EmbeddableConversation && !loading && !overviewLoading && (
              <EuiFlexItem
                grow={true}
                css={embeddableConversationWrapperStyles}
                style={{ minHeight: 0 }}
              >
                <EmbeddableConversation
                  key={conversationKey}
                  sessionTag="sigevents"
                  hideWelcomeTitle
                  hideCloseButton
                  initialTitle="Systems overview"
                  initialMessage={remediationPrompt}
                  autoSendInitialMessage={!!remediationPrompt}
                  autoFocus={false}
                  newConversation={conversationKey > 0}
                  attachments={attachments}
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
                severityScore={detailFields.criticality}
              />
            </div>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <SignificantEventDetailBody
              event={detailFields}
              hideHeader
              onRemediate={handleFlyoutRemediate}
              services={{
                lens: services.lens,
                dataViews: services.dataViews,
                uiActions: services.uiActions,
              }}
              evidenceReview={
                eventData?.raw.event_id
                  ? {
                      runReview: runEvidenceReview,
                      isLoading: isCheckingRemediation,
                      status: remediationStatus,
                      error: remediationError,
                    }
                  : undefined
              }
            />
          </EuiFlyoutBody>
        </EuiFlyout>
      ) : null}
    </ObservabilityPageTemplate>
  );
}
