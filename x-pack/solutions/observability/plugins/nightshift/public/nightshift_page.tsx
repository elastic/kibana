/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { EuiPageTemplate } from '@elastic/eui';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import { i18n } from '@kbn/i18n';
import {
  NIGHTSHIFT_APP_ID,
  OBSERVABILITY_OVERVIEW_APP_ID,
  SIGNIFICANT_EVENTS_APP_ID,
} from '@kbn/deeplinks-observability';
import { Route, Routes } from '@kbn/shared-ux-router';
import { useLocation } from 'react-router-dom';
import { NIGHTSHIFT_APP_ROUTE } from '../common/constants';
import { NightshiftApp } from './app/app';
import { NightshiftAppHeader } from './app/app_header';
import { useKibana } from './hooks/use_kibana';
import { useSignificantEventsAvailability } from './hooks/use_significant_events_availability';

function NightshiftLanding(): React.ReactElement {
  return (
    <EuiPageTemplate.Section component="div" color="subdued" restrictWidth="900px">
      <NightshiftApp />
    </EuiPageTemplate.Section>
  );
}

function NightshiftMemoryPage({
  MemoryPage,
}: {
  MemoryPage: React.ComponentType;
}): React.ReactElement {
  return (
    <EuiPageTemplate.Section
      component="div"
      color="subdued"
      restrictWidth={false}
      data-test-subj="nightshiftMemoryPage"
    >
      <MemoryPage />
    </EuiPageTemplate.Section>
  );
}

export function NightshiftPage(): React.ReactElement | null {
  const {
    application,
    http: { basePath },
    serverless,
    observabilityShared,
    significantEventsApp,
    agentBuilder,
  } = useKibana().services;
  const { PageTemplate: ObservabilityPageTemplate } = observabilityShared.navigation;
  const { pathname } = useLocation();
  const isMemoryRoute = pathname === '/memory' || pathname.startsWith('/memory/');

  const significantEventsHref = application.getUrlForApp(SIGNIFICANT_EVENTS_APP_ID, {
    path: '/knowledge_indicators',
  });
  const nightshiftHref = application.getUrlForApp(NIGHTSHIFT_APP_ID);
  const memoryHref = application.getUrlForApp(NIGHTSHIFT_APP_ID, {
    path: '/memory',
  });
  const navigateToSignificantEvents = useCallback(
    () => application.navigateToUrl(significantEventsHref),
    [application, significantEventsHref]
  );
  const navigateToMemory = useCallback(
    () => application.navigateToUrl(memoryHref),
    [application, memoryHref]
  );
  const handleOpenAgenticOnboarding = useCallback(() => {
    agentBuilder?.openChat({
      newConversation: true,
      initialMessage: i18n.translate('xpack.nightshift.onboardingInitialMessage', {
        defaultMessage:
          'Start the significant-events-onboarding skill. First check whether there is already memory about my system. If there is, summarise what you know and ask whether I have something specific to add or correct, or whether I want a general review of the gaps. If memory is empty, go straight into gathering information.',
      }),
      autoSendInitialMessage: true,
    });
  }, [agentBuilder]);

  const MemoryPage = useMemo(() => significantEventsApp.getMemoryPage(), [significantEventsApp]);

  const { isAvailable, isLoading: isAvailabilityLoading } = useSignificantEventsAvailability();

  useBreadcrumbs(
    [
      {
        href: basePath.prepend(NIGHTSHIFT_APP_ROUTE),
        text: i18n.translate('xpack.nightshift.breadcrumbs.linkText', {
          defaultMessage: 'Nightshift',
        }),
        deepLinkId: NIGHTSHIFT_APP_ID,
      },
      ...(isMemoryRoute
        ? [
            {
              text: i18n.translate('xpack.nightshift.memoryBreadcrumb', {
                defaultMessage: 'Memory',
              }),
            },
          ]
        : []),
    ],
    { serverless }
  );

  useEffect(() => {
    if (!isAvailabilityLoading && !isAvailable) {
      application.navigateToApp(OBSERVABILITY_OVERVIEW_APP_ID);
    }
  }, [application, isAvailable, isAvailabilityLoading]);

  if (!isAvailable) {
    return null;
  }

  return (
    <ObservabilityPageTemplate
      data-test-subj="nightshiftPage"
      restrictWidth={false}
      pageSectionProps={{
        color: 'subdued',
        paddingSize: 'none',
      }}
    >
      <NightshiftAppHeader
        onSignificantEventsClick={navigateToSignificantEvents}
        significantEventsHref={significantEventsHref}
        onMemoryClick={navigateToMemory}
        memoryHref={memoryHref}
        onAgenticOnboardingClick={
          isMemoryRoute && agentBuilder ? handleOpenAgenticOnboarding : undefined
        }
        title={
          isMemoryRoute
            ? i18n.translate('xpack.nightshift.memoryPageTitle', {
                defaultMessage: 'Memory',
              })
            : undefined
        }
        back={
          isMemoryRoute
            ? {
                href: nightshiftHref,
                label: i18n.translate('xpack.nightshift.pageTitle', {
                  defaultMessage: 'Nightshift',
                }),
              }
            : undefined
        }
      />
      <Routes>
        <Route path="/memory">
          <NightshiftMemoryPage MemoryPage={MemoryPage} />
        </Route>
        <Route path="/">
          <NightshiftLanding />
        </Route>
      </Routes>
    </ObservabilityPageTemplate>
  );
}
