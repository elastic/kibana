/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiButton,
  EuiCode,
  EuiCopy,
  EuiButtonIcon,
  EuiEmptyPrompt,
  EuiLoadingLogo,
  EuiPageHeader,
  EuiPageSection,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import type { IHttpFetchError } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { getEbtProps } from '@kbn/ebt-click';
import { useAbortableAsync } from '@kbn/react-hooks';
import { KbnWarningCallout } from '@kbn/ui-callout';
import type { SessionDetailResponse } from '../../../common/sessions';
import { useRouteBreadcrumb } from '../../breadcrumbs/use_route_breadcrumb';
import { LoadErrorPrompt } from '../../components/load_error_prompt';
import { DIGITAL_EXPERIENCE_EBT_ACTIONS, SESSIONS_EBT_ELEMENTS } from '../../ebt_constants';
import { useApiClient } from '../../hooks/use_api_client';
import { useApplicationLinks } from '../../hooks/use_application_links';
import { useDigitalExperienceParams } from '../../hooks/use_digital_experience_params';
import { useFormatters } from '../../hooks/use_formatters';
import { SESSIONS_LABEL } from '../../labels';
import { pickSessionsListQuery } from '../sessions/hooks/use_sessions_list_query';
import { SessionSummary } from './components/session_summary';
import { SessionWaterfall, pageColors } from './components/session_waterfall';
import { layoutWaterfall } from './utils/session_timeline';

/** Characters of the session ID shown in the breadcrumb; the header has it in full. */
const SHORT_ID_LENGTH = 8;

const BACK_TO_SESSIONS = i18n.translate(
  'xpack.digitalExperience.sessionDetail.backToSessionsButtonLabel',
  { defaultMessage: 'Back to sessions' }
);

const COPY_ID_LABEL = i18n.translate('xpack.digitalExperience.sessionDetail.copyIdAriaLabel', {
  defaultMessage: 'Copy session ID',
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
  const { session, pageVisits, timeline, timelineTruncated } = detail;
  const colors = useMemo(() => pageColors(pageVisits), [pageVisits]);
  const layout = useMemo(
    () => layoutWaterfall(session, pageVisits, timeline),
    [session, pageVisits, timeline]
  );

  return (
    <>
      <SessionSummary session={session} formatters={formatters} />
      <EuiSpacer size="m" />
      {timelineTruncated && (
        <>
          <KbnWarningCallout
            data-test-subj="digitalExperienceSessionTimelineTruncated"
            size="s"
            title={i18n.translate('xpack.digitalExperience.sessionDetail.timelineTruncatedTitle', {
              defaultMessage:
                'This session has more events than can be shown, so the timeline ends early.',
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
          <EuiPanel hasBorder paddingSize="m">
            <EuiTitle size="xs">
              <h2>
                {i18n.translate('xpack.digitalExperience.sessionDetail.timelineTitle', {
                  defaultMessage: 'Timeline',
                })}
              </h2>
            </EuiTitle>
            <EuiSpacer size="s" />
            <SessionWaterfall layout={layout} pageVisits={pageVisits} colors={colors} />
          </EuiPanel>
        </>
      )}
    </>
  );
}

/** A session: its summary and a waterfall of its page visits. */
export function SessionDetailPage({
  serviceName,
  sessionId,
}: {
  serviceName: string;
  sessionId: string;
}) {
  const apiClient = useApiClient();
  const formatters = useFormatters();
  const { query } = useDigitalExperienceParams('/{serviceName}/sessions/{sessionId}');
  const { overviewHref, sessionsHref } = useApplicationLinks(serviceName, query.source);
  const backHref = sessionsHref(pickSessionsListQuery(query));

  useRouteBreadcrumb([
    { text: serviceName, href: overviewHref },
    { text: SESSIONS_LABEL, href: backHref },
    { text: sessionId.slice(0, SHORT_ID_LENGTH) },
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
    if (loading || !detail) {
      return loadingPrompt;
    }
    return <SessionDetail detail={detail} formatters={formatters} />;
  };

  return (
    // The app shell is unpadded since each page pads its own content (see `render_app.tsx`).
    <EuiPageSection
      paddingSize="m"
      restrictWidth={false}
      data-test-subj="digitalExperienceSessionPage"
    >
      <EuiPageHeader
        pageTitle={i18n.translate('xpack.digitalExperience.sessionDetail.title', {
          defaultMessage: 'Session',
        })}
        // The header renders the description in a paragraph, so only inline elements go here.
        description={
          <>
            <EuiCode data-test-subj="digitalExperienceSessionId">{sessionId}</EuiCode>{' '}
            <EuiCopy textToCopy={sessionId}>
              {(copy) => (
                <EuiToolTip content={COPY_ID_LABEL} disableScreenReaderOutput>
                  <EuiButtonIcon
                    data-test-subj="digitalExperienceSessionIdCopy"
                    {...getEbtProps({
                      action: DIGITAL_EXPERIENCE_EBT_ACTIONS.COPY_SESSION_ID,
                      element: SESSIONS_EBT_ELEMENTS.SESSION_ID_COPY,
                    })}
                    iconType="copy"
                    size="xs"
                    aria-label={COPY_ID_LABEL}
                    onClick={copy}
                  />
                </EuiToolTip>
              )}
            </EuiCopy>
          </>
        }
        rightSideItems={[
          <EuiButton
            key="back"
            data-test-subj="digitalExperienceSessionBack"
            {...getEbtProps({
              action: DIGITAL_EXPERIENCE_EBT_ACTIONS.BACK_TO_SESSIONS,
              element: SESSIONS_EBT_ELEMENTS.SESSION_BACK,
            })}
            iconType="chevronSingleLeft"
            href={backHref}
          >
            {BACK_TO_SESSIONS}
          </EuiButton>,
        ]}
        bottomBorder
      />
      <EuiSpacer size="m" />
      {renderContent()}
    </EuiPageSection>
  );
}
