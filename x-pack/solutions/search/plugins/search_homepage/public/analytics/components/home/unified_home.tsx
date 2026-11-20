/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../hooks/use_kibana';
import { useAnalyticsClusterState } from '../../hooks/use_analytics_cluster_state';
import { useChromeHidden } from '../../hooks/use_chrome_hidden';
import { useAnalyticsLinks } from '../../hooks/use_analytics_links';
import { useAnalyticsPreferences } from '../../hooks/use_analytics_preferences';
import { useSampleData } from '../../hooks/use_sample_data';
import { getLargestOwnSource, resolveJourney, toEventsState } from '../../journey';
import type { AnalyticsStage, ResolvedJourney } from '../../types';
import { AnalyticsPageTemplate } from '../analytics_page_template';
import { LazyAnalyticsHome, LazyNoDataView, LazySearchHome } from '../lazy_views';
import { getDetectedTitle } from '../shared/event_status';
import { ErrorView } from './error_view';
import { LoadingView } from './loading_view';

type HomeView = 'gate' | ResolvedJourney;

const isUnfocused = (): boolean =>
  document.activeElement === null || document.activeElement === document.body;

/**
 * The Elasticsearch home. What it shows comes from the cluster: the ingest gate while it holds no
 * data, then the analytics home for event data or the search home for search content.
 */
export const UnifiedHomePage = (): React.JSX.Element => {
  const { notifications } = useKibana().services;
  const links = useAnalyticsLinks();
  const sampleData = useSampleData();
  const { state, isError, isFetching, refetch } = useAnalyticsClusterState({ poll: true });
  const { preferredJourney, setPreferredJourney } = useAnalyticsPreferences();

  const resolution = state === undefined ? undefined : resolveJourney(state, preferredJourney);
  const stage = state?.stage;
  // A first request that failed has no gate to keep the user at.
  useChromeHidden(stage === undefined ? (isError ? false : undefined) : stage === 'noData');
  let view: HomeView | undefined;
  if (state !== undefined) {
    view = resolution === undefined || stage === 'noData' ? 'gate' : resolution.journey;
  }
  const eventsState = useMemo(
    () => (state === undefined ? undefined : toEventsState(state)),
    [state]
  );
  const detectedSourceName =
    state === undefined ? undefined : getLargestOwnSource(state.sources)?.name;

  const headingElement = useRef<HTMLHeadingElement | null>(null);
  const isHeadingFocusPending = useRef(false);
  // A view that is still loading gets the focus when its heading mounts.
  const headingRef = useCallback((heading: HTMLHeadingElement | null): void => {
    headingElement.current = heading;
    if (heading !== null && isHeadingFocusPending.current) {
      isHeadingFocusPending.current = false;
      if (isUnfocused()) {
        heading.focus();
      }
    }
  }, []);

  const previous = useRef<{ view: HomeView; stage: AnalyticsStage }>();
  const [hasJustArrived, setHasJustArrived] = useState(false);
  useEffect(() => {
    if (view === undefined || stage === undefined) {
      return;
    }
    const last = previous.current;
    previous.current = { view, stage };
    if (last === undefined || (last.view === view && last.stage === stage)) {
      return;
    }
    const hasArrived = last.view === 'gate' && view !== 'gate';
    setHasJustArrived(hasArrived && view === 'analytics');
    // The shared search home has no place for a callout, so its arrival is a toast.
    if (hasArrived && view === 'search') {
      notifications.toasts.addSuccess({
        title: getDetectedTitle('data', detectedSourceName),
        'data-test-subj': 'analyticsHomeSearchDataDetected',
      });
    }
    // Focus is only taken when the replaced view held it, never from an overlay or another control.
    if (!isUnfocused()) {
      return;
    }
    // A heading that is hidden while its view loads does not take the focus; the next one will.
    const heading = headingElement.current;
    heading?.focus();
    isHeadingFocusPending.current = view !== 'search' && document.activeElement !== heading;
  }, [view, stage, detectedSourceName, notifications]);

  const onDismissArrival = useCallback((): void => setHasJustArrived(false), []);

  const breadcrumb = i18n.translate('xpack.searchHomepage.analytics.home.breadcrumb', {
    defaultMessage: 'Home',
  });
  const loadingPage = (
    <AnalyticsPageTemplate breadcrumb={breadcrumb} data-test-subj="unifiedHomePage">
      <LoadingView />
    </AnalyticsPageTemplate>
  );

  if (view === 'search') {
    return (
      <Suspense fallback={loadingPage}>
        <LazySearchHome
          links={links}
          alternativeJourney={resolution?.alternative}
          onSwitchJourney={setPreferredJourney}
        />
      </Suspense>
    );
  }

  const renderView = (): React.JSX.Element => {
    if (state === undefined || eventsState === undefined || view === undefined) {
      return isError ? (
        <ErrorView
          headingRef={headingRef}
          links={links}
          isRetrying={isFetching}
          onRetry={refetch}
        />
      ) : (
        <LoadingView />
      );
    }
    if (view === 'gate') {
      return (
        <LazyNoDataView
          headingRef={headingRef}
          links={links}
          sampleData={sampleData}
          onSampleInstalled={refetch}
        />
      );
    }
    return (
      <LazyAnalyticsHome
        headingRef={headingRef}
        state={eventsState}
        links={links}
        sampleData={sampleData}
        hasJustArrived={hasJustArrived}
        onDismissArrival={onDismissArrival}
        alternativeJourney={resolution?.alternative}
        onSwitchJourney={setPreferredJourney}
      />
    );
  };

  return (
    <AnalyticsPageTemplate breadcrumb={breadcrumb} data-test-subj="unifiedHomePage">
      <Suspense fallback={<LoadingView />}>{renderView()}</Suspense>
    </AnalyticsPageTemplate>
  );
};
