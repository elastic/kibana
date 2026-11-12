/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiButton,
  EuiEmptyPrompt,
  EuiLoadingLogo,
  EuiPageSection,
  EuiPanel,
  EuiProgress,
  useResizeObserver,
  EuiSpacer,
  EuiTitle,
  copyToClipboard,
} from '@elastic/eui';
import { AppHeader } from '@kbn/app-header';
import type { IHttpFetchError } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { getEbtProps } from '@kbn/ebt-click';
import { useAbortableAsync } from '@kbn/react-hooks';
import { KbnWarningCallout } from '@kbn/ui-callout';
import type { AppHeaderBadge, AppHeaderMetadataItems } from '@kbn/app-header';
import type { SessionDetailResponse, SessionSummary as Session } from '../../../common/sessions';
import { useRouteBreadcrumb } from '../../breadcrumbs/use_route_breadcrumb';
import { LoadErrorPrompt } from '../../components/load_error_prompt';
import { DIGITAL_EXPERIENCE_EBT_ACTIONS, SESSIONS_EBT_ELEMENTS } from '../../ebt_constants';
import { useApiClient } from '../../hooks/use_api_client';
import { useHideSideNav } from '../../application/side_nav_context';
import { useApplicationLinks } from '../../hooks/use_application_links';
import { useDiscoverHref } from '../../hooks/use_discover_href';
import { usePersistedChoice } from '../../hooks/use_persisted_choice';
import { useDigitalExperienceParams } from '../../hooks/use_digital_experience_params';
import { useFormatters } from '../../hooks/use_formatters';
import { useKibanaServices } from '../../hooks/use_kibana_services';
import { ANONYMOUS_USER, SESSIONS_LABEL } from '../../labels';
import { shortSessionId } from '../../utils/describe_session';
import { formatSessionDuration } from '../../utils/format_session_duration';
import { pickSessionsListQuery } from '../../utils/sessions_list_query';
import { JourneyFilters } from './components/journey_filters';
import { SessionSplitView } from './components/session_split_view';
import { SessionsRail } from './components/sessions_rail';
import { PageJourney } from './components/page_journey';
import { SessionSummary } from './components/session_summary';
import { SessionWaterfall, pageColors } from './components/session_waterfall';
import { sessionEsqlQuery, sessionTimeRange } from './utils/session_discover';
import { groupEventsByVisit, layoutWaterfall } from './utils/session_timeline';
import { ACTIVITY_KINDS, type ActivityFilters, type ActivityKind } from './utils/visit_activity';

const BACK_TO_SESSIONS = i18n.translate(
  'xpack.digitalExperience.sessionDetail.backToSessionsButtonLabel',
  { defaultMessage: 'Back to sessions' }
);

const SESSION_ID_LABEL = i18n.translate('xpack.digitalExperience.sessionDetail.sessionIdLabel', {
  defaultMessage: 'Session ID',
});

const COPY_ID_LABEL = i18n.translate('xpack.digitalExperience.sessionDetail.copyIdLabel', {
  defaultMessage: 'Copy ID',
});

const USER_LABEL = i18n.translate('xpack.digitalExperience.sessionDetail.userLabel', {
  defaultMessage: 'User',
});

const STARTED_LABEL = i18n.translate('xpack.digitalExperience.sessionDetail.startedLabel', {
  defaultMessage: 'Started',
});

const SESSIONS_LIST_LABEL = i18n.translate(
  'xpack.digitalExperience.sessionDetail.sessionsListLabel',
  { defaultMessage: 'Sessions list' }
);

/**
 * Where the sessions list shows beside a session, kept across visits. A value stored before the
 * list could move, `open`, falls back to the left, where it was.
 */
const RAIL_STORAGE_KEY = 'digitalExperience.sessionDetail.rail';
const RAIL_PLACEMENTS = ['left', 'right', 'hidden'] as const;
type RailPlacement = (typeof RAIL_PLACEMENTS)[number];

const RAIL_PLACEMENT_OPTIONS: ReadonlyArray<{
  placement: RailPlacement;
  label: string;
  iconType: string;
}> = [
  {
    placement: 'left',
    label: i18n.translate('xpack.digitalExperience.sessionDetail.sessionsList.showLeft', {
      defaultMessage: 'Show on the left',
    }),
    iconType: 'transitionLeftIn',
  },
  {
    placement: 'right',
    label: i18n.translate('xpack.digitalExperience.sessionDetail.sessionsList.showRight', {
      defaultMessage: 'Show on the right',
    }),
    iconType: 'transitionRightIn',
  },
  {
    placement: 'hidden',
    label: i18n.translate('xpack.digitalExperience.sessionDetail.sessionsList.hide', {
      defaultMessage: 'Hide',
    }),
    iconType: 'eyeSlash',
  },
];

const OPEN_IN_DISCOVER_LABEL = i18n.translate(
  'xpack.digitalExperience.sessionDetail.openInDiscoverLabel',
  { defaultMessage: 'Open in Discover' }
);

/** What kind of session it is, at a glance: its errors, failed requests, bounce and environment. */
const sessionBadges = (session: Session): AppHeaderBadge[] => [
  ...(session.jsErrorCount > 0
    ? [
        {
          label: i18n.translate('xpack.digitalExperience.sessionDetail.badges.jsErrors', {
            defaultMessage: '{count, plural, one {# JS error} other {# JS errors}}',
            values: { count: session.jsErrorCount },
          }),
          color: 'danger' as const,
          'data-test-subj': 'digitalExperienceSessionBadge-jsErrors',
        },
      ]
    : []),
  ...(session.failedRequestCount > 0
    ? [
        {
          label: i18n.translate('xpack.digitalExperience.sessionDetail.badges.failedRequests', {
            defaultMessage: '{count, plural, one {# failed request} other {# failed requests}}',
            values: { count: session.failedRequestCount },
          }),
          color: 'warning' as const,
          'data-test-subj': 'digitalExperienceSessionBadge-failedRequests',
        },
      ]
    : []),
  ...(session.bounced
    ? [
        {
          label: i18n.translate('xpack.digitalExperience.sessionDetail.badges.bounced', {
            defaultMessage: 'Bounced',
          }),
          tooltip: i18n.translate('xpack.digitalExperience.sessionDetail.badges.bouncedTooltip', {
            defaultMessage: 'The user left after viewing one page.',
          }),
          color: 'hollow' as const,
          'data-test-subj': 'digitalExperienceSessionBadge-bounced',
        },
      ]
    : []),
  ...(session.environment
    ? [
        {
          label: session.environment,
          tooltip: i18n.translate(
            'xpack.digitalExperience.sessionDetail.badges.environmentTooltip',
            { defaultMessage: 'Environment' }
          ),
          color: 'hollow' as const,
          'data-test-subj': 'digitalExperienceSessionBadge-environment',
        },
      ]
    : []),
];

const ID_COPIED_LABEL = i18n.translate('xpack.digitalExperience.sessionDetail.idCopiedToast', {
  defaultMessage: 'Session ID copied',
});

const loadingPrompt = (
  <EuiEmptyPrompt
    data-test-subj="digitalExperienceSessionLoading"
    icon={<EuiLoadingLogo logo="logoObservability" size="xl" />}
    title={
      <h2>
        {i18n.translate('xpack.digitalExperience.sessionDetail.loadingTitle', {
          defaultMessage: 'Loading the session',
        })}
      </h2>
    }
  />
);

const isNotFound = (error: Error): boolean => (error as IHttpFetchError).response?.status === 404;

function SessionDetail({
  detail,
  formatters,
}: {
  detail: SessionDetailResponse;
  formatters: ReturnType<typeof useFormatters>;
}) {
  const { session, pageVisits, timeline, timelineTruncated, requests, requestsTruncated } = detail;
  const [filters, setFilters] = useState<ActivityFilters>(() => ({
    kinds: new Set(ACTIVITY_KINDS),
    search: '',
  }));
  const visitElements = useRef(new Map<number, HTMLElement>());
  const colors = useMemo(() => pageColors(pageVisits), [pageVisits]);
  const layout = useMemo(
    () => layoutWaterfall(session, pageVisits, timeline),
    [session, pageVisits, timeline]
  );
  const visits = useMemo(
    () => groupEventsByVisit(pageVisits, timeline, requests),
    [pageVisits, timeline, requests]
  );
  const counts = useMemo(() => {
    const byKind: Record<ActivityKind, number> = {
      request: requests.length,
      click: 0,
      error: 0,
      web_vital: 0,
    };
    for (const { kind } of timeline) {
      if (kind === 'click' || kind === 'error' || kind === 'web_vital') {
        byKind[kind] += 1;
      }
    }
    return byKind;
  }, [requests, timeline]);

  const registerVisit = useCallback((index: number, element: HTMLElement | null) => {
    if (element) {
      visitElements.current.set(index, element);
    } else {
      visitElements.current.delete(index);
    }
  }, []);

  const scrollToVisit = useCallback((index: number) => {
    visitElements.current.get(index)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <>
      <SessionSummary session={session} formatters={formatters} />
      <EuiSpacer size="l" />
      {timelineTruncated && (
        <>
          <KbnWarningCallout
            data-test-subj="digitalExperienceSessionTimelineTruncated"
            size="s"
            title={i18n.translate('xpack.digitalExperience.sessionDetail.timelineTruncatedTitle', {
              defaultMessage:
                'This session has more events than can be shown, so the timeline and journey end early.',
            })}
          />
          <EuiSpacer size="m" />
        </>
      )}
      {requestsTruncated && (
        <>
          <KbnWarningCallout
            data-test-subj="digitalExperienceSessionRequestsTruncated"
            size="s"
            title={i18n.translate('xpack.digitalExperience.sessionDetail.requestsTruncatedTitle', {
              defaultMessage:
                'This session made more requests than can be shown, so the last pages miss some of theirs. Their clicks and errors all show.',
            })}
          />
          <EuiSpacer size="m" />
        </>
      )}
      {pageVisits.length === 0 ? (
        <EuiEmptyPrompt
          data-test-subj="digitalExperienceSessionNoPageVisits"
          iconType="document"
          titleSize="xs"
          title={
            <h3>
              {i18n.translate('xpack.digitalExperience.sessionDetail.noPageVisitsTitle', {
                defaultMessage: 'No page views in this session',
              })}
            </h3>
          }
          body={
            <p>
              {i18n.translate('xpack.digitalExperience.sessionDetail.noPageVisitsDescription', {
                defaultMessage:
                  'Its events may be past their retention, or not readable with your privileges.',
              })}
            </p>
          }
        />
      ) : (
        <>
          {/* Section titles sit above their content, as the journey's cards are panels. */}
          <EuiTitle size="xs">
            <h2>
              {i18n.translate('xpack.digitalExperience.sessionDetail.timelineTitle', {
                defaultMessage: 'Timeline',
              })}
            </h2>
          </EuiTitle>
          <EuiSpacer size="m" />
          <EuiPanel hasBorder paddingSize="m">
            <SessionWaterfall
              layout={layout}
              pageVisits={pageVisits}
              colors={colors}
              onSelectVisit={scrollToVisit}
            />
          </EuiPanel>
          <EuiSpacer size="l" />
          <EuiTitle size="xs">
            <h2>
              {i18n.translate('xpack.digitalExperience.sessionDetail.journeyTitle', {
                defaultMessage: 'Page journey',
              })}
            </h2>
          </EuiTitle>
          <EuiSpacer size="s" />
          <JourneyFilters filters={filters} counts={counts} onChange={setFilters} />
          <EuiSpacer size="m" />
          <PageJourney
            visits={visits}
            colors={colors}
            filters={filters}
            formatters={formatters}
            registerVisit={registerVisit}
          />
        </>
      )}
    </>
  );
}

/** A session: its summary, a waterfall of its page visits, and what happened on each page. */
export function SessionDetailPage({
  serviceName,
  sessionId,
}: {
  serviceName: string;
  sessionId: string;
}) {
  const apiClient = useApiClient();
  const { notifications } = useKibanaServices();
  const formatters = useFormatters();
  const { query } = useDigitalExperienceParams('/{serviceName}/sessions/{sessionId}');
  const { overviewHref, sessionsHref } = useApplicationLinks(serviceName, query.source);
  const backHref = sessionsHref(pickSessionsListQuery(query));
  const [railPlacement, setRailPlacement] = usePersistedChoice(
    RAIL_STORAGE_KEY,
    RAIL_PLACEMENTS,
    'left'
  );
  const railOpen = railPlacement !== 'hidden';
  const railSide = railPlacement === 'right' ? 'right' : 'left';
  // The list takes the width of the side navigation while it shows.
  useHideSideNav(railOpen);

  // Another session opens at its top, whether the page or the panel beside the list scrolls.
  const pageRef = useRef<HTMLDivElement>(null);
  // Measured, so that the sessions list's header can line up with it.
  const [headerElement, setHeaderElement] = useState<HTMLDivElement | null>(null);
  const { height: headerHeight } = useResizeObserver(headerElement, 'height');
  const shownSessionId = useRef(sessionId);
  useEffect(() => {
    if (shownSessionId.current !== sessionId) {
      shownSessionId.current = sessionId;
      pageRef.current?.scrollIntoView?.({ block: 'start' });
    }
  }, [sessionId]);

  useRouteBreadcrumb([
    { text: serviceName, href: overviewHref },
    { text: SESSIONS_LABEL, href: backHref },
    { text: shortSessionId(sessionId) },
  ]);

  const {
    value: detail,
    loading,
    error,
    refresh,
  } = useAbortableAsync(
    ({ signal }) =>
      apiClient.fetch(
        'GET /internal/digital_experience/applications/{serviceName}/sessions/{sessionId}',
        { signal, params: { path: { serviceName, sessionId } } }
      ),
    [apiClient, serviceName, sessionId],
    { unsetValueOnError: true }
  );

  const renderContent = () => {
    if (error && isNotFound(error)) {
      return (
        <EuiEmptyPrompt
          data-test-subj="digitalExperienceSessionNotFound"
          iconType="magnify"
          title={
            <h2>
              {i18n.translate('xpack.digitalExperience.sessionDetail.notFoundTitle', {
                defaultMessage: 'Session not found',
              })}
            </h2>
          }
          body={
            <p>
              {i18n.translate('xpack.digitalExperience.sessionDetail.notFoundDescription', {
                defaultMessage:
                  'There is no session {sessionId} for {serviceName}. It may be past its retention, or not readable with your privileges.',
                values: { sessionId, serviceName },
              })}
            </p>
          }
          actions={
            <EuiButton
              data-test-subj="digitalExperienceSessionNotFoundBack"
              {...getEbtProps({
                action: DIGITAL_EXPERIENCE_EBT_ACTIONS.BACK_TO_SESSIONS,
                element: SESSIONS_EBT_ELEMENTS.SESSION_NOT_FOUND_BACK,
              })}
              href={backHref}
            >
              {BACK_TO_SESSIONS}
            </EuiButton>
          }
        />
      );
    }
    if (error) {
      return (
        <LoadErrorPrompt
          data-test-subj="digitalExperienceSessionError"
          retryDataTestSubj="digitalExperienceSessionRetry"
          retryEbtElement={SESSIONS_EBT_ELEMENTS.SESSION_RETRY}
          title={i18n.translate('xpack.digitalExperience.sessionDetail.loadErrorTitle', {
            defaultMessage: 'Could not load the session',
          })}
          error={error}
          onRetry={refresh}
        />
      );
    }
    // While the next session loads, the previous one stays, under a progress bar.
    if (!detail) {
      return loadingPrompt;
    }
    // Keyed, so that what the user expanded or filtered on one session doesn't carry to the next.
    return <SessionDetail key={detail.session.sessionId} detail={detail} formatters={formatters} />;
  };

  const copySessionId = () => {
    if (copyToClipboard(sessionId)) {
      notifications.toasts.addSuccess(ID_COPIED_LABEL);
    }
  };

  const session = detail?.session;
  const discoverTimeRange = useMemo(
    () => (session ? sessionTimeRange(session) : undefined),
    [session]
  );
  const discoverHref = useDiscoverHref(
    session ? sessionEsqlQuery(session) : undefined,
    discoverTimeRange
  );
  const copyIdItem = {
    type: 'button' as const,
    label: COPY_ID_LABEL,
    onClick: copySessionId,
    'data-test-subj': 'digitalExperienceSessionIdCopy',
  };
  // Who and when once the session loads; the header holds three items, so the ID moves to the summary.
  const metadata: AppHeaderMetadataItems = session
    ? [
        {
          type: 'text',
          label: USER_LABEL,
          value: session.user ?? ANONYMOUS_USER,
          'data-test-subj': 'digitalExperienceSessionUser',
        },
        {
          type: 'text',
          label: STARTED_LABEL,
          value: `${formatters.formatDate(session.startTime)} · ${formatSessionDuration(
            session.durationMs
          )}`,
          'data-test-subj': 'digitalExperienceSessionStarted',
        },
        copyIdItem,
      ]
    : [
        {
          type: 'text',
          label: SESSION_ID_LABEL,
          value: sessionId,
          'data-test-subj': 'digitalExperienceSessionId',
        },
        copyIdItem,
      ];

  return (
    <SessionSplitView
      railOpen={railOpen}
      railSide={railSide}
      rail={
        <SessionsRail
          serviceName={serviceName}
          sessionId={sessionId}
          source={query.source}
          side={railSide}
          onHide={() => setRailPlacement('hidden')}
          headerHeight={headerHeight || undefined}
        />
      }
    >
      <div data-test-subj="digitalExperienceSessionPage" ref={pageRef}>
        {/* The header's back is the way to the list, so there is no in-page back button, and Chrome
      Next shows a single back control. */}
        <div ref={setHeaderElement}>
          <AppHeader
            title={i18n.translate('xpack.digitalExperience.sessionDetail.title', {
              defaultMessage: 'Session',
            })}
            back={{ href: backHref, label: SESSIONS_LABEL }}
            badges={session ? sessionBadges(session) : undefined}
            metadata={metadata}
            menu={{
              items: [
                {
                  id: 'sessionsList',
                  order: 1,
                  label: SESSIONS_LIST_LABEL,
                  iconType: railSide === 'right' ? 'transitionRightIn' : 'transitionLeftIn',
                  isSelected: railOpen,
                  testId: 'digitalExperienceSessionsListToggle',
                  popoverTestId: 'digitalExperienceSessionsListPlacement',
                  // Where the list shows, or that it doesn't.
                  items: RAIL_PLACEMENT_OPTIONS.map(({ placement, label, iconType }, index) => ({
                    id: `sessionsList-${placement}`,
                    order: index + 1,
                    label,
                    iconType,
                    isSelected: railPlacement === placement,
                    run: () => setRailPlacement(placement),
                    testId: `digitalExperienceSessionsListPlacement-${placement}`,
                    ebt: {
                      action: DIGITAL_EXPERIENCE_EBT_ACTIONS.TOGGLE_SESSIONS_LIST,
                      detail: placement,
                    },
                  })),
                },
                ...(discoverHref
                  ? [
                      {
                        id: 'openInDiscover',
                        order: 2,
                        label: OPEN_IN_DISCOVER_LABEL,
                        iconType: 'discoverApp',
                        href: discoverHref,
                        testId: 'digitalExperienceSessionOpenInDiscover',
                        ebt: { action: DIGITAL_EXPERIENCE_EBT_ACTIONS.OPEN_IN_DISCOVER },
                      },
                    ]
                  : []),
              ],
            }}
          />
        </div>
        {/* The app shell is unpadded, so the header spans the page; the content pads itself. */}
        <div css={{ position: 'relative' }}>
          {loading && detail && (
            <EuiProgress
              size="xs"
              color="accent"
              position="absolute"
              data-test-subj="digitalExperienceSessionLoadingNext"
            />
          )}
        </div>
        <EuiPageSection paddingSize="m" restrictWidth={false}>
          {renderContent()}
        </EuiPageSection>
      </div>
    </SessionSplitView>
  );
}
